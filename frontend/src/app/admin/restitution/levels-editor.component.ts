import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IconComponent } from '../../shared/icon.component';
import { AdminLevel, Collection, Payload } from '../admin-api.service';
import { LocalizedFieldComponent } from '../components/localized-field.component';
import { EditableList } from './editable-list';

type Draft = Payload<AdminLevel>;
const ICONS = ['book', 'chat', 'clock', 'badge', 'user', 'building', 'shield', 'doc', 'compass'];

/** Niveaux d'orientation RQTH : seuil de score, titre et message. */
@Component({
  selector: 'app-levels-editor',
  imports: [NgTemplateOutlet, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="hint">
      Le niveau retenu est le dernier dont le seuil est atteint par le score. Un niveau sans seuil
      n'est attribué que par une règle qui l'impose (ex. « déjà une RQTH »).
    </p>
    <div class="toolbar">
      <span></span>
      <button type="button" class="btn btn-primary" (click)="open('new')">
        <app-icon name="plus" /> Ajouter un niveau
      </button>
    </div>
    @if (message()) {
      <p class="status" [class.is-error]="failed()" role="status">{{ message() }}</p>
    }
    @if (editing() === 'new') {
      <ng-container *ngTemplateOutlet="form" />
    }
    <ol class="item-list">
      @for (level of items(); track level.id) {
        <li class="item">
          @if (editing() === level.id) {
            <div style="grid-column: 1 / -1"><ng-container *ngTemplateOutlet="form" /></div>
          } @else {
            <div>
              <p class="item-title">{{ level.title.fr }}</p>
              <p>{{ level.body.fr }}</p>
              <div class="item-meta">
                <span class="key">{{ level.key }}</span>
                <span class="tag">{{
                  level.min_score === null ? 'Imposé par une règle' : 'Score ≥ ' + level.min_score
                }}</span>
              </div>
            </div>
            <div class="item-actions">
              <button type="button" class="btn btn-small" (click)="open(level.id)">Modifier</button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="'Monter ' + level.key"
                [disabled]="busy()"
                (click)="move(level, -1)"
              >
                <app-icon name="up" />
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="'Descendre ' + level.key"
                [disabled]="busy()"
                (click)="move(level, 1)"
              >
                <app-icon name="down" />
              </button>
              @if (confirmDelete() === level.id) {
                <button type="button" class="btn btn-small" (click)="remove(level)">
                  Confirmer
                </button>
              } @else {
                <button
                  type="button"
                  class="btn btn-small btn-quiet"
                  [attr.aria-label]="'Supprimer ' + level.key"
                  (click)="confirmDelete.set(level.id)"
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
      @if (draft(); as d) {
        <form class="form-section" (submit)="$event.preventDefault(); submit()" novalidate>
          <div class="form-grid three">
            <div class="field">
              <label for="lv-key">Clé technique</label>
              <input
                id="lv-key"
                class="text-input key"
                [value]="d.key"
                [readonly]="editing() !== 'new'"
                (input)="patch({ key: value($event) })"
              />
            </div>
            <div class="field">
              <label for="lv-min">Score minimal (vide : imposé par une règle)</label>
              <input
                id="lv-min"
                class="text-input"
                type="number"
                min="0"
                [value]="d.min_score ?? ''"
                (input)="patch({ min_score: value($event) === '' ? null : +value($event) })"
              />
            </div>
            <div class="field">
              <label for="lv-icon">Pictogramme</label>
              <select id="lv-icon" (change)="patch({ icon: $any(value($event)) })">
                @for (icon of icons; track icon) {
                  <option [value]="icon" [selected]="icon === d.icon">{{ icon }}</option>
                }
              </select>
            </div>
          </div>
          <div class="form-grid">
            <app-localized-field
              label="Titre"
              [required]="true"
              [value]="d.title"
              (valueChange)="patch({ title: $event! })"
            />
            <app-localized-field
              label="Message"
              [required]="true"
              [multiline]="true"
              [value]="d.body"
              (valueChange)="patch({ body: $event! })"
            />
            <app-localized-field
              label="Message simplifié (FALC, facultatif)"
              [multiline]="true"
              [value]="d.body_falc"
              (valueChange)="patch({ body_falc: $event })"
            />
          </div>
          <div class="actions">
            <button type="submit" class="btn btn-primary" [disabled]="busy()">Enregistrer</button>
            <button type="button" class="btn btn-quiet" (click)="editing.set(null)">Annuler</button>
          </div>
        </form>
      }
    </ng-template>
  `,
})
export class LevelsEditor extends EditableList<AdminLevel> {
  protected readonly collection: Collection = 'levels';
  protected readonly icons = ICONS;
  protected readonly draft = signal<Draft | null>(null);

  protected open(id: number | 'new'): void {
    const level = this.items().find((l) => l.id === id);
    if (level) {
      const { id: _id, position: _position, ...draft } = level;
      this.draft.set(draft);
    } else {
      this.draft.set({
        key: '',
        min_score: 0,
        icon: 'book',
        title: { fr: '', en: '' },
        body: { fr: '', en: '' },
        body_falc: null,
      });
    }
    this.message.set('');
    this.editing.set(id);
  }

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  protected submit(): void {
    const id = this.editing();
    if (id !== null && this.draft()) void this.save(id, this.draft());
  }
}
