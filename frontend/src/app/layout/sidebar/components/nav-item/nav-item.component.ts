import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {NavigationItem} from '../../interfaces/navigation-items.interface';
import {IconComponent} from '../../../../ui/icon/icon.component';
import {RouterLink, RouterLinkActive} from '@angular/router';

@Component({
  selector: 'app-nav-item',
  imports: [
    IconComponent,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './nav-item.component.html',
  styleUrl: './nav-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavItemComponent {
  readonly item = input.required<NavigationItem>();
}
