import { Routes } from '@angular/router';
import { AdminPage } from '../pages/admin-page/admin-page';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminPage,
    children: [
      {
        path: '',
        redirectTo: 'company',
        pathMatch: 'full',
      },
      {
        path: 'company',
        loadComponent: () =>
          import('../pages/company-page/company-page').then((m) => m.CompanyPage),
      },
      {
        path: 'locations',
        loadComponent: () =>
          import('../pages/locations-page/locations-page').then((m) => m.LocationsPage),
      },
    ],
  },
];
