import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import {
  AuthUser,
  LoginRequest,
  LoginResponse
} from '../interfaces/auth.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  #http = inject(HttpClient);
  #apiUrl = '/api/auth';

  #accessToken = signal<string | null>(null);
  #currentUser = signal<AuthUser | null>(null);

  readonly accessToken = this.#accessToken.asReadonly();
  readonly currentUser = this.#currentUser.asReadonly();

  readonly isAuthenticated = computed(() => {
    return !!this.#accessToken();
  });

  readonly isAdmin = computed(() => {
    return this.#currentUser()?.role === 'ADMIN';
  });

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.#http
      .post<LoginResponse>(`${this.#apiUrl}/login`, request)
      .pipe(
        tap(response => {
          this.#accessToken.set(response.accessToken);
          this.#currentUser.set(response.user);
        })
      );
  }

  logout(): void {
    this.#accessToken.set(null);
    this.#currentUser.set(null);
  }
}
