import type {IconName} from '@cartech/frontend/ui';
import { UserRole } from '@cartech/auth/data-access';

export interface NavigationItem {
  label: string;
  icon: IconName;
  route: string;

  badge?: number;
  disabled?: boolean;
  roles?: UserRole[]
}
