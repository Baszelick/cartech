import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, shareReplay, switchMap, throwError } from 'rxjs';

import { AuthService, WorkspaceStore } from '@cartech/core/data-access';

let refreshRequest$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const workspaceStore = inject(WorkspaceStore);
  const router = inject(Router);

  const isPublicAuthRequest = isAuthRequest(request);

  const requestWithToken = isPublicAuthRequest
    ? request
    : addAccessToken(request, authService.accessToken());

  return next(requestWithToken).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isPublicAuthRequest) {
        return throwError(() => error);
      }

      return getRefreshRequest(authService, workspaceStore, router).pipe(
        switchMap((accessToken) => {
          const retryRequest = addAccessToken(request, accessToken);

          return next(retryRequest);
        }),
      );
    }),
  );
};

function addAccessToken(
  request: HttpRequest<unknown>,
  accessToken: string | null,
): HttpRequest<unknown> {
  if (!accessToken) {
    return request;
  }

  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

function isAuthRequest(request: HttpRequest<unknown>): boolean {
  return ['/auth/login', '/auth/refresh', '/auth/logout'].some((url) => request.url.includes(url));
}

function getRefreshRequest(
  authService: AuthService,
  workspaceStore: InstanceType<typeof WorkspaceStore>,
  router: Router,
): Observable<string> {
  if (!refreshRequest$) {
    refreshRequest$ = authService.refresh().pipe(
      map((response) => response.accessToken),

      catchError((error: unknown) => {
        authService.clearSession();
        workspaceStore.reset();
        void router.navigateByUrl('/login');

        return throwError(() => error);
      }),

      finalize(() => {
        refreshRequest$ = null;
      }),

      shareReplay({
        bufferSize: 1,
        refCount: false,
      }),
    );
  }

  return refreshRequest$;
}
