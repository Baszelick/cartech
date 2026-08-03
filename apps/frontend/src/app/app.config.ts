import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import {routes} from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor, AuthService } from '@cartech/auth/data-access';
import { firstValueFrom } from 'rxjs';

export function initializeAuthSession(): Promise<void> {
  return firstValueFrom(inject(AuthService).initializeSession());
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor]),
    ),
    provideAppInitializer(initializeAuthSession),
  ],
};
