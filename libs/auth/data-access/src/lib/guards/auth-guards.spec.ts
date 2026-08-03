import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';

describe('auth guards', () => {
  const authenticated = signal(false);
  let authService: Pick<AuthService, 'isAuthenticated'>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authenticated.set(false);
    authService = {
      isAuthenticated: authenticated.asReadonly(),
    };
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows an authenticated user without starting refresh', () => {
    authenticated.set(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/home' } as RouterStateSnapshot,
      ),
    );

    expect(result).toBeTrue();
  });

  it('redirects a guest to login', () => {
    const loginTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(loginTree);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/cars' } as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(loginTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(
      ['/login'],
      { queryParams: { returnUrl: '/cars' } },
    );
  });

  it('redirects an authenticated user away from login', () => {
    authenticated.set(true);
    const homeTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(homeTree);

    const result = TestBed.runInInjectionContext(() =>
      guestGuard(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

    expect(result).toBe(homeTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/home']);
  });

  it('allows a guest to open login', () => {
    const result = TestBed.runInInjectionContext(() =>
      guestGuard(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

    expect(result).toBeTrue();
  });
});
