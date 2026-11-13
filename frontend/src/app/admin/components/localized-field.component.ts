import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import type { LocalizedText } from '../../core/models';

let nextId = 0;

/**
 * Saisie d'un texte en français et en anglais, côte à côte.
 * Champ facultatif : vider le français enregistre « pas de texte » (null).
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
      @for (lang of langs; track lang.code) {
        <div class="lang-row">
          <label class="lang-code" [for]="id + '-' + lang.code" [title]="lang.name">{{
            lang.code.toUpperCase()
          }}</label>
          @if (multiline()) {
            <textarea
              class="text-input"
              [id]="id + '-' + lang.code"
              [attr.lang]="lang.code"
              [attr.aria-label]="label() + ' (' + lang.name + ')'"
              [attr.aria-describedby]="hint() ? id + '-hint' : null"
              [required]="required() && lang.code === 'fr'"
              [value]="current()[lang.code]"
              (input)="set(lang.code, $event)"
            ></textarea>
          } @else {
            <input
              class="text-input"
              [id]="id + '-' + lang.code"
              [attr.lang]="lang.code"
              [attr.aria-label]="label() + ' (' + lang.name + ')'"
              [attr.aria-describedby]="hint() ? id + '-hint' : null"
              [required]="required() && lang.code === 'fr'"
              [value]="current()[lang.code]"
              (input)="set(lang.code, $event)"
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
  protected readonly id = `lf-${nextId++}`;
  protected readonly langs = [
    { code: 'fr' as const, name: 'français' },
    { code: 'en' as const, name: 'anglais (facultatif, repli sur le français)' },
  ];
  protected readonly current = computed(() => this.value() ?? { fr: '', en: '' });

  protected set(lang: 'fr' | 'en', event: Event): void {
    const next = { ...this.current(), [lang]: (event.target as HTMLInputElement).value };
    this.value.set(!this.required() && !next.fr.trim() && !next.en.trim() ? null : next);
  }
}
