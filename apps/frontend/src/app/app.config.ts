import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import {routes} from './app.routes';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { authInterceptor, AuthService } from '@cartech/auth/data-access';
import { firstValueFrom } from 'rxjs';
import { WorkspaceStore } from '@cartech/core/data-access';

export async function initializeApplication(): Promise<void> {
  const authService = inject(AuthService);
  const workspaceStore = inject(WorkspaceStore);

  await firstValueFrom(authService.initializeSession());

  if (!authService.isAuthenticated()) {
    return;
  }

  await firstValueFrom(workspaceStore.loadWorkspace());
}


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes),
    provideHttpClient(withXhr(),
      withInterceptors([authInterceptor]),
    ),
    provideAppInitializer(initializeApplication),
  ],
};
