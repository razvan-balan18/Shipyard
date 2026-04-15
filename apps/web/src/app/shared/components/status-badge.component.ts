import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

// A simple reusable badge that shows colored dots + text for statuses

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [class]="'status-' + status()">
      <span class="status-dot"></span>
      {{ label() || status() }}
    </span>
  `,
  styles: [
    `
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .status-HEALTHY .status-dot,
      .status-SUCCESS .status-dot {
        background: #22c55e;
      }
      .status-HEALTHY,
      .status-SUCCESS {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
      }

      .status-DEGRADED .status-dot,
      .status-IN_PROGRESS .status-dot,
      .status-RUNNING .status-dot {
        background: #eab308;
      }
      .status-DEGRADED,
      .status-IN_PROGRESS,
      .status-RUNNING {
        background: rgba(234, 179, 8, 0.1);
        color: #eab308;
      }

      .status-DOWN .status-dot,
      .status-FAILED .status-dot {
        background: #ef4444;
      }
      .status-DOWN,
      .status-FAILED {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }

      .status-UNKNOWN .status-dot,
      .status-PENDING .status-dot {
        background: #6b7280;
      }
      .status-UNKNOWN,
      .status-PENDING {
        background: rgba(107, 114, 128, 0.1);
        color: #6b7280;
      }
    `,
  ],
})
export class StatusBadgeComponent {
  status = input.required<string>();
  label = input<string>();
}
