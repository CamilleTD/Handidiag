import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { LocalizedText } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { AdminTextItem } from '../admin-api.service';
import { LocalizedFieldComponent } from '../components/localized-field.component';
import { EditableList } from './editable-list';

/** Points d'attention (flags) ou pistes (suggestions) : une clé et un texte bilingue. */
@Component({
  selector: 'app-text-items-editor',
  imports: [NgTemplateOutlet, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="hint">{{ intro() }}</p>
    <div class="toolbar">
      <label class="sr-only" [for]="kind() + '-filter'">Filtrer</label>
      <input
        [id]="kind() + '-filter'"
        class="text-input"
        type="search"
        placeholder="Filtrer…"
        (input)="filter.set(value($event))"
      />
      <button type="button" class="btn btn-primary" (click)="open('new')">
        <app-icon name="plus" /> Ajouter
      </button>
    </div>
    @if (message()) {
      <p class="status" [class.is-error]="failed()" role="status">{{ message() }}</p>
    }
    @if (editing() === 'new') {
      <ng-container *ngTemplateOutlet="form" />
    }
    <ol class="item-list">
      @for (item of shown(); track item.id) {
        <li class="item">
          @if (editing() === item.id) {
            <div style="grid-column: 1 / -1"><ng-container *ngTemplateOutlet="form" /></div>
          } @else {
            <div>
              <p>{{ item.text.fr }}</p>
              <div class="item-meta">
                <span class="key">{{ item.key }}</span>
                @if (!item.text.en) {
                  <span class="tag is-sun">Anglais manquant</span>
                }
              </div>
            </div>
            <div class="item-actions">
              <button type="button" class="btn btn-small" (click)="open(item.id)">Modifier</button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="'Monter ' + item.key"
                [disabled]="busy() || !!filter()"
                (click)="move(item, -1)"
              >
                <app-icon name="up" />
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="'Descendre ' + item.key"
                [disabled]="busy() || !!filter()"
                (click)="move(item, 1)"
              >
                <app-icon name="down" />
              </button>
              @if (confirmDelete() === item.id) {
                <button type="button" class="btn btn-small" (click)="remove(item)">
                  Confirmer
                </button>
              } @else {
                <button
                  type="button"
                  class="btn btn-small btn-quiet"
                  [attr.aria-label]="'Supprimer ' + item.key"
                  (click)="confirmDelete.set(item.id)"
                >
                  <app-icon name="trash" />
                </button>
              }
            </div>
          }
        </li>
      }
    </ol>

    <ng-template #form>
      <form class="form-section" (submit)="$event.preventDefault(); submit()" novalidate>
        <div class="form-grid">
          @if (editing() === 'new') {
            <div class="field">
              <label [for]="kind() + '-key'">Clé technique</label>
              <input
                [id]="kind() + '-key'"
                class="text-input key"
                [value]="draftKey()"
                (input)="draftKey.set(value($event))"
              />
            </div>
          }
          <app-localized-field
            label="Texte"
            [required]="true"
            [multiline]="true"
            [value]="draftText()"
            (valueChange)="draftText.set($event)"
          />
        </div>
        <div class="actions">
          <button type="submit" class="btn btn-primary" [disabled]="busy()">Enregistrer</button>
          <button type="button" class="btn btn-quiet" (click)="editing.set(null)">Annuler</button>
        </div>
      </form>
    </ng-template>
  `,
})
export class TextItemsEditor extends EditableList<AdminTextItem> {
  readonly kind = input.required<'flags' | 'suggestions'>({ alias: 'collection' });
  readonly intro = input('');
  protected get collection() {
    return this.kind();
  }
  protected readonly filter = signal('');
  protected readonly draftKey = signal('');
  protected readonly draftText = signal<LocalizedText | null>(null);
  protected readonly shown = computed(() => {
    const needle = this.filter().trim().toLowerCase();
    return this.items().filter(
      (i) =>
        !needle || i.key.toLowerCase().includes(needle) || i.text.fr.toLowerCase().includes(needle),
    );
  });

  protected open(id: number | 'new'): void {
    const item = this.items().find((i) => i.id === id);
    this.draftKey.set(item?.key ?? '');
    this.draftText.set(item?.text ?? null);
    this.message.set('');
    this.editing.set(id);
  }

  protected submit(): void {
    const id = this.editing();
    if (id === null) return;
    void this.save(id, { key: this.draftKey(), text: this.draftText() ?? { fr: '', en: '' } });
  }
}
