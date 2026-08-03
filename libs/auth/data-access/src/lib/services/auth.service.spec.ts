import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import type { AuthUser } from '../interfaces/auth.interface';

describe('AuthService session restoration', () => {
  let authService: AuthService;
  let httpTesting: HttpTestingController;

  const user: AuthUser = {
    id: 'user-id',
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    role: 'SYSTEM_OWNER',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: jasmine.createSpyObj<Router>('Router', ['navigateByUrl']),
        },
        AuthService,
      ],
    });

    authService = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('restores access token and current user through refresh and me', () => {
    let completed = false;

    authService.initializeSession().subscribe(() => {
      completed = true;
    });

    const refresh = httpTesting.expectOne('/api/auth/refresh');
    expect(refresh.request.withCredentials).toBeTrue();
    refresh.flush({ accessToken: 'restored-access-token' });

    const me = httpTesting.expectOne('/api/auth/me');
    expect(me.request.headers.get('Authorization'))
      .toBe('Bearer restored-access-token');
    me.flush(user);

    expect(completed).toBeTrue();
    expect(authService.accessToken()).toBe('restored-access-token');
    expect(authService.currentUser()).toEqual(user);
    expect(authService.isAuthenticated()).toBeTrue();
    expect(authService.initialized()).toBeTrue();
  });

  it('keeps bootstrap successful and leaves guest state after refresh 401', () => {
    let completed = false;
    let failed = false;

    authService.initializeSession().subscribe({
      next: () => {
        completed = true;
      },
      error: () => {
        failed = true;
      },
    });

    httpTesting.expectOne('/api/auth/refresh').flush(
      { message: 'Refresh token not found' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(completed).toBeTrue();
    expect(failed).toBeFalse();
    expect(authService.accessToken()).toBeNull();
    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBeFalse();
    expect(authService.initialized()).toBeTrue();
    httpTesting.expectNone('/api/auth/me');
  });
});
