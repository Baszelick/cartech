import {ApplicationConfig, inject, provideAppInitializer, provideZoneChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideHttpClient, withInterceptors} from "@angular/common/http";
import {authInterceptor} from './core/intersepters/auth.intersepter.ts.interceptor';
import {AuthService} from './core/services/auth.service';
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
