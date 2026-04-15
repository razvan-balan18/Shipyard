import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet],
  template: `
    <div class="main-layout">
      <router-outlet />
    </div>
  `,
})
export class MainLayoutComponent {}
