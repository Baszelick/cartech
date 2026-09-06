import { signalStore, withState } from '@ngrx/signals';
import { initialAdminState } from './admin.state';

export const AdminStore = signalStore(
  { providedIn: 'root' },

  withState(initialAdminState),
);
