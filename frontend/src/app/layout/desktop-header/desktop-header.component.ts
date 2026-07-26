import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {InputComponent} from '../../ui/input/input.component';
import {IconComponent} from '../../ui/icon/icon.component';
import {DatePickerComponent} from '../../ui/date-picker/date-picker.component';
import {ButtonComponent} from '../../ui/button/button.component';
import {AuthService} from '../../core/services/auth.service';

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
