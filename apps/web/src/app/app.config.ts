import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { ApiClient } from '@artisangh/web-api-client';
import { appRoutes } from './app.routes';
import { API_CLIENT } from './core/api.token';
import { AuthStore } from './core/auth.store';
import { TokenStore } from './core/token.store';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),

    // ApiClient + AuthStore both depend on TokenStore, never on each other.
    {
      provide: API_CLIENT,
      useFactory: () => {
        const tokens = inject(TokenStore);
        return new ApiClient({
          baseUrl: environment.apiBaseUrl,
          getAccessToken: () => tokens.get(),
          onUnauthorized: async () => {
            // 401 → try to rotate the refresh token. Done directly via fetch to
            // avoid pulling AuthStore in here (would form a cycle again).
            try {
              const res = await fetch(
                `${environment.apiBaseUrl}/api/auth/refresh`,
                {
                  method: 'POST',
                  credentials: 'include',
                },
              );
              if (!res.ok) return null;
              const data = (await res.json()) as { accessToken?: string };
              if (data.accessToken) {
                tokens.set(data.accessToken);
                return data.accessToken;
              }
              return null;
            } catch {
              return null;
            }
          },
        });
      },
    },

    // After bootstrap, if there's a token in localStorage, hydrate the user.
    provideAppInitializer(() => {
      const store = inject(AuthStore);
      if (store.accessToken()) store.hydrate();
    }),
  ],
};
