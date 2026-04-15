import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal<boolean>(true); // Default to dark mode for a dev tool

  constructor() {
    // Check saved preference
    const saved = localStorage.getItem('shipyard_theme');
    if (saved) {
      this.isDark.set(saved === 'dark');
    }

    // Apply theme class to <body> whenever isDark changes
    effect(() => {
      document.body.classList.toggle('dark-theme', this.isDark());
      document.body.classList.toggle('light-theme', !this.isDark());
      localStorage.setItem('shipyard_theme', this.isDark() ? 'dark' : 'light');
    });
  }

  toggle(): void {
    this.isDark.update((dark) => !dark);
  }
}
