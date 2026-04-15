import { Component, input } from '@angular/core';
import { RelativeTimePipe } from '../pipes/relative-time.pipe';

@Component({
  selector: 'app-time-ago',
  standalone: true,
  imports: [RelativeTimePipe],
  template: `<time [attr.datetime]="timestamp()">{{ timestamp() | relativeTime }}</time>`,
  styles: [
    `
      time {
        color: var(--text-secondary);
        font-size: 0.8rem;
      }
    `,
  ],
})
export class TimeAgoComponent {
  timestamp = input<Date | string | null | undefined>();
}
