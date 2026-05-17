import { describe, expect, it } from 'vitest';
import { GhanaPhone, BookingStatus, Money } from './shared-types.js';

describe('shared-types', () => {
  it('accepts a valid Ghana phone', () => {
    expect(() => GhanaPhone.parse('+233241234567')).not.toThrow();
  });

  it('rejects a malformed phone', () => {
    expect(() => GhanaPhone.parse('0241234567')).toThrow();
  });

  it('parses booking statuses', () => {
    expect(BookingStatus.parse('REQUESTED')).toBe('REQUESTED');
  });

  it('defaults currency to GHS', () => {
    expect(Money.parse({ amount: 100 }).currency).toBe('GHS');
  });
});
