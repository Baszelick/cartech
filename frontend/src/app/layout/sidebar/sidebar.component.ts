import {ChangeDetectionStrategy, Component} from '@angular/core';
import {NAVIGATION} from './config/navigation.config';
import {NavItemComponent} from './components/nav-item/nav-item.component';

@Component({
  selector: 'app-sidebar',
  imports: [
    NavItemComponent
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  readonly navigation = NAVIGATION;
}
