import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NAVIGATION } from './config/navigation.config';
import { NavItemComponent } from './components/nav-item/nav-item.component';
import { ButtonComponent, IconComponent, ImageLogoComponent } from '@cartech/frontend/ui';
import { LayoutService } from '../layout.service';
import { AuthService } from '@cartech/auth/data-access';

@Component({
  selector: 'app-sidebar',
  imports: [NavItemComponent, ImageLogoComponent, IconComponent, ButtonComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly layout = inject(LayoutService);
  readonly authService = inject(AuthService);

  readonly navigation = computed(() => {
    return NAVIGATION.filter((item) => {
      if (!item.roles?.length) {
        return true;
      }

      return this.authService.hasAnyRole(item.roles);
    });
  });
}
