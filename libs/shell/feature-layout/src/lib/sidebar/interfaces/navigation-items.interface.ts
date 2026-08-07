import type {IconName} from '@cartech/frontend/ui';
import { UserRole } from '@cartech/core/data-access';

export interface NavigationItem {
  label: string;
  icon: IconName;
  route: string;

  badge?: number;
  disabled?: boolean;
  roles?: UserRole[]
}
