import {inject} from '@angular/core';
import {CanActivateFn, Router, UrlTree} from '@angular/router';
import {AuthService} from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  const returnUrl = state.url.startsWith('/') ? state.url : '/home';
  const urlTree: UrlTree = router.createUrlTree(['/login'], {
    queryParams: {returnUrl},
  });

  return urlTree;
};
