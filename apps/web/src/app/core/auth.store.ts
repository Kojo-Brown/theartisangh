import { computed, inject, Injectable, signal } from '@angular/core';
import {
  ApiClient,
  type AuthUser,
  type ArtisanProfile,
} from '@artisangh/web-api-client';
import { API_CLIENT } from './api.token';
import { TokenStore } from './token.store';

interface AuthState {
  user: (AuthUser & { artisanProfile?: ArtisanProfile | null }) | null;
  status: 'idle' | 'loading' | 'authed' | 'error';
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject<ApiClient>(API_CLIENT);
  private readonly tokens = inject(TokenStore);

  private readonly state = signal<AuthState>({
    user: null,
    status: 'idle',
  });

  readonly accessToken = computed(() => this.tokens.get());
  readonly user = computed(() => this.state().user);
  readonly isAuthed = computed(() => this.tokens.get() !== null);
  readonly status = computed(() => this.state().status);

  constructor() {
    // Hydrate user on cold start if we already have a token.
    if (this.tokens.get() && !this.state().user) {
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
      // Persist the token BEFORE the next request goes out.
      this.tokens.set(res.accessToken);
      this.state.set({ user: res.user, status: 'authed' });
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
      this.tokens.set(accessToken);
      return accessToken;
    } catch {
      this.signOut();
      return null;
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
