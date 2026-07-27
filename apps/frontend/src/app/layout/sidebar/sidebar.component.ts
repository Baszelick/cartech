import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {NAVIGATION} from './config/navigation.config';
import {NavItemComponent} from './components/nav-item/nav-item.component';
import {LogoComponent} from "../../ui/logo/logo.component";
import {ImageLogoComponent} from "../../ui/image-logo/image-logo.component";
import {IconComponent} from "../../ui/icon/icon.component";
import {ButtonComponent} from "../../ui/button/button.component";
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
