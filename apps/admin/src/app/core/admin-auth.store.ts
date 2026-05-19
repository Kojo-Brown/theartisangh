import {
  computed,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { ApiClient, AuthUser } from '@artisangh/web-api-client';
import { API_CLIENT } from './api.token';

const ACCESS_TOKEN_KEY = 'artisangh-admin:accessToken';

interface State {
  accessToken: string | null;
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'authed' | 'error' | 'forbidden';
}

@Injectable({ providedIn: 'root' })
export class AdminAuthStore {
  private readonly api = inject<ApiClient>(API_CLIENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly state = signal<State>({
    accessToken: this.isBrowser ? safeRead(ACCESS_TOKEN_KEY) : null,
    user: null,
    status: 'idle',
  });

  readonly accessToken = computed(() => this.state().accessToken);
  readonly user = computed(() => this.state().user);
  readonly isAuthed = computed(
    () => !!this.state().user && this.state().user?.role === 'ADMIN',
  );
  readonly status = computed(() => this.state().status);

  constructor() {
    if (this.isBrowser && this.state().accessToken && !this.state().user) {
      this.hydrate();
    }
  }

  async requestOtp(phone: string): Promise<void> {
    await this.api.requestOtp(phone);
  }

  async verifyOtp(phone: string, code: string): Promise<void> {
    const res = await this.api.verifyOtp({ phone, code });
    if (res.user.role !== 'ADMIN') {
      this.state.set({ accessToken: null, user: null, status: 'forbidden' });
      throw new Error('Not an admin account');
    }
    this.persist(res.accessToken);
    this.state.set({
      accessToken: res.accessToken,
      user: res.user,
      status: 'authed',
    });
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
    this.api.logout().catch(() => undefined);
    this.persist(null);
    this.state.set({ accessToken: null, user: null, status: 'idle' });
  }

  private persist(token: string | null): void {
    if (!this.isBrowser) return;
    try {
      if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
      else localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }
}

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
