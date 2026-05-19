import { computed, inject, Injectable, signal } from '@angular/core';
import type { ApiClient, AuthUser } from '@artisangh/web-api-client';
import { API_CLIENT } from './api.token';
import { TokenStore } from './token.store';

interface State {
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'authed' | 'error' | 'forbidden';
}

@Injectable({ providedIn: 'root' })
export class AdminAuthStore {
  private readonly api = inject<ApiClient>(API_CLIENT);
  private readonly tokens = inject(TokenStore);

  private readonly state = signal<State>({
    user: null,
    status: 'idle',
  });

  readonly accessToken = computed(() => this.tokens.get());
  readonly user = computed(() => this.state().user);
  readonly isAuthed = computed(
    () => !!this.state().user && this.state().user?.role === 'ADMIN',
  );
  readonly status = computed(() => this.state().status);

  constructor() {
    if (this.tokens.get() && !this.state().user) {
      this.hydrate();
    }
  }

  async requestOtp(phone: string): Promise<void> {
    await this.api.requestOtp(phone);
  }

  async verifyOtp(phone: string, code: string): Promise<void> {
    const res = await this.api.verifyOtp({ phone, code });
    if (res.user.role !== 'ADMIN') {
      this.state.set({ user: null, status: 'forbidden' });
      throw new Error('Not an admin account');
    }
    // Set token BEFORE the next request goes out.
    this.tokens.set(res.accessToken);
    this.state.set({ user: res.user, status: 'authed' });
  }

  async hydrate(): Promise<void> {
    try {
      const user = (await this.api.me()) as AuthUser;
      if (user.role !== 'ADMIN') {
        this.signOut();
        this.state.update((s) => ({ ...s, status: 'forbidden' }));
        return;
      }
      this.state.update((s) => ({ ...s, user, status: 'authed' }));
    } catch {
      this.signOut();
    }
  }

  signOut(): void {
    if (this.tokens.get()) {
      this.api.logout().catch(() => undefined);
    }
    this.tokens.clear();
    this.state.set({ user: null, status: 'idle' });
  }
}
