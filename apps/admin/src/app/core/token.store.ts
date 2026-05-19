import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const KEY = 'artisangh-admin:accessToken';

@Injectable({ providedIn: 'root' })
export class TokenStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private token: string | null = this.isBrowser ? this.safeRead() : null;

  get(): string | null {
    return this.token;
  }

  set(token: string | null): void {
    this.token = token;
    if (!this.isBrowser) return;
    try {
      if (token) localStorage.setItem(KEY, token);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
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
