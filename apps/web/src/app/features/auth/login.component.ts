import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-form">
      <div class="form-header">
        <h1 class="form-title">Sign in</h1>
        <p class="form-subtitle">Access your deployment control panel</p>
      </div>

      @if (error()) {
        <div class="error-banner" role="alert">
          <span class="error-icon">!</span>
          <span>{{ error() }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="field">
          <label class="field-label" for="email">EMAIL</label>
          <input
            id="email"
            class="field-input"
            [class.invalid]="showError('email')"
            type="email"
            formControlName="email"
            placeholder="you@example.com"
            autocomplete="email"
          />
          @if (showError('email')) {
            <span class="field-error">
              {{ emailError() }}
            </span>
          }
        </div>

        <div class="field">
          <label class="field-label" for="password">PASSWORD</label>
          <input
            id="password"
            class="field-input"
            [class.invalid]="showError('password')"
            type="password"
            formControlName="password"
            placeholder="••••••••"
            autocomplete="current-password"
          />
          @if (showError('password')) {
            <span class="field-error">Password is required</span>
          }
        </div>

        <button type="submit" class="submit-btn" [disabled]="loading()">
          @if (loading()) {
            <span class="spinner" aria-hidden="true"></span>
            <span>Authenticating...</span>
          } @else {
            <span>Sign in</span>
            <span class="btn-arrow" aria-hidden="true">→</span>
          }
        </button>
      </form>

      <div class="form-footer">
        <span class="footer-text">No account?</span>
        <a routerLink="/auth/register" class="footer-link">Create one</a>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      /* Header */
      .form-header {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .form-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #e6edf3;
        letter-spacing: -0.02em;
      }
      .form-subtitle {
        font-size: 0.8125rem;
        color: #8b949e;
        font-family: var(--font-mono, monospace);
      }

      /* Error banner */
      .error-banner {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.75rem 1rem;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #f87171;
        font-size: 0.8125rem;
        animation: slideIn 0.2s ease;
      }
      .error-icon {
        font-family: var(--font-mono, monospace);
        font-weight: 700;
        font-size: 0.75rem;
        width: 18px;
        height: 18px;
        border: 1.5px solid currentColor;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Fields */
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .field-label {
        font-family: var(--font-mono, monospace);
        font-size: 0.6875rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        color: #8b949e;
        user-select: none;
      }
      .field-input {
        width: 100%;
        padding: 0.6875rem 0.875rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(79, 70, 229, 0.2);
        color: #e6edf3;
        font-size: 0.9375rem;
        outline: none;
        transition:
          border-color 0.15s,
          background 0.15s,
          box-shadow 0.15s;
        font-family: inherit;
      }
      .field-input::placeholder {
        color: #484f58;
      }
      .field-input:focus {
        border-color: #4f46e5;
        background: rgba(79, 70, 229, 0.06);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
      }
      .field-input.invalid {
        border-color: rgba(239, 68, 68, 0.5);
      }
      .field-input.invalid:focus {
        border-color: #ef4444;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
      }
      .field-error {
        font-family: var(--font-mono, monospace);
        font-size: 0.6875rem;
        color: #f87171;
        letter-spacing: 0.02em;
      }

      /* Submit button */
      .submit-btn {
        width: 100%;
        margin-top: 0.5rem;
        padding: 0.8125rem 1rem;
        background: #4f46e5;
        border: none;
        color: #ffffff;
        font-size: 0.9375rem;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition:
          background 0.15s,
          transform 0.1s,
          opacity 0.15s;
        position: relative;
      }
      .submit-btn:hover:not(:disabled) {
        background: #4338ca;
      }
      .submit-btn:active:not(:disabled) {
        transform: translateY(1px);
      }
      .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-arrow {
        font-size: 1rem;
        transition: transform 0.15s;
      }
      .submit-btn:hover:not(:disabled) .btn-arrow {
        transform: translateX(3px);
      }

      /* Spinner */
      .spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        flex-shrink: 0;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Footer */
      .form-footer {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px solid rgba(79, 70, 229, 0.1);
      }
      .footer-text {
        font-size: 0.8125rem;
        color: #8b949e;
      }
      .footer-link {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #818cf8;
        text-decoration: none;
        transition: color 0.15s;
      }
      .footer-link:hover {
        color: #a5b4fc;
      }
    `,
  ],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  submitted = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  showError(field: 'email' | 'password'): boolean {
    return this.submitted() && !!this.form.get(field)?.invalid;
  }

  emailError(): string {
    const ctrl = this.form.get('email');
    if (ctrl?.hasError('required')) return 'Email is required';
    if (ctrl?.hasError('email')) return 'Enter a valid email address';
    return '';
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);

    if (this.form.invalid) return;

    this.loading.set(true);
    try {
      await this.authService.login(this.form.getRawValue());
      await this.router.navigate(['/dashboard']);
    } catch (err: unknown) {
      const e = err as HttpErrorResponse;
      const msg = e?.error?.message ?? e?.message ?? 'Sign in failed. Please try again.';
      this.error.set(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      this.loading.set(false);
    }
  }
}
