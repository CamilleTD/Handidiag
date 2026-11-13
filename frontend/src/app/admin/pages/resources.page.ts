import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { ResourceSection } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { AdminResource, Collection, Payload } from '../admin-api.service';
import { LocalizedFieldComponent } from '../components/localized-field.component';
import { EditableList } from '../restitution/editable-list';

type Draft = Payload<AdminResource>;

const SECTIONS: { id: ResourceSection; label: string; hint: string }[] = [
  {
    id: 'official',
    label: 'Kit : liens officiels',
    hint: 'Affichés dans le kit documentaire et son PDF. Les ouvertures sont comptées dans les statistiques.',
  },
  {
    id: 'public',
    label: 'Organismes publics',
    hint: 'Page Ressources, rubrique « Au niveau national ».',
  },
  { id: 'association', label: 'Associations', hint: 'Page Ressources, rubrique « Associations ».' },
  { id: 'law', label: 'Textes de loi', hint: 'Page Ressources, rubrique « Ce que dit la loi ».' },
];

/** Liste éditable des ressources d'une rubrique. */
@Component({
  selector: 'app-resource-list',
  imports: [NgTemplateOutlet, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <span></span>
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
      @for (item of shown(); track item.id; let first = $first; let last = $last) {
        <li class="item">
          @if (editing() === item.id) {
            <div style="grid-column: 1 / -1"><ng-container *ngTemplateOutlet="form" /></div>
          } @else {
            <div>
              <p class="item-title">{{ item.title.fr }}</p>
              <p>{{ item.description.fr }}</p>
              <div class="item-meta">
                <span class="key">{{ item.key }}</span>
                @if (!item.is_published) {
                  <span class="tag is-sun">Masquée</span>
                }
                @if (!item.title.en) {
                  <span class="tag is-sun">Anglais manquant</span>
                }
                @if (item.url) {
                  <span class="tag is-quiet">{{ item.url }}</span>
                }
              </div>
            </div>
            <div class="item-actions">
              <button type="button" class="btn btn-small" (click)="open(item.id)">Modifier</button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="'Monter ' + item.key"
                [disabled]="busy() || first"
                (click)="moveIn(item, -1)"
              >
                <app-icon name="up" />
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="'Descendre ' + item.key"
                [disabled]="busy() || last"
                (click)="moveIn(item, 1)"
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
      @if (draft(); as d) {
        <form class="form-section" (submit)="$event.preventDefault(); submit()" novalidate>
          <div class="form-grid two">
            <div class="field">
              <label for="res-key">Clé technique</label>
              <input
                id="res-key"
                class="text-input key"
                [value]="d.key"
                [readonly]="editing() !== 'new'"
                (input)="patch({ key: value($event) })"
              />
            </div>
            <div class="field">
              <label for="res-url"
                >Adresse du lien {{ section() === 'official' ? '' : '(facultatif)' }}</label
              >
              <input
                id="res-url"
                class="text-input"
                type="url"
                placeholder="https://…"
                [value]="d.url ?? ''"
                (input)="patch({ url: value($event) || null })"
              />
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
              label="Description"
              [required]="true"
              [multiline]="true"
              [value]="d.description"
              (valueChange)="patch({ description: $event! })"
            />
            @if (section() === 'law') {
              <app-localized-field
                label="Référence (ex. article de loi)"
                [value]="d.reference"
                (valueChange)="patch({ reference: $event })"
              />
            }
            <label class="check">
              <input
                type="checkbox"
                [checked]="d.is_published"
                (change)="patch({ is_published: checked($event) })"
              />
              <span>Publiée sur le site</span>
            </label>
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
export class ResourceList extends EditableList<AdminResource> {
  readonly section = input.required<ResourceSection>();
  protected readonly collection: Collection = 'resources';
  protected readonly draft = signal<Draft | null>(null);
  protected readonly shown = computed(() =>
    this.items().filter((i) => i.section === this.section()),
  );

  protected open(id: number | 'new'): void {
    const item = this.items().find((i) => i.id === id);
    if (item) {
      const { id: _id, position: _position, ...draft } = item;
      this.draft.set(draft);
    } else {
      this.draft.set({
        section: this.section(),
        key: '',
        url: null,
        title: { fr: '', en: '' },
        description: { fr: '', en: '' },
        reference: null,
        is_published: true,
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

  /** Réordonnancement au sein de la rubrique. */
  protected async moveIn(item: AdminResource, delta: number): Promise<void> {
    const list = [...this.shown()];
    const index = list.findIndex((i) => i.id === item.id);
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    await this.run(async () => {
      await this.api.reorderResources(
        this.section(),
        list.map((i) => i.id),
      );
      this.items.set(await this.api.list<AdminResource>('resources'));
      this.done(`« ${item.key} » déplacée.`);
    });
  }
}

@Component({
  imports: [ResourceList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Ressources</h1>
    <div class="tabs" role="tablist" aria-label="Rubriques">
      @for (s of sections; track s.id) {
        <button
          type="button"
          role="tab"
          [id]="'tab-' + s.id"
          [attr.aria-selected]="section() === s.id"
          [attr.aria-controls]="'panel-' + s.id"
          (click)="section.set(s.id)"
        >
          {{ s.label }}
        </button>
      }
    </div>
    @for (s of sections; track s.id) {
      @if (section() === s.id) {
        <div role="tabpanel" [id]="'panel-' + s.id" [attr.aria-labelledby]="'tab-' + s.id">
          <p class="hint">{{ s.hint }}</p>
          <app-resource-list [section]="s.id" />
        </div>
      }
    }
  `,
})
export class ResourcesAdminPage {
  protected readonly sections = SECTIONS;
  protected readonly section = signal<ResourceSection>('official');
}
