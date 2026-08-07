import {NavigationItem} from '../interfaces/navigation-items.interface';
import {UserRole} from "@cartech/core/data-access";

export const NAVIGATION: NavigationItem[] = [
  {
    label: 'Главная',
    icon: 'home',
    route: '/home',
  },
  {
    label: 'Задачи',
    icon: 'tasks',
    route: '/tasks',
  },
  {
    label: 'Склад',
    icon: 'car',
    route: '/cars',
  },
  {
    label: 'Поступление',
    icon: 'arrival',
    route: '/arrival',
  },
  {
    label: 'Администрирование',
    icon: 'shield',
    route: '/user',
    roles: [UserRole.SYSTEM_OWNER, UserRole.OPERATIONS_MANAGER]
  },
];
