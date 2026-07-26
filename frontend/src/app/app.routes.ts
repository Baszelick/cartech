import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login-page/login-page.component')
        .then(c => c.LoginPageComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component')
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
          import('./features/home/pages/home-page/home-page.component')
            .then(c => c.HomePageComponent),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('./features/tasks/pages/tasks-page/tasks-page.component')
            .then(c => c.TasksPageComponent),
      },
      {
        path: 'cars',
        loadComponent: () =>
          import('./features/cars/pages/cars-page/cars-page.component')
            .then(c => c.CarsPageComponent),
      },
      {
        path: 'arrival',
        loadComponent: () =>
          import('./features/arrival/pages/arrival-page/arrival-page.component')
            .then(c => c.ArrivalPageComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
