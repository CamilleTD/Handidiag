import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18nService } from './i18n.service';

/**
 * Titre unique pour chaque écran (WCAG 2.4.2). La propriété `title` d'une route est une clé de
 * traduction ; une page peut préciser un préfixe (ex. « Question 3 sur 12 »).
 */
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18nService);
  private readonly key = signal<string | undefined>(undefined);
  readonly prefix = signal('');

  constructor() {
    super();
    // Le titre suit aussi le changement de langue
    effect(() => {
      const key = this.key();
      const parts = [
        this.prefix(),
        key ? this.i18n.t(key) : '',
        this.i18n.t('ui.page_title_suffix'),
      ];
      this.title.setTitle(parts.filter(Boolean).join(' – '));
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.prefix.set('');
    this.key.set(this.buildTitle(snapshot));
  }
}
