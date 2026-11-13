import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { ResourceSection } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { Collection, Payload, ResourceRow } from '../admin-api.service';
import { adminT } from '../admin-i18n';
import { LocalizedFieldComponent } from '../components/localized-field.component';
import { EditableList } from '../messages/editable-list';

type Draft = Payload<ResourceRow>;
const SECTIONS: ResourceSection[] = ['official', 'public', 'association', 'law'];

/** Liste éditable des ressources d'une rubrique. */
@Component({
  selector: 'app-resource-list',
  imports: [NgTemplateOutlet, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <span></span>
      <button type="button" class="btn btn-primary" (click)="open('new')">
        <app-icon name="plus" /> {{ t('common.add') }}
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
        <li class="item" [class.is-open]="editing() === item.id">
          @if (editing() === item.id) {
            <div style="grid-column: 1 / -1"><ng-container *ngTemplateOutlet="form" /></div>
          } @else {
            <div>
              <p class="item-title">{{ text(item.title) }}</p>
              <p>{{ text(item.description) }}</p>
              <div class="item-meta">
                <span class="key">{{ item.key }}</span>
                @if (!item.is_published) {
                  <span class="tag is-sun">{{ t('resources.hidden') }}</span>
                }
                @if (!item.title.en) {
                  <span class="tag is-sun">{{ t('common.missing_en') }}</span>
                }
                @if (item.url) {
                  <span class="tag is-quiet">{{ item.url }}</span>
                }
              </div>
            </div>
            <div class="item-actions">
              <button type="button" class="btn btn-small" (click)="open(item.id)">
                {{ t('common.edit') }}
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="t('common.move_up') + ' : ' + item.key"
                [disabled]="busy() || first"
                (click)="moveIn(item, -1)"
              >
                <app-icon name="up" />
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="t('common.move_down') + ' : ' + item.key"
                [disabled]="busy() || last"
                (click)="moveIn(item, 1)"
              >
                <app-icon name="down" />
              </button>
              @if (confirmDelete() === item.id) {
                <button type="button" class="btn btn-small" (click)="remove(item)">
                  {{ t('common.confirm') }}
                </button>
              } @else {
                <button
                  type="button"
                  class="btn btn-small btn-quiet"
                  [attr.aria-label]="t('common.delete') + ' : ' + item.key"
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
              <label for="res-key">{{ t('common.key') }}</label>
              <input
                id="res-key"
                class="text-input key"
                [value]="d.key"
                [readonly]="editing() !== 'new'"
                (input)="patch({ key: value($event) })"
              />
            </div>
            <div class="field">
              <label for="res-url">{{ t('resources.url') }}</label>
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
              [label]="t('resources.res_title')"
              [required]="true"
              [value]="d.title"
              (valueChange)="patch({ title: $event! })"
            />
            <app-localized-field
              [label]="t('resources.description')"
              [required]="true"
              [multiline]="true"
              [value]="d.description"
              (valueChange)="patch({ description: $event! })"
            />
            @if (section() === 'law') {
              <app-localized-field
                [label]="t('resources.reference')"
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
              <span>{{ t('resources.published') }}</span>
            </label>
          </div>
          <div class="actions">
            <button type="submit" class="btn btn-primary" [disabled]="busy()">
              {{ t('common.save') }}
            </button>
            <button type="button" class="btn btn-quiet" (click)="editing.set(null)">
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>
      }
    </ng-template>
  `,
})
export class ResourceList extends EditableList<ResourceRow> {
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
  protected async moveIn(item: ResourceRow, delta: number): Promise<void> {
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
      this.items.set(await this.api.list<ResourceRow>('resources'));
      this.done(this.t('common.moved', { key: item.key }));
    });
  }
}

@Component({
  imports: [ResourceList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>{{ t('resources.title') }}</h1>
    <div class="tabs" role="tablist" [attr.aria-label]="t('resources.sections')">
      @for (s of sections; track s) {
        <button
          type="button"
          role="tab"
          [id]="'tab-' + s"
          [attr.aria-selected]="section() === s"
          [attr.aria-controls]="'panel-' + s"
          (click)="section.set(s)"
        >
          {{ t('resources.section_' + s) }}
        </button>
      }
    </div>
    @for (s of sections; track s) {
      @if (section() === s) {
        <div role="tabpanel" [id]="'panel-' + s" [attr.aria-labelledby]="'tab-' + s">
          <p class="hint">{{ t('resources.hint_' + s) }}</p>
          <app-resource-list [section]="s" />
        </div>
      }
    }
  `,
})
export class ResourcesAdminPage {
  protected readonly t = adminT();
  protected readonly sections = SECTIONS;
  protected readonly section = signal<ResourceSection>('official');
}
