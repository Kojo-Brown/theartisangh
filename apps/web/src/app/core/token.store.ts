import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const KEY = 'artisangh:accessToken';

/**
 * Tiny token holder that breaks the AuthStore ↔ ApiClient dependency cycle.
 * Backed by a signal so any computed() that reads `get()` re-evaluates when
 * the token changes — without that, the auth guard sees a stale value
 * immediately after login. localStorage-backed; SSR-safe.
 */
@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly token = signal<string | null>(
    this.isBrowser ? this.safeRead() : null,
  );

  /** Reactive read — touching this inside a computed/effect tracks changes. */
  get(): string | null {
    return this.token();
  }

  set(token: string | null): void {
    this.token.set(token);
    if (!this.isBrowser) return;
    try {
      if (token) localStorage.setItem(KEY, token);
      else localStorage.removeItem(KEY);
    } catch {
      /* private mode, ignore */
    }
  }

  clear(): void {
    this.set(null);
  }

  private safeRead(): string | null {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
}
