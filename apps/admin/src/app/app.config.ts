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
import { TokenStore } from './core/token.store';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    {
      provide: API_CLIENT,
      useFactory: () => {
        const tokens = inject(TokenStore);
        return new ApiClient({
          baseUrl: environment.apiBaseUrl,
          getAccessToken: () => tokens.get(),
          onUnauthorized: () => Promise.resolve(null),
        });
      },
    },
    provideAppInitializer(() => {
      const store = inject(AdminAuthStore);
      if (store.accessToken()) store.hydrate();
    }),
  ],
};
