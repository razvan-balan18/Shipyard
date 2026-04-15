import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest } from '@shipyard/shared';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<AuthResponse['user'] | null>(null);
  private token = signal<string | null>(null);

  user = computed(() => this.currentUser());
  isAuthenticated = computed(() => {
    const t = this.token();
    return !!t && !this.isTokenExpired(t);
  });
  teamId = computed(() => this.currentUser()?.teamId ?? null);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    const savedToken = localStorage.getItem('shipyard_token');
    const savedUser = localStorage.getItem('shipyard_user');
    if (savedToken && savedUser) {
      try {
        if (this.isTokenExpired(savedToken)) {
          localStorage.removeItem('shipyard_token');
          localStorage.removeItem('shipyard_user');
        } else {
          this.token.set(savedToken);
          this.currentUser.set(JSON.parse(savedUser));
        }
      } catch {
        localStorage.removeItem('shipyard_token');
        localStorage.removeItem('shipyard_user');
      }
    }
  }

  async login(credentials: LoginRequest): Promise<void> {
    const response = await lastValueFrom(
      this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, credentials),
    );
    this.setAuth(response);
  }

  async register(data: RegisterRequest): Promise<void> {
    const response = await lastValueFrom(
      this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/register`, data),
    );
    this.setAuth(response);
  }

  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
    localStorage.removeItem('shipyard_token');
    localStorage.removeItem('shipyard_user');
    this.router.navigate(['/auth/login']);
  }

  // Returns the token if valid, or null if expired (also triggers logout on expiry).
  // Side-effect on expiry is intentional: an expired token means the session is dead.
  getToken(): string | null {
    const t = this.token();
    if (t && this.isTokenExpired(t)) {
      this.logout();
      return null;
    }
    return t;
  }

  // Client-side expiry check only — decodes without verifying the signature.
  // The backend re-validates the full signature on every request; this is
  // defence-in-depth to avoid sending known-expired tokens.
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  private setAuth(response: AuthResponse): void {
    this.token.set(response.accessToken);
    this.currentUser.set(response.user);
    localStorage.setItem('shipyard_token', response.accessToken);
    localStorage.setItem('shipyard_user', JSON.stringify(response.user));
  }
}
