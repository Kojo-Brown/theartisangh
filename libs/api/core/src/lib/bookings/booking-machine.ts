import { setup, createActor, type AnyActorRef } from 'xstate';

/**
 * Booking lifecycle state machine.
 *
 * Happy path: REQUESTED → ACCEPTED → EN_ROUTE → ON_SITE → IN_PROGRESS →
 *             COMPLETED → (customer confirms) → RELEASED.
 *
 * Side paths:
 *  - DECLINE / CANCEL at any point before IN_PROGRESS → CANCELLED.
 *  - DISPUTE from either party at IN_PROGRESS or COMPLETED → DISPUTED.
 *  - Admin resolves a dispute back to RELEASED or REFUNDED.
 *
 * Guards (role-aware) are declared but evaluated by the caller — the API
 * controller passes `actor` ('customer' | 'artisan' | 'admin'). The machine is
 * pure: it does not touch the DB. Each transition emits a domain event that
 * the BookingService persists.
 */

export type BookingState =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ON_SITE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'RELEASED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'REFUNDED';

export type BookingActor = 'customer' | 'artisan' | 'admin';

export type BookingEvent =
  | { type: 'ACCEPT'; actor: BookingActor }
  | { type: 'DECLINE'; actor: BookingActor }
  | { type: 'CANCEL'; actor: BookingActor }
  | { type: 'EN_ROUTE'; actor: BookingActor }
  | { type: 'ARRIVE'; actor: BookingActor }
  | { type: 'START_WORK'; actor: BookingActor }
  | { type: 'COMPLETE'; actor: BookingActor }
  | { type: 'CONFIRM'; actor: BookingActor }
  | { type: 'DISPUTE'; actor: BookingActor }
  | { type: 'RESOLVE_RELEASE'; actor: BookingActor }
  | { type: 'RESOLVE_REFUND'; actor: BookingActor };

interface BookingContext {
  paymentHeld: boolean;
}

export const bookingMachine = setup({
  types: {
    context: {} as BookingContext,
    events: {} as BookingEvent,
  },
  guards: {
    isArtisan: ({ event }) => event.actor === 'artisan',
    isCustomer: ({ event }) => event.actor === 'customer',
    isAdmin: ({ event }) => event.actor === 'admin',
    isCustomerOrAdmin: ({ event }) =>
      event.actor === 'customer' || event.actor === 'admin',
    isPaymentHeld: ({ context }) => context.paymentHeld,
  },
}).createMachine({
  id: 'booking',
  initial: 'REQUESTED',
  context: { paymentHeld: false },
  states: {
    REQUESTED: {
      on: {
        ACCEPT: { target: 'ACCEPTED', guard: 'isArtisan' },
        DECLINE: { target: 'CANCELLED', guard: 'isArtisan' },
        CANCEL: { target: 'CANCELLED', guard: 'isCustomerOrAdmin' },
      },
    },
    ACCEPTED: {
      on: {
        EN_ROUTE: { target: 'EN_ROUTE', guard: 'isArtisan' },
        CANCEL: { target: 'CANCELLED', guard: 'isCustomerOrAdmin' },
      },
    },
    EN_ROUTE: {
      on: {
        ARRIVE: { target: 'ON_SITE', guard: 'isArtisan' },
        CANCEL: { target: 'CANCELLED', guard: 'isCustomerOrAdmin' },
      },
    },
    ON_SITE: {
      on: {
        START_WORK: { target: 'IN_PROGRESS', guard: 'isArtisan' },
        CANCEL: { target: 'CANCELLED', guard: 'isCustomerOrAdmin' },
      },
    },
    IN_PROGRESS: {
      on: {
        COMPLETE: { target: 'COMPLETED', guard: 'isArtisan' },
        DISPUTE: { target: 'DISPUTED' },
      },
    },
    COMPLETED: {
      on: {
        CONFIRM: { target: 'RELEASED', guard: 'isCustomerOrAdmin' },
        DISPUTE: { target: 'DISPUTED' },
      },
    },
    DISPUTED: {
      on: {
        RESOLVE_RELEASE: { target: 'RELEASED', guard: 'isAdmin' },
        RESOLVE_REFUND: { target: 'REFUNDED', guard: 'isAdmin' },
      },
    },
    RELEASED: { type: 'final' },
    CANCELLED: { type: 'final' },
    REFUNDED: { type: 'final' },
  },
});

/** Helper: given the current persisted state + event, return the next state. */
export function transition(
  current: BookingState,
  event: BookingEvent,
  context: BookingContext = { paymentHeld: true },
):
  | { ok: true; next: BookingState; final: boolean }
  | { ok: false; reason: string } {
  const actor = createActor(bookingMachine, {
    snapshot: bookingMachine.resolveState({ value: current, context }),
  }) as AnyActorRef;
  actor.start();
  try {
    actor.send(event);
    const snap = actor.getSnapshot();
    const next = snap.value as BookingState;
    if (next === current) {
      return {
        ok: false,
        reason: `Transition ${event.type} not allowed from ${current}`,
      };
    }
    return { ok: true, next, final: snap.status === 'done' };
  } finally {
    actor.stop();
  }
}
