import {Routes} from '@angular/router';
import {authGuard, guestGuard} from '@cartech/auth/data-access';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('@cartech/auth/feature-login')
        .then(c => c.LoginPageComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@cartech/shell/feature-layout')
        .then(c => c.ShellComponent),
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () =>
          import('@cartech/dashboard/feature-home')
            .then(c => c.HomePageComponent),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('@cartech/tasks/feature-tasks')
            .then(c => c.TasksPageComponent),
      },
      {
        path: 'cars',
        loadComponent: () =>
          import('@cartech/cars/feature-list')
            .then(c => c.CarsPageComponent),
      },
      {
        path: 'arrival',
        loadComponent: () =>
          import('@cartech/arrivals/feature-arrival')
            .then(c => c.ArrivalPageComponent),
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('@cartech/admin/feature-admin')
            .then(c => c.AdminPage)
      }
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
