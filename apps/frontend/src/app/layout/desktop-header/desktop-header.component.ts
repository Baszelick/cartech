import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {
  InputComponent,
  IconComponent,
  DatePickerComponent,
  ButtonComponent,
} from '@cartech/frontend/ui';
import {AuthService} from '@cartech/frontend/auth/data-access';

@Component({
  selector: 'app-desktop-header',
  imports: [
    InputComponent,
    IconComponent,
    DatePickerComponent,
    ButtonComponent,
  ],
  templateUrl: './desktop-header.component.html',
  styleUrl: './desktop-header.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DesktopHeaderComponent {
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);

  onLogout(): void {
    this.#authService.logout().subscribe({
      next: () => void this.#router.navigateByUrl('/login'),
      error: () => void this.#router.navigateByUrl('/login'),
    });
  }
}
