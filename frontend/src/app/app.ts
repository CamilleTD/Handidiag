import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AppState } from './core/app-state.service';
import { I18nService } from './core/i18n.service';
import { PreferencesService } from './core/preferences.service';
import { VoiceService } from './core/voice.service';
import { IconComponent } from './shared/icon/icon.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:pointermove)': 'moveRuler($event.clientY)',
    '(document:touchmove)': 'moveRuler($event.touches[0]?.clientY)',
    '(document:focusin)': 'followFocus($event.target)',
  },
})
export class App {
  protected readonly state = inject(AppState);
  protected readonly i18n = inject(I18nService);
  protected readonly prefs = inject(PreferencesService);
  private readonly voice = inject(VoiceService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  protected readonly rulerTop = signal(0);
  protected readonly inAdmin = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((event) => {
        this.voice.stop();
        this.inAdmin.set(event.urlAfterRedirects.startsWith('/admin'));
        // Chaque changement d'écran place le focus sur le titre principal (lecteurs d'écran, clavier)
        requestAnimationFrame(() => {
          const heading = this.document.querySelector<HTMLElement>('main h1');
          if (!heading) return;
          heading.tabIndex = -1;
          heading.focus();
          window.scrollTo(0, 0);
        });
      });
  }

  protected toggleLang(): void {
    this.voice.stop();
    void this.i18n.setLang(this.i18n.lang() === 'fr' ? 'en' : 'fr');
  }

  protected moveRuler(y: number | undefined): void {
    if (!this.prefs.value().ruler || y === undefined) return;
    const height = 70;
    this.rulerTop.set(Math.max(0, Math.min(window.innerHeight - height, y - height / 2)));
  }

  protected followFocus(target: EventTarget | null): void {
    if (!(target instanceof Element)) return;
    const box = target.getBoundingClientRect();
    this.moveRuler(box.top + box.height / 2);
  }
}
