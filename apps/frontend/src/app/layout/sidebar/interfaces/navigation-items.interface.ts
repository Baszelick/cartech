import {IconName} from '../../../ui/icon/icon.types';

export interface NavigationItem {
  label: string;
  icon: IconName;
  route: string;

  badge?: number;
  disabled?: boolean;
}
