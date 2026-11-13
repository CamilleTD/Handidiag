import { Injectable, inject, signal } from '@angular/core';
import { ContentService } from './content.service';
import { I18nService } from './i18n.service';

/** Chargement initial : textes de l'interface et contenu publié. */
@Injectable({ providedIn: 'root' })
export class AppState {
  private readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  readonly ready = signal(false);
  readonly failed = signal(false);

  async load(): Promise<void> {
    try {
      await Promise.all([this.i18n.load(), this.content.load()]);
      this.ready.set(true);
    } catch {
      this.failed.set(true);
    }
  }
}
