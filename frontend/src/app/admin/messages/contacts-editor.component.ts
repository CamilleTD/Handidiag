import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IconComponent } from '../../shared/icon.component';
import { Collection, ContactRow, Payload } from '../admin-api.service';
import { LocalizedFieldComponent } from '../components/localized-field.component';
import { EditableList } from './editable-list';

type Draft = Payload<ContactRow>;
const ICONS = ['user', 'building', 'shield', 'doc', 'compass', 'book', 'chat', 'clock', 'badge'];

/** Bibliothèque d'interlocuteurs, proposés par les résultats et les règles. */
@Component({
  selector: 'app-contacts-editor',
  imports: [NgTemplateOutlet, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="hint">{{ t('messages.contacts_intro') }}</p>
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
      @for (contact of items(); track contact.id; let first = $first; let last = $last) {
        <li class="item" [class.is-open]="editing() === contact.id">
          @if (editing() === contact.id) {
            <div style="grid-column: 1 / -1"><ng-container *ngTemplateOutlet="form" /></div>
          } @else {
            <div>
              <p class="item-title">{{ text(contact.name) }}</p>
              <p>{{ text(contact.role) }}</p>
              <div class="item-meta">
                <span class="key">{{ contact.key }}</span>
                @if (contact.is_confidential) {
                  <span class="tag">{{ t('messages.confidential_tag') }}</span>
                }
                @if (contact.group) {
                  <span class="tag is-quiet">{{ t('messages.group_' + contact.group) }}</span>
                }
                @if (contact.email) {
                  <span class="tag is-quiet">{{ contact.email }}</span>
                }
              </div>
            </div>
            <div class="item-actions">
              <button type="button" class="btn btn-small" (click)="open(contact.id)">
                {{ t('common.edit') }}
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="t('common.move_up') + ' : ' + contact.key"
                [disabled]="busy() || first"
                (click)="move(contact, -1)"
              >
                <app-icon name="up" />
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="t('common.move_down') + ' : ' + contact.key"
                [disabled]="busy() || last"
                (click)="move(contact, 1)"
              >
                <app-icon name="down" />
              </button>
              @if (confirmDelete() === contact.id) {
                <button type="button" class="btn btn-small" (click)="remove(contact)">
                  {{ t('common.confirm') }}
                </button>
              } @else {
                <button
                  type="button"
                  class="btn btn-small btn-quiet"
                  [attr.aria-label]="t('common.delete') + ' : ' + contact.key"
                  (click)="confirmDelete.set(contact.id)"
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
              <label for="ct-key">{{ t('common.key') }}</label>
              <input
                id="ct-key"
                class="text-input key"
                [value]="d.key"
                [readonly]="editing() !== 'new'"
                (input)="patch({ key: value($event) })"
              />
            </div>
            <div class="field">
              <label for="ct-email">{{ t('messages.email') }}</label>
              <input
                id="ct-email"
                class="text-input"
                type="email"
                [value]="d.email ?? ''"
                (input)="patch({ email: value($event) || null })"
              />
            </div>
            <div class="field">
              <label for="ct-icon">{{ t('common.icon') }}</label>
              <select id="ct-icon" (change)="patch({ icon: $any(value($event)) })">
                @for (icon of icons; track icon) {
                  <option [value]="icon" [selected]="icon === d.icon">{{ icon }}</option>
                }
              </select>
            </div>
          </div>
          <div class="form-grid">
            <app-localized-field
              [label]="t('messages.name')"
              [required]="true"
              [value]="d.name"
              (valueChange)="patch({ name: $event! })"
            />
            <app-localized-field
              [label]="t('messages.role')"
              [required]="true"
              [multiline]="true"
              [value]="d.role"
              (valueChange)="patch({ role: $event! })"
            />
            <div class="field">
              <label for="ct-url">{{ t('messages.link') }}</label>
              <input
                id="ct-url"
                class="text-input"
                type="url"
                placeholder="https://…"
                [value]="d.link_url ?? ''"
                (input)="patch({ link_url: value($event) || null })"
              />
            </div>
            @if (d.link_url) {
              <app-localized-field
                [label]="t('messages.link_label')"
                [value]="d.link_label"
                (valueChange)="patch({ link_label: $event })"
              />
            }
          </div>
          <div class="form-grid two">
            <label class="check">
              <input
                type="checkbox"
                [checked]="d.is_confidential"
                (change)="patch({ is_confidential: checked($event) })"
              />
              <span>{{ t('messages.confidential') }}</span>
            </label>
            <div class="field">
              <label for="ct-group">{{ t('messages.group') }}</label>
              <select id="ct-group" (change)="patch({ group: $any(value($event) || null) })">
                <option value="" [selected]="!d.group">{{ t('messages.group_none') }}</option>
                @for (group of groups; track group) {
                  <option [value]="group" [selected]="d.group === group">
                    {{ t('messages.group_' + group) }}
                  </option>
                }
              </select>
            </div>
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
export class ContactsEditor extends EditableList<ContactRow> {
  protected readonly collection: Collection = 'contacts';
  protected readonly icons = ICONS;
  protected readonly groups = ['school', 'work', 'other'] as const;
  protected readonly draft = signal<Draft | null>(null);

  protected open(id: number | 'new'): void {
    const contact = this.items().find((c) => c.id === id);
    if (contact) {
      const { id: _id, position: _position, ...draft } = contact;
      this.draft.set(draft);
    } else {
      this.draft.set({
        key: '',
        icon: 'user',
        name: { fr: '', en: '' },
        role: { fr: '', en: '' },
        email: null,
        link_url: null,
        link_label: null,
        is_confidential: false,
        group: null,
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
