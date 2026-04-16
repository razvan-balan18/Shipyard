import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-form">
      <div class="form-header">
        <h1 class="form-title">Create account</h1>
        <p class="form-subtitle">Set up your team's control panel</p>
      </div>

      @if (error()) {
        <div class="error-banner" role="alert">
          <span class="error-icon">!</span>
          <span>{{ error() }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="fields-grid">
          <div class="field">
            <label class="field-label" for="displayName">DISPLAY NAME</label>
            <input
              id="displayName"
              class="field-input"
              [class.invalid]="showError('displayName')"
              type="text"
              formControlName="displayName"
              placeholder="Jane Smith"
              autocomplete="name"
            />
            @if (showError('displayName')) {
              <span class="field-error">Display name is required</span>
            }
          </div>

          <div class="field">
            <label class="field-label" for="teamName">TEAM NAME</label>
            <input
              id="teamName"
              class="field-input"
              [class.invalid]="showError('teamName')"
              type="text"
              formControlName="teamName"
              placeholder="Acme Engineering"
              autocomplete="organization"
            />
            @if (showError('teamName')) {
              <span class="field-error">Team name is required</span>
            }
          </div>
        </div>

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
            <span class="field-error">{{ emailError() }}</span>
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
            placeholder="Min. 8 characters"
            autocomplete="new-password"
          />
          @if (showError('password')) {
            <span class="field-error">{{ passwordError() }}</span>
          }
          @if (!showError('password') && form.get('password')?.value) {
            <div class="password-strength">
              <div class="strength-bar" [class]="'strength-' + passwordStrength()"></div>
              <span class="strength-label">{{ passwordStrengthLabel() }}</span>
            </div>
          }
        </div>

        <button type="submit" class="submit-btn" [disabled]="loading()">
          @if (loading()) {
            <span class="spinner" aria-hidden="true"></span>
            <span>Creating account...</span>
          } @else {
            <span>Create account</span>
            <span class="btn-arrow" aria-hidden="true">→</span>
          }
        </button>
      </form>

      <div class="form-footer">
        <span class="footer-text">Already have an account?</span>
        <a routerLink="/auth/login" class="footer-link">Sign in</a>
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

      /* Two-column grid for name fields */
      .fields-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
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

      /* Password strength indicator */
      .password-strength {
        display: flex;
        align-items: center;
        gap: 0.625rem;
      }
      .strength-bar {
        height: 2px;
        flex: 1;
        background: rgba(79, 70, 229, 0.15);
        position: relative;
        overflow: hidden;
      }
      .strength-bar::after {
        content: '';
        position: absolute;
        inset-block: 0;
        left: 0;
        transition:
          width 0.3s ease,
          background 0.3s ease;
      }
      .strength-weak::after {
        width: 33%;
        background: #ef4444;
      }
      .strength-fair::after {
        width: 66%;
        background: #eab308;
      }
      .strength-strong::after {
        width: 100%;
        background: #22c55e;
      }
      .strength-label {
        font-family: var(--font-mono, monospace);
        font-size: 0.625rem;
        letter-spacing: 0.08em;
        color: #484f58;
        white-space: nowrap;
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
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  submitted = signal(false);

  form = this.fb.nonNullable.group({
    displayName: ['', [Validators.required]],
    teamName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  showError(field: 'displayName' | 'teamName' | 'email' | 'password'): boolean {
    return this.submitted() && !!this.form.get(field)?.invalid;
  }

  emailError(): string {
    const ctrl = this.form.get('email');
    if (ctrl?.hasError('required')) return 'Email is required';
    if (ctrl?.hasError('email')) return 'Enter a valid email address';
    return '';
  }

  passwordError(): string {
    const ctrl = this.form.get('password');
    if (ctrl?.hasError('required')) return 'Password is required';
    if (ctrl?.hasError('minlength')) return 'Minimum 8 characters';
    return '';
  }

  passwordStrength(): 'weak' | 'fair' | 'strong' {
    const pw = this.form.get('password')?.value ?? '';
    if (pw.length < 8) return 'weak';
    const hasUpper = /[A-Z]/.test(pw);
    const hasDigit = /\d/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const score = (hasUpper ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSpecial ? 1 : 0);
    if (score >= 2) return 'strong';
    if (score === 1) return 'fair';
    return 'weak';
  }

  passwordStrengthLabel(): string {
    const map = { weak: 'WEAK', fair: 'FAIR', strong: 'STRONG' } as const;
    return map[this.passwordStrength()];
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);

    if (this.form.invalid) return;

    this.loading.set(true);
    try {
      await this.authService.register(this.form.getRawValue());
      await this.router.navigate(['/dashboard']);
    } catch (err: unknown) {
      const e = err as HttpErrorResponse;
      const msg = e?.error?.message ?? e?.message ?? 'Registration failed. Please try again.';
      this.error.set(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      this.loading.set(false);
    }
  }
}
