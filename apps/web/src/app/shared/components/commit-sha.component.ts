import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-commit-sha',
  standalone: true,
  template: `<code class="commit-sha">{{ short() }}</code>`,
  styles: [
    `
      .commit-sha {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 0.8rem;
        background: var(--bg-hover);
        color: var(--text-secondary);
        padding: 1px 6px;
        border-radius: 4px;
      }
    `,
  ],
})
export class CommitShaComponent {
  sha = input<string | null | undefined>();
  short = computed(() => this.sha()?.slice(0, 7) ?? '—');
}
