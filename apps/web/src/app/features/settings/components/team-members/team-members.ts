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

import { ApiService } from '../../../../core/api/api.service';
import { AuthService } from '../../../../core/auth/auth.service';
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
  templateUrl: './team-members.html',
  styleUrl: './team-members.scss',
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
