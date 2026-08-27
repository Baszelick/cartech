import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  ImageLogoComponent,
  InputComponent,
  IconComponent,
  ButtonComponent,
  FormFieldComponent,
} from '@cartech/frontend/ui';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@cartech/auth/data-access';
import { WorkspaceStore } from '@cartech/core/data-access';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, of, switchMap } from 'rxjs';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent {
  readonly #fb = inject(FormBuilder);
  readonly #authService = inject(AuthService);
  readonly #workspaceStore = inject(WorkspaceStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  #destroy = inject(DestroyRef);

  readonly passwordVisible = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly loginError = signal<string | null>(null);

  readonly form = this.#fb.nonNullable.group({
    companyCode: ['', Validators.required],
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  toggleVisibility() {
    this.passwordVisible.update((v) => !v);
  }

  passwordEye = computed(() => (this.passwordVisible() ? 'eyeOff' : 'eye'));

  onSubmit() {
    if (this.form.invalid || this.isLoading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.loginError.set(null);
    this.form.disable();

    this.#authService
      .login({
        ...this.form.getRawValue(),
        companyCode: this.form.controls.companyCode.value
          .trim()
          .toUpperCase(),
      })
      .pipe(
        switchMap(() => this.#workspaceStore.loadWorkspace()),
        switchMap(() => {
          if (!this.#workspaceStore.error()) {
            return of(true);
          }

          return this.#authService.logout().pipe(
            map(() => false),
            catchError(() => of(false)),
            finalize(() => this.#workspaceStore.reset()),
          );
        }),
        takeUntilDestroyed(this.#destroy),
        finalize(() => {
          this.isLoading.set(false);
          this.form.enable();
        }),
      )
      .subscribe({
        next: (workspaceLoaded) => {
          if (!workspaceLoaded) {
            this.loginError.set(
              'Вход выполнен, но не удалось загрузить рабочий контекст. Попробуйте войти снова.',
            );
            return;
          }

          const returnUrl = this.#route.snapshot.queryParamMap.get('returnUrl');
          const url = returnUrl?.startsWith('/') ? returnUrl : '/home';
          void this.#router.navigateByUrl(url);
        },
        error: () => {
          this.loginError.set('Неверный логин или пароль');
        },
      });
  }
}
