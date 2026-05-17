import {
  computed,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  ApiClient,
  type AuthUser,
  type ArtisanProfile,
} from '@artisangh/web-api-client';
import { API_CLIENT } from './api.token';

const ACCESS_TOKEN_KEY = 'artisangh:accessToken';

interface AuthState {
  accessToken: string | null;
  user: (AuthUser & { artisanProfile?: ArtisanProfile | null }) | null;
  status: 'idle' | 'loading' | 'authed' | 'error';
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject<ApiClient>(API_CLIENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly state = signal<AuthState>({
    accessToken: this.isBrowser ? safeRead(ACCESS_TOKEN_KEY) : null,
    user: null,
    status: 'idle',
  });

  readonly accessToken = computed(() => this.state().accessToken);
  readonly user = computed(() => this.state().user);
  readonly isAuthed = computed(() => !!this.state().accessToken);
  readonly status = computed(() => this.state().status);

  constructor() {
    effect(() => {
      const token = this.state().accessToken;
      if (!this.isBrowser) return;
      try {
        if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
        else localStorage.removeItem(ACCESS_TOKEN_KEY);
      } catch {
        /* private mode, ignore */
      }
    });

    // Hydrate user on cold start if we already have a token.
    if (this.isBrowser && this.state().accessToken && !this.state().user) {
      this.hydrate();
    }
  }

  async requestOtp(phone: string): Promise<void> {
    this.state.update((s) => ({ ...s, status: 'loading' }));
    try {
      await this.api.requestOtp(phone);
      this.state.update((s) => ({ ...s, status: 'idle' }));
    } catch (err) {
      this.state.update((s) => ({ ...s, status: 'error' }));
      throw err;
    }
  }

  async verifyOtp(input: {
    phone: string;
    code: string;
    fullName?: string;
    role?: 'CUSTOMER' | 'ARTISAN';
  }): Promise<void> {
    this.state.update((s) => ({ ...s, status: 'loading' }));
    try {
      const res = await this.api.verifyOtp(input);
      this.state.set({
        accessToken: res.accessToken,
        user: res.user,
        status: 'authed',
      });
      // pull full profile (includes artisanProfile if any)
      await this.hydrate();
    } catch (err) {
      this.state.update((s) => ({ ...s, status: 'error' }));
      throw err;
    }
  }

  async hydrate(): Promise<void> {
    try {
      const user = await this.api.me();
      this.state.update((s) => ({ ...s, user, status: 'authed' }));
    } catch {
      this.signOut();
    }
  }

  async refresh(): Promise<string | null> {
    try {
      const { accessToken } = await this.api.refresh();
      this.state.update((s) => ({ ...s, accessToken }));
      return accessToken;
    } catch {
      this.signOut();
      return null;
    }
  }

  signOut(): void {
    this.api.logout().catch(() => undefined);
    this.state.set({ accessToken: null, user: null, status: 'idle' });
  }
}

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
