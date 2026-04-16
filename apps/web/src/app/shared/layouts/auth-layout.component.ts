import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="auth-root" [class.dark]="themeService.isDark()">
      <!-- Blueprint grid background -->
      <div class="grid-bg" aria-hidden="true"></div>

      <!-- Floating orbs for depth -->
      <div class="orb orb-1" aria-hidden="true"></div>
      <div class="orb orb-2" aria-hidden="true"></div>

      <!-- Card -->
      <div class="auth-card">
        <!-- Brand header -->
        <div class="brand">
          <span class="brand-anchor">⚓</span>
          <span class="brand-name">SHIPYARD</span>
        </div>

        <router-outlet />
      </div>

      <!-- Corner decoration -->
      <div class="corner-label" aria-hidden="true">
        <span class="corner-text">DEPLOYMENT_CONTROL_v1</span>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-root {
        position: relative;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #060c18;
        overflow: hidden;
        padding: 2rem 1rem;
      }

      /* Blueprint grid */
      .grid-bg {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(79, 70, 229, 0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(79, 70, 229, 0.07) 1px, transparent 1px);
        background-size: 48px 48px;
        animation: gridPulse 8s ease-in-out infinite;
      }

      @keyframes gridPulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      /* Depth orbs */
      .orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        pointer-events: none;
      }
      .orb-1 {
        width: 400px;
        height: 400px;
        background: rgba(79, 70, 229, 0.12);
        top: -100px;
        right: -100px;
        animation: float 12s ease-in-out infinite;
      }
      .orb-2 {
        width: 300px;
        height: 300px;
        background: rgba(129, 140, 248, 0.08);
        bottom: -80px;
        left: -80px;
        animation: float 16s ease-in-out infinite reverse;
      }

      @keyframes float {
        0%,
        100% {
          transform: translate(0, 0) scale(1);
        }
        33% {
          transform: translate(20px, -20px) scale(1.05);
        }
        66% {
          transform: translate(-10px, 15px) scale(0.97);
        }
      }

      /* Card */
      .auth-card {
        position: relative;
        z-index: 10;
        width: 100%;
        max-width: 420px;
        background: rgba(10, 15, 28, 0.92);
        border: 1px solid rgba(79, 70, 229, 0.25);
        border-top: 2px solid #4f46e5;
        backdrop-filter: blur(20px);
        padding: 2.5rem 2rem;
        animation: cardReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      @keyframes cardReveal {
        from {
          opacity: 0;
          transform: translateY(24px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* Brand */
      .brand {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        margin-bottom: 2rem;
      }
      .brand-anchor {
        font-size: 1.375rem;
        line-height: 1;
        filter: drop-shadow(0 0 6px rgba(79, 70, 229, 0.6));
      }
      .brand-name {
        font-family: var(--font-mono, 'JetBrains Mono', monospace);
        font-size: 0.875rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        color: #818cf8;
      }

      /* Corner label */
      .corner-label {
        position: absolute;
        bottom: 1.25rem;
        right: 1.5rem;
        opacity: 0.2;
      }
      .corner-text {
        font-family: var(--font-mono, monospace);
        font-size: 0.625rem;
        letter-spacing: 0.15em;
        color: #818cf8;
        text-transform: uppercase;
      }
    `,
  ],
})
export class AuthLayoutComponent {
  themeService = inject(ThemeService);
}
