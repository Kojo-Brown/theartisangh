import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
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
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),

    // ApiClient depends on AuthStore for the bearer token, but AuthStore depends
    // on ApiClient — break the cycle by lazily reading the store after creation.
    {
      provide: API_CLIENT,
      useFactory: () => {
        let store: AuthStore | undefined;
        const client: ApiClient = new ApiClient({
          baseUrl: environment.apiBaseUrl,
          getAccessToken: () => store?.accessToken() ?? null,
          onUnauthorized: () => store?.refresh() ?? Promise.resolve(null),
        });
        // attach store after Angular has constructed AuthStore (lazy)
        queueMicrotask(() => {
          try {
            store = inject(AuthStore, { optional: true }) ?? undefined;
          } catch {
            /* SSR */
          }
        });
        return client;
      },
    },

    // After bootstrap, if there's a token in localStorage, hydrate the user.
    provideAppInitializer(() => {
      const store = inject(AuthStore);
      if (store.accessToken()) store.hydrate();
    }),
  ],
};
