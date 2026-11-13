import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ContentService } from '../../core/content.service';
import { IconComponent } from '../../shared/icon.component';
import { AdminContact, Collection, Payload } from '../admin-api.service';
import { LocalizedFieldComponent } from '../components/localized-field.component';
import { EditableList } from './editable-list';

type Draft = Payload<AdminContact>;
const ICONS = ['user', 'building', 'shield', 'doc', 'compass', 'book', 'chat', 'clock', 'badge'];

/** Interlocuteurs proposés dans la restitution, par profil. */
@Component({
  selector: 'app-contacts-editor',
  imports: [NgTemplateOutlet, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="hint">
      Chaque interlocuteur est proposé aux profils cochés. Ceux tenus au secret médical passent en
      premier quand la personne craint le regard des autres ; ceux du pôle handicap apparaissent
      aussi dans la section dédiée.
    </p>
    <div class="toolbar">
      <span></span>
      <button type="button" class="btn btn-primary" (click)="open('new')">
        <app-icon name="plus" /> Ajouter un interlocuteur
      </button>
    </div>
    @if (message()) {
      <p class="status" [class.is-error]="failed()" role="status">{{ message() }}</p>
    }
    @if (editing() === 'new') {
      <ng-container *ngTemplateOutlet="form" />
    }
    <ol class="item-list">
      @for (contact of items(); track contact.id) {
        <li class="item">
          @if (editing() === contact.id) {
            <div style="grid-column: 1 / -1"><ng-container *ngTemplateOutlet="form" /></div>
          } @else {
            <div>
              <p class="item-title">{{ contact.name.fr }}</p>
              <p>{{ contact.role.fr }}</p>
              <div class="item-meta">
                <span class="key">{{ contact.key }}</span>
                @for (profile of contact.profiles; track profile) {
                  <span class="tag">{{ profileLabel(profile) }}</span>
                }
                @if (!contact.profiles.length) {
                  <span class="tag is-sun">Aucun profil</span>
                }
                @if (contact.is_confidential) {
                  <span class="tag is-quiet">Secret médical</span>
                }
                @if (contact.pole_group) {
                  <span class="tag is-quiet"
                    >Pôle : {{ contact.pole_group === 'school' ? 'études' : 'travail' }}</span
                  >
                }
                @if (contact.email) {
                  <span class="tag is-quiet">{{ contact.email }}</span>
                }
              </div>
            </div>
            <div class="item-actions">
              <button type="button" class="btn btn-small" (click)="open(contact.id)">
                Modifier
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="'Monter ' + contact.key"
                [disabled]="busy()"
                (click)="move(contact, -1)"
              >
                <app-icon name="up" />
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="'Descendre ' + contact.key"
                [disabled]="busy()"
                (click)="move(contact, 1)"
              >
                <app-icon name="down" />
              </button>
              @if (confirmDelete() === contact.id) {
                <button type="button" class="btn btn-small" (click)="remove(contact)">
                  Confirmer
                </button>
              } @else {
                <button
                  type="button"
                  class="btn btn-small btn-quiet"
                  [attr.aria-label]="'Supprimer ' + contact.key"
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
              <label for="ct-key">Clé technique</label>
              <input
                id="ct-key"
                class="text-input key"
                [value]="d.key"
                [readonly]="editing() !== 'new'"
                (input)="patch({ key: value($event) })"
              />
            </div>
            <div class="field">
              <label for="ct-email">E-mail (facultatif)</label>
              <input
                id="ct-email"
                class="text-input"
                type="email"
                [value]="d.email ?? ''"
                (input)="patch({ email: value($event) || null })"
              />
            </div>
            <div class="field">
              <label for="ct-icon">Pictogramme</label>
              <select id="ct-icon" (change)="patch({ icon: $any(value($event)) })">
                @for (icon of icons; track icon) {
                  <option [value]="icon" [selected]="icon === d.icon">{{ icon }}</option>
                }
              </select>
            </div>
          </div>
          <div class="form-grid">
            <app-localized-field
              label="Nom"
              [required]="true"
              [value]="d.name"
              (valueChange)="patch({ name: $event! })"
            />
            <app-localized-field
              label="Rôle"
              [required]="true"
              [multiline]="true"
              [value]="d.role"
              (valueChange)="patch({ role: $event! })"
            />
            <div class="field">
              <label for="ct-url">Lien (facultatif)</label>
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
                label="Texte du lien"
                [value]="d.link_label"
                (valueChange)="patch({ link_label: $event })"
              />
            }
          </div>
          <div class="form-grid two">
            <fieldset class="lang-pair">
              <legend>Profils concernés</legend>
              @for (profile of profiles(); track profile.key) {
                <label class="check">
                  <input
                    type="checkbox"
                    [checked]="d.profiles.includes(profile.key)"
                    (change)="toggleProfile(profile.key, $event)"
                  />
                  <span>{{ profile.label }}</span>
                </label>
              }
            </fieldset>
            <fieldset class="lang-pair">
              <legend>Particularités</legend>
              <label class="check">
                <input
                  type="checkbox"
                  [checked]="d.is_confidential"
                  (change)="patch({ is_confidential: checked($event) })"
                />
                <span>Tenu au secret médical</span>
              </label>
              <label for="ct-pole">Pôle handicap</label>
              <select id="ct-pole" (change)="patch({ pole_group: $any(value($event) || null) })">
                <option value="" [selected]="!d.pole_group">Ne fait pas partie du pôle</option>
                <option value="school" [selected]="d.pole_group === 'school'">
                  Pôle : études à l'école
                </option>
                <option value="work" [selected]="d.pole_group === 'work'">
                  Pôle : monde du travail
                </option>
              </select>
            </fieldset>
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
export class ContactsEditor extends EditableList<AdminContact> {
  private readonly site = inject(ContentService);
  protected readonly collection: Collection = 'contacts';
  protected readonly icons = ICONS;
  protected readonly draft = signal<Draft | null>(null);
  protected readonly profiles = computed(
    () =>
      this.site
        .content()
        .questions.find((q) => q.key === 'profile')
        ?.options.map((o) => ({ key: o.key, label: o.label.fr })) ?? [],
  );

  protected profileLabel(key: string): string {
    return this.profiles().find((p) => p.key === key)?.label ?? key;
  }

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
        pole_group: null,
        profiles: [],
      });
    }
    this.message.set('');
    this.editing.set(id);
  }

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  protected toggleProfile(key: string, event: Event): void {
    const profiles = this.draft()?.profiles ?? [];
    this.patch({
      profiles: this.checked(event) ? [...profiles, key] : profiles.filter((p) => p !== key),
    });
  }

  protected submit(): void {
    const id = this.editing();
    if (id !== null && this.draft()) void this.save(id, this.draft());
  }
}
