import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal} from '@angular/core';
import {ImageLogoComponent} from '../../../../ui/image-logo/image-logo.component';
import {InputComponent} from '../../../../ui/input/input.component';
import {IconComponent} from '../../../../ui/icon/icon.component';
import {ButtonComponent} from '../../../../ui/button/button.component';
import {FormFieldComponent} from '../../../../ui/form-field/form-field.component';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '../../../../core/services/auth.service';
import {Router} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {finalize} from 'rxjs';

@Component({
  selector: 'app-login-form',
  imports: [
    ImageLogoComponent,
    InputComponent,
    IconComponent,
    ButtonComponent,
    FormFieldComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginFormComponent {
  readonly #fb = inject(FormBuilder)
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);
  #destroy = inject(DestroyRef)

  readonly passwordVisible =signal<boolean>(false)
  readonly isLoading = signal<boolean>(false)
  readonly loginError = signal<string | null>(null)

  readonly form = this.#fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  })

  toggleVisibility() {
    this.passwordVisible.update(v => !v)
  }

  passwordEye = computed(() => this.passwordVisible() ? 'eyeOff' : 'eye')

  onSubmit() {
    if(this.form.invalid) {
      this.form.markAllAsTouched()
      console.log('form invalid')
      return
    }
    this.isLoading.set(true)
    this.loginError.set(null)

    this.#authService.login(this.form.getRawValue()).pipe(
      takeUntilDestroyed(this.#destroy),
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: res => {
        this.#router.navigate(['/home'])
      },
      error: () => {
        this.loginError.set('Неверный логин или пароль')
      },
    })
  }
}
