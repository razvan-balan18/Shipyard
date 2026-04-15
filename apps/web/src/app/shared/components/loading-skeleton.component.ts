import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  template: `
    @for (i of rows(); track i) {
      <div class="skeleton-row">
        <div class="skeleton-block short"></div>
        <div class="skeleton-block long"></div>
      </div>
    }
  `,
  styles: [
    `
      .skeleton-row {
        display: flex;
        gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border);
      }
      .skeleton-block {
        height: 14px;
        border-radius: 4px;
        background: linear-gradient(
          90deg,
          var(--bg-hover) 25%,
          var(--border) 50%,
          var(--bg-hover) 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
      }
      .skeleton-block.short {
        width: 80px;
      }
      .skeleton-block.long {
        flex: 1;
      }

      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
    `,
  ],
})
export class LoadingSkeletonComponent {
  count = input<number>(3);
  rows = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
