import {NavigationItem} from '../interfaces/navigation-items.interface';

export const NAVIGATION:  NavigationItem[] = [
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
];
