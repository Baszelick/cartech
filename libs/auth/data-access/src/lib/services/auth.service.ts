import {computed, inject, Injectable, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {catchError, finalize, map, Observable, of, switchMap, tap} from 'rxjs';

import {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
} from '../interfaces/auth.interface';
import { UserRole } from '@cartech/core/data-access';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = '/api/auth';

  readonly #accessToken = signal<string | null>(null);
  readonly #currentUser = signal<AuthUser | null>(null);
  readonly #initialized = signal(false);

  readonly accessToken = this.#accessToken.asReadonly();
  readonly currentUser = this.#currentUser.asReadonly();
  readonly initialized = this.#initialized.asReadonly();

  readonly isAuthenticated = computed(() => {
    return !!this.#accessToken();
  });

  readonly isSystemOwner = computed(() => {
    return this.hasRole(UserRole.SYSTEM_OWNER);
  });

  readonly isOperationsManager = computed(() => {
    return this.hasRole(UserRole.OPERATIONS_MANAGER);
  });

  readonly canAccessAdministration = computed(() => {
    return this.hasAnyRole([
      UserRole.SYSTEM_OWNER,
      UserRole.OPERATIONS_MANAGER,
    ]);
  });

  hasRole(role: UserRole): boolean {
    return this.#currentUser()?.roles.includes(role) ?? false;
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    const currentRoles = this.#currentUser()?.roles ?? [];

    return roles.some((role) => currentRoles.includes(role));
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.#http
      .post<LoginResponse>(`${this.#apiUrl}/login`, request, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          this.#accessToken.set(response.accessToken);
          this.#currentUser.set(response.user);
        }),
      );
  }

  initializeSession(): Observable<void> {
    return this.#http
      .post<RefreshResponse>(
        `${this.#apiUrl}/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap((response) => {
          this.#accessToken.set(response.accessToken);
        }),
        switchMap(() => this.getMe()),
        catchError(() => {
          this.clearSession();
          return of(void 0);
        }),
        finalize(() => {
          this.#initialized.set(true);
        }),
        map(() => void 0),
      );
  }

  refresh() {
    return this.#http
      .post<RefreshResponse>(
        `${this.#apiUrl}/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap((response) => {
          this.#accessToken.set(response.accessToken);
        }),
      );
  }

  getMe() {
    return this.#http
      .get<AuthUser>(`${this.#apiUrl}/me`)
      .pipe(tap((user) => this.#currentUser.set(user)));
  }

  logout() {
    return this.#http
      .post(`${this.#apiUrl}/logout`, {}, { withCredentials: true })
      .pipe(finalize(() => this.clearSession()));
  }

  clearSession(): void {
    this.#accessToken.set(null);
    this.#currentUser.set(null);
  }

  setAccessToken(accessToken: string): void {
    this.#accessToken.set(accessToken);
  }
}
