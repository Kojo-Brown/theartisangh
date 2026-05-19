import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { ApiClient } from '@artisangh/web-api-client';
import { appRoutes } from './app.routes';
import { API_CLIENT } from './core/api.token';
import { AdminAuthStore } from './core/admin-auth.store';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    {
      provide: API_CLIENT,
      useFactory: () => {
        let store: AdminAuthStore | undefined;
        const client: ApiClient = new ApiClient({
          baseUrl: environment.apiBaseUrl,
          getAccessToken: () => store?.accessToken() ?? null,
          onUnauthorized: () => Promise.resolve(null),
        });
        queueMicrotask(() => {
          try {
            store = inject(AdminAuthStore, { optional: true }) ?? undefined;
          } catch {
            /* SSR */
          }
        });
        return client;
      },
    },
    provideAppInitializer(() => {
      const store = inject(AdminAuthStore);
      if (store.accessToken()) store.hydrate();
    }),
  ],
};
