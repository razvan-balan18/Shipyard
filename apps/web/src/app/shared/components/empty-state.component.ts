import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="empty-state">
      <p class="empty-message">{{ message() }}</p>
      @if (actionLabel() && actionLink()) {
        <a [routerLink]="actionLink()" class="empty-action">{{ actionLabel() }}</a>
      }
    </div>
  `,
  styles: [
    `
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 3rem 1rem;
        color: var(--text-muted);
        text-align: center;
      }
      .empty-message {
        font-size: 0.95rem;
      }
      .empty-action {
        font-size: 0.875rem;
        color: var(--accent);
        text-decoration: none;
      }
      .empty-action:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class EmptyStateComponent {
  message = input.required<string>();
  actionLabel = input<string>();
  actionLink = input<string>();
}
