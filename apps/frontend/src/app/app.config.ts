import {ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideHttpClient, withInterceptors} from "@angular/common/http";
import {authInterceptor, AuthService} from '@cartech/frontend/auth/data-access';
import {firstValueFrom} from 'rxjs';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection({eventCoalescing: true}),
        provideRouter(routes),
        provideHttpClient(
          withInterceptors([authInterceptor]),
        ),
        provideAppInitializer(() => {
          const authService = inject(AuthService);
          return firstValueFrom(authService.initializeSession());
        }),
    ]
};
