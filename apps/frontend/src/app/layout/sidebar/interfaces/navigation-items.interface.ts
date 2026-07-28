import type {IconName} from '@cartech/frontend/ui';

export interface NavigationItem {
  label: string;
  icon: IconName;
  route: string;

  badge?: number;
  disabled?: boolean;
}
