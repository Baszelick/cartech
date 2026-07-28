import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {NAVIGATION} from './config/navigation.config';
import {NavItemComponent} from './components/nav-item/nav-item.component';
import {LogoComponent, ImageLogoComponent, IconComponent, ButtonComponent} from '@cartech/frontend/ui';
import {LayoutService} from "../../core/services/layout.service";

@Component({
  selector: 'app-sidebar',
  imports: [
    NavItemComponent,
    LogoComponent,
    ImageLogoComponent,
    IconComponent,
    ButtonComponent
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  readonly navigation = NAVIGATION;
  readonly layout = inject(LayoutService)
}
