import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
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
