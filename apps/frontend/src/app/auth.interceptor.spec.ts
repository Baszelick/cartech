import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService, WorkspaceStore } from '@cartech/core/data-access';
import { Subject } from 'rxjs';

import { authInterceptor } from '@cartech/auth/data-access';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let refresh$: Subject<{ accessToken: string }>;
  let authService: {
    accessToken: jasmine.Spy;
    refresh: jasmine.Spy;
    clearSession: jasmine.Spy;
  };
  let workspaceStore: { reset: jasmine.Spy };
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    refresh$ = new Subject<{ accessToken: string }>();
    authService = {
      accessToken: jasmine.createSpy().and.returnValue('current-token'),
      refresh: jasmine.createSpy().and.returnValue(refresh$),
      clearSession: jasmine.createSpy(),
    };
    workspaceStore = { reset: jasmine.createSpy() };
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: WorkspaceStore, useValue: workspaceStore },
        { provide: Router, useValue: router },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('adds the current bearer token to an ordinary API request', () => {
    http.get('/api/company/me').subscribe();

    const request = httpTesting.expectOne('/api/company/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer current-token');
    request.flush({ id: 'company-id' });
  });

  it('refreshes once and retries the original request with the new token', () => {
    http.get('/api/company/me').subscribe();

    httpTesting
      .expectOne('/api/company/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refresh).toHaveBeenCalledTimes(1);
    refresh$.next({ accessToken: 'refreshed-token' });
    refresh$.complete();

    const retry = httpTesting.expectOne('/api/company/me');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer refreshed-token');
    retry.flush({ id: 'company-id' });

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('clears auth and workspace and redirects once when refresh fails', () => {
    const requestErrors: HttpErrorResponse[] = [];
    http.get('/api/company/me').subscribe({
      error: (error: HttpErrorResponse) => {
        requestErrors.push(error);
      },
    });

    httpTesting
      .expectOne('/api/company/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    refresh$.error(new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));

    expect(requestErrors.length).toBe(1);
    expect(requestErrors[0].status).toBe(401);
    expect(authService.clearSession).toHaveBeenCalledTimes(1);
    expect(workspaceStore.reset).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/login');
  });

  it('shares one refresh request across concurrent 401 responses', () => {
    const responses: string[] = [];
    http.get<{ source: string }>('/api/first').subscribe((response) => responses.push(response.source));
    http.get<{ source: string }>('/api/second').subscribe((response) => responses.push(response.source));

    httpTesting
      .expectOne('/api/first')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpTesting
      .expectOne('/api/second')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refresh).toHaveBeenCalledTimes(1);
    refresh$.next({ accessToken: 'refreshed-token' });
    refresh$.complete();

    const firstRetry = httpTesting.expectOne('/api/first');
    const secondRetry = httpTesting.expectOne('/api/second');
    expect(firstRetry.request.headers.get('Authorization')).toBe('Bearer refreshed-token');
    expect(secondRetry.request.headers.get('Authorization')).toBe('Bearer refreshed-token');
    firstRetry.flush({ source: 'first' });
    secondRetry.flush({ source: 'second' });

    expect(responses).toEqual(['first', 'second']);
  });

  it('fails concurrent requests together and performs cleanup once', () => {
    const requestErrors: HttpErrorResponse[] = [];
    const errorObserver = {
      error: (error: HttpErrorResponse) => requestErrors.push(error),
    };
    http.get('/api/first').subscribe(errorObserver);
    http.get('/api/second').subscribe(errorObserver);

    httpTesting
      .expectOne('/api/first')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    httpTesting
      .expectOne('/api/second')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    refresh$.error(new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));

    expect(requestErrors.length).toBe(2);
    expect(authService.refresh).toHaveBeenCalledTimes(1);
    expect(authService.clearSession).toHaveBeenCalledTimes(1);
    expect(workspaceStore.reset).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/login');
  });

  it('does not refresh login or refresh requests', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    http.post('/api/auth/refresh', {}).subscribe({ error: () => undefined });

    const login = httpTesting.expectOne('/api/auth/login');
    const refresh = httpTesting.expectOne('/api/auth/refresh');
    expect(login.request.headers.has('Authorization')).toBeFalse();
    expect(refresh.request.headers.has('Authorization')).toBeFalse();
    login.flush({}, { status: 401, statusText: 'Unauthorized' });
    refresh.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refresh).not.toHaveBeenCalled();
  });
});
