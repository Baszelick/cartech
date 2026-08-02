import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal} from '@angular/core';
import {
  ImageLogoComponent,
  InputComponent,
  IconComponent,
  ButtonComponent,
  FormFieldComponent,
} from '@cartech/frontend/ui';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {AuthService} from '@cartech/auth/data-access';
import {ActivatedRoute, Router} from '@angular/router';
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
  readonly #route = inject(ActivatedRoute);
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
    if(this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched()
      console.log('form invalid')
      return
    }
    this.isLoading.set(true)
    this.loginError.set(null)
    this.form.disable()

    this.#authService.login(this.form.getRawValue()).pipe(
      takeUntilDestroyed(this.#destroy),
      finalize(() => {
        this.isLoading.set(false)
        this.form.enable()
      })
    ).subscribe({
      next: () => {
        const returnUrl = this.#route.snapshot.queryParamMap.get('returnUrl');
        const url = returnUrl?.startsWith('/') ? returnUrl : '/home';
        void this.#router.navigateByUrl(url);
      },
      error: () => {
        this.loginError.set('Неверный логин или пароль')
      },
    })
  }
}
