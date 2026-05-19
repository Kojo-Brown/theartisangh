import { InjectionToken } from '@angular/core';
import type { ApiClient } from '@artisangh/web-api-client';

export const API_CLIENT = new InjectionToken<ApiClient>('API_CLIENT');
