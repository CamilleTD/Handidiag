import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import type { LocalizedText } from '../../core/models';
import { adminT } from '../admin-i18n';

let nextId = 0;

/**
 * Saisie d'un texte en français et en anglais, côte à côte.
 * Champ facultatif : tout vider enregistre « pas de texte » (null).
 */
@Component({
  selector: 'app-localized-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="lang-pair">
      <legend>
        {{ label() }}
        @if (required()) {
          <span aria-hidden="true"> *</span>
        }
      </legend>
      @if (hint()) {
        <p class="hint" [id]="id + '-hint'">{{ hint() }}</p>
      }
      @for (lang of langs; track lang) {
        <div class="lang-row">
          <label class="lang-code" [for]="id + '-' + lang" [title]="t('field.lang_' + lang)">{{
            lang.toUpperCase()
          }}</label>
          @if (multiline()) {
            <textarea
              class="text-input"
              [id]="id + '-' + lang"
              [attr.lang]="lang"
              [attr.aria-label]="label() + ' (' + t('field.lang_' + lang) + ')'"
              [attr.aria-describedby]="hint() ? id + '-hint' : null"
              [required]="required() && lang === 'fr'"
              [value]="current()[lang]"
              (input)="set(lang, $event)"
            ></textarea>
          } @else {
            <input
              class="text-input"
              [id]="id + '-' + lang"
              [attr.lang]="lang"
              [attr.aria-label]="label() + ' (' + t('field.lang_' + lang) + ')'"
              [attr.aria-describedby]="hint() ? id + '-hint' : null"
              [required]="required() && lang === 'fr'"
              [value]="current()[lang]"
              (input)="set(lang, $event)"
            />
          }
        </div>
      }
    </fieldset>
  `,
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
