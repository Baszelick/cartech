import { Route } from '@angular/router';
import { VinScanner } from './pages/vin-scanner';

export const appRoutes: Route[] = [
  {
    path: '',
    component: VinScanner
  }
];
