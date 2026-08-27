import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {Router} from '@angular/router';
import {
  InputComponent,
  IconComponent,
  DatePickerComponent,
  ButtonComponent, ContextSelect,
} from '@cartech/frontend/ui';
import {AuthService} from '@cartech/auth/data-access';
import { WorkspaceStore } from '@cartech/core/data-access';

@Component({
  selector: 'app-desktop-header',
  imports: [InputComponent, IconComponent, DatePickerComponent, ButtonComponent, ContextSelect],
  templateUrl: './desktop-header.component.html',
  styleUrl: './desktop-header.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesktopHeaderComponent {
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);
  readonly workspace = inject(WorkspaceStore);

  readonly locationItems = computed(() =>
    this.workspace.locations().map((location) => ({
      id: location.id,
      label: location.name,
    })),
  );

  readonly siteItems = computed(() =>
    this.workspace.sites().map((site) => ({
      id: site.id,
      label: site.name,
    })),
  );

  onLogout(): void {
    this.#authService.logout().subscribe({
      next: () => void this.#router.navigateByUrl('/login'),
      error: () => void this.#router.navigateByUrl('/login'),
    });
  }
}
