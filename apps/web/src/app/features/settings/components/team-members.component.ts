import {
  Component,
  OnInit,
  DestroyRef,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { switchMap } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { UserRole } from '@shipyard/shared';

interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

interface InvitePayload {
  email: string;
  displayName: string;
  password: string;
  role: UserRole;
}

const ROLE_COLORS: Record<UserRole, string> = {
  OWNER: '#9333ea',
  ADMIN: '#3b82f6',
  MEMBER: '#22c55e',
  VIEWER: '#6b7280',
};

const ROLE_BACKGROUNDS: Record<UserRole, string> = {
  OWNER: 'rgba(147, 51, 234, 0.1)',
  ADMIN: 'rgba(59, 130, 246, 0.1)',
  MEMBER: 'rgba(34, 197, 94, 0.1)',
  VIEWER: 'rgba(107, 114, 128, 0.1)',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

const AVATAR_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
];

function getAvatarColor(name: string): string {
  const index = Math.abs(hashCode(name)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

@Component({
  selector: 'app-team-members',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="team-members-page">
      <header class="page-header">
        <h2>Team Members</h2>
      </header>

      @if (error()) {
        <div class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error() }}</span>
          <button mat-button (click)="loadMembers()">Retry</button>
        </div>
      }

      @if (loading()) {
        <div class="loading-container">
          <mat-spinner diameter="40" />
        </div>
      } @else {
        <div class="members-table">
          <div class="table-header">
            <span class="col-user">User</span>
            <span class="col-role">Role</span>
            <span class="col-actions">Actions</span>
          </div>

          @for (member of members(); track member.id) {
            <div class="member-row">
              <div class="col-user user-info">
                <div class="avatar" [style.background-color]="getAvatarColor(member.displayName)">
                  {{ getInitials(member.displayName) }}
                </div>
                <div class="user-details">
                  <span class="user-name">{{ member.displayName }}</span>
                  <span class="user-email">{{ member.email }}</span>
                </div>
              </div>

              <div class="col-role">
                @if (isOwner(member) || isCurrentUser(member)) {
                  <span
                    class="role-badge"
                    [style.color]="getRoleColor(member.role)"
                    [style.background-color]="getRoleBg(member.role)"
                  >
                    {{ member.role }}
                  </span>
                } @else {
                  <mat-form-field appearance="outline" class="role-select">
                    <mat-select
                      [value]="member.role"
                      (selectionChange)="onRoleChange(member, $event.value)"
                    >
                      <mat-option value="ADMIN">ADMIN</mat-option>
                      <mat-option value="MEMBER">MEMBER</mat-option>
                      <mat-option value="VIEWER">VIEWER</mat-option>
                    </mat-select>
                  </mat-form-field>
                }
              </div>

              <div class="col-actions">
                @if (!isOwner(member) && !isCurrentUser(member)) {
                  <button
                    mat-icon-button
                    class="delete-btn"
                    (click)="confirmRemove(member)"
                    aria-label="Remove member"
                  >
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <mat-expansion-panel class="invite-panel">
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon class="invite-icon">person_add</mat-icon>
              Invite Member
            </mat-panel-title>
          </mat-expansion-panel-header>

          @if (inviteError()) {
            <div class="error-banner compact">
              <mat-icon>error_outline</mat-icon>
              <span>{{ inviteError() }}</span>
            </div>
          }

          <form [formGroup]="inviteForm" (ngSubmit)="submitInvite()" class="invite-form">
            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Email</mat-label>
                <input
                  matInput
                  formControlName="email"
                  type="email"
                  placeholder="user@example.com"
                />
                @if (inviteForm.controls.email.hasError('email')) {
                  <mat-error>Enter a valid email address</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Display Name</mat-label>
                <input matInput formControlName="displayName" placeholder="Jane Doe" />
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Password</mat-label>
                <input
                  matInput
                  formControlName="password"
                  type="password"
                  placeholder="Min 8 characters"
                />
                @if (inviteForm.controls.password.hasError('minlength')) {
                  <mat-error>Password must be at least 8 characters</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="form-field">
                <mat-label>Role</mat-label>
                <mat-select formControlName="role">
                  <mat-option value="ADMIN">ADMIN</mat-option>
                  <mat-option value="MEMBER">MEMBER</mat-option>
                  <mat-option value="VIEWER">VIEWER</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button
                class="btn-primary"
                type="submit"
                [disabled]="inviteForm.invalid || inviting()"
              >
                {{ inviting() ? 'Inviting...' : 'Send Invite' }}
              </button>
            </div>
          </form>
        </mat-expansion-panel>
      }
    </div>
  `,
  styles: [
    `
      .team-members-page {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .page-header h2 {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0;
      }

      .error-banner {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        font-size: 0.875rem;
      }
      .error-banner.compact {
        margin-bottom: 0.75rem;
      }
      .error-banner mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .error-banner span {
        flex: 1;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        padding: 3rem 0;
      }

      /* Table layout */
      .members-table {
        border: 1px solid var(--border);
        border-radius: 10px;
        overflow: hidden;
        background: var(--bg-card);
      }

      .table-header {
        display: grid;
        grid-template-columns: 1fr 160px 80px;
        padding: 0.75rem 1.25rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        border-bottom: 1px solid var(--border);
        background: var(--bg-surface, transparent);
      }

      .member-row {
        display: grid;
        grid-template-columns: 1fr 160px 80px;
        align-items: center;
        padding: 0.75rem 1.25rem;
        border-bottom: 1px solid var(--border);
      }
      .member-row:last-child {
        border-bottom: none;
      }

      /* User column */
      .user-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: 600;
        color: #fff;
        flex-shrink: 0;
      }

      .user-details {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .user-name {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .user-email {
        font-size: 0.8rem;
        color: var(--text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Role column */
      .role-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.03em;
      }

      .role-select {
        width: 130px;
      }
      .role-select ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none;
      }
      .role-select ::ng-deep .mat-mdc-text-field-wrapper {
        height: 36px;
        padding: 0 8px;
      }
      .role-select ::ng-deep .mat-mdc-form-field-infix {
        padding-top: 6px !important;
        padding-bottom: 6px !important;
        min-height: unset !important;
      }

      /* Actions column */
      .col-actions {
        display: flex;
        justify-content: center;
      }

      .delete-btn {
        color: var(--text-muted);
        transition: color 0.15s ease;
      }
      .delete-btn:hover {
        color: #ef4444;
      }

      /* Invite panel */
      .invite-panel {
        border-radius: 10px !important;
      }

      .invite-icon {
        margin-right: 0.5rem;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .invite-form {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding-top: 0.5rem;
      }

      .form-row {
        display: flex;
        gap: 1rem;
      }

      .form-field {
        flex: 1;
      }

      .form-actions {
        display: flex;
        justify-content: flex-end;
        padding-top: 0.25rem;
      }

      .btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 36px;
        padding: 0 18px;
        border: none;
        border-radius: 6px;
        background: var(--accent);
        color: #fff;
        font-size: 0.875rem;
        font-family: inherit;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }
      .btn-primary:hover:not(:disabled) {
        opacity: 0.88;
      }
      .btn-primary:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    `,
  ],
})
export class TeamMembersComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  members = signal<TeamMember[]>([]);
  loading = signal(true);
  error = signal('');
  inviteError = signal('');
  inviting = signal(false);

  inviteForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['MEMBER' as UserRole, [Validators.required]],
  });

  ngOnInit(): void {
    this.loadMembers();
  }

  loadMembers(): void {
    this.loading.set(true);
    this.error.set('');

    this.api
      .get<TeamMember[]>('/api/users')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.members.set(data);
          this.loading.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.loading.set(false);
          this.error.set(err.error?.message ?? err.message ?? 'Failed to load team members');
        },
      });
  }

  isOwner(member: TeamMember): boolean {
    return member.role === UserRole.OWNER;
  }

  isCurrentUser(member: TeamMember): boolean {
    return member.id === this.auth.user()?.id;
  }

  getInitials(name: string): string {
    return getInitials(name);
  }

  getAvatarColor(name: string): string {
    return getAvatarColor(name);
  }

  getRoleColor(role: UserRole): string {
    return ROLE_COLORS[role];
  }

  getRoleBg(role: UserRole): string {
    return ROLE_BACKGROUNDS[role];
  }

  onRoleChange(member: TeamMember, newRole: UserRole): void {
    const previousRole = member.role;

    // Optimistic update
    this.members.update((list) =>
      list.map((m) => (m.id === member.id ? { ...m, role: newRole } : m)),
    );

    this.api
      .patch<TeamMember>(`/api/users/${member.id}/role`, { role: newRole })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snackBar.open(`Role updated to ${newRole}`, 'Dismiss', { duration: 3000 });
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          // Revert on failure
          this.members.update((list) =>
            list.map((m) => (m.id === member.id ? { ...m, role: previousRole } : m)),
          );
          this.snackBar.open(
            err.error?.message ?? err.message ?? 'Failed to update role',
            'Dismiss',
            { duration: 4000 },
          );
        },
      });
  }

  confirmRemove(member: TeamMember): void {
    const ref = this.snackBar.open(`Remove "${member.displayName}" from the team?`, 'Confirm', {
      duration: 5000,
    });

    ref
      .onAction()
      .pipe(
        switchMap(() => this.api.delete<void>(`/api/users/${member.id}`)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.members.update((list) => list.filter((m) => m.id !== member.id));
          this.snackBar.open('Member removed', 'Dismiss', { duration: 3000 });
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.snackBar.open(
            err.error?.message ?? err.message ?? 'Failed to remove member',
            'Dismiss',
            { duration: 4000 },
          );
        },
      });
  }

  submitInvite(): void {
    if (this.inviteForm.invalid) return;

    this.inviting.set(true);
    this.inviteError.set('');

    const payload: InvitePayload = this.inviteForm.getRawValue();

    this.api
      .post<TeamMember>('/api/users/invite', payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newMember) => {
          this.members.update((list) => [...list, newMember]);
          this.inviteForm.reset({ role: 'MEMBER' as UserRole });
          this.inviting.set(false);
          this.snackBar.open('Member invited successfully', 'Dismiss', { duration: 3000 });
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.inviting.set(false);
          const msg = err.error?.message ?? err.message ?? 'Failed to invite member';
          this.inviteError.set(typeof msg === 'string' ? msg : 'Failed to invite member');
        },
      });
  }
}
