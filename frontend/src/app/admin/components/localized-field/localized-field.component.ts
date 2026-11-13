import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import type { LocalizedText } from '../../../core/models';
import { adminT } from '../../admin-i18n';

let nextId = 0;

/**
 * Saisie d'un texte en français et en anglais, côte à côte.
 * Champ facultatif : tout vider enregistre « pas de texte » (null).
 */
@Component({
  selector: 'app-localized-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './localized-field.component.html',
  styleUrl: './localized-field.component.scss',
})
export class LocalizedFieldComponent {
  readonly value = model<LocalizedText | null>(null);
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly multiline = input(false);
  readonly required = input(false);
  protected readonly t = adminT();
  protected readonly id = `lf-${nextId++}`;
  protected readonly langs = ['fr', 'en'] as const;
  protected readonly current = computed(() => this.value() ?? { fr: '', en: '' });

  protected set(lang: 'fr' | 'en', event: Event): void {
    const next = { ...this.current(), [lang]: (event.target as HTMLInputElement).value };
    this.value.set(!this.required() && !next.fr.trim() && !next.en.trim() ? null : next);
  }
}
