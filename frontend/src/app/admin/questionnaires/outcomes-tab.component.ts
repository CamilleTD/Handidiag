import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../../shared/icon.component';
import { OutcomeRow, Payload } from '../admin-api.service';
import { adminT, adminText } from '../admin-i18n';
import { LocalizedFieldComponent } from '../components/localized-field.component';
import { PickListComponent } from '../components/pick-list.component';
import { BuilderStore } from './builder.store';

type Draft = Payload<OutcomeRow>;
const ICONS = ['book', 'chat', 'clock', 'badge', 'user', 'building', 'shield', 'doc', 'compass'];

/** Résultats possibles : par seuil de score, ou imposés par une règle. */
@Component({
  selector: 'app-outcomes-tab',
  imports: [NgTemplateOutlet, IconComponent, LocalizedFieldComponent, PickListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="hint">{{ t('builder.outcomes_intro') }}</p>
    @if (store.detail(); as d) {
      <ol class="item-list">
        @for (
          outcome of d.outcomes;
          track outcome.id;
          let i = $index;
          let first = $first;
          let last = $last
        ) {
          <li class="item" [class.is-open]="editing() === outcome.id">
            <div>
              <p class="item-title">{{ text(outcome.title) }}</p>
              <p>{{ text(outcome.body) }}</p>
              <div class="item-meta">
                <span class="key">{{ outcome.key }}</span>
                <span class="tag">
                  {{
                    outcome.min_score === null
                      ? t('builder.imposed_only')
                      : t('builder.score_from', { n: outcome.min_score })
                  }}
                </span>
                @if (outcome.next_questionnaire) {
                  <span class="tag is-quiet">{{
                    t('builder.then', { q: outcome.next_questionnaire })
                  }}</span>
                }
                @if (outcome.contacts.length) {
                  <span class="tag is-quiet">{{
                    t('rules.n_contacts', { n: outcome.contacts.length })
                  }}</span>
                }
              </div>
            </div>
            <div class="item-actions">
              <button type="button" class="btn btn-small" (click)="open(outcome)">
                {{ t('common.edit') }}
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="t('common.move_up') + ' : ' + outcome.key"
                [disabled]="first"
                (click)="move(i, -1)"
              >
                <app-icon name="up" />
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="t('common.move_down') + ' : ' + outcome.key"
                [disabled]="last"
                (click)="move(i, 1)"
              >
                <app-icon name="down" />
              </button>
              <button
                type="button"
                class="btn btn-small btn-quiet"
                [attr.aria-label]="t('common.delete') + ' : ' + outcome.key"
                (click)="remove(outcome)"
              >
                <app-icon name="trash" />
              </button>
            </div>
            @if (editing() === outcome.id) {
              <div style="grid-column: 1 / -1"><ng-container [ngTemplateOutlet]="form" /></div>
            }
          </li>
        }
      </ol>
      @if (editing() === 0) {
        <ng-container [ngTemplateOutlet]="form" />
      } @else {
        <button type="button" class="btn" (click)="open(null)">
          <app-icon name="plus" /> {{ t('builder.add_outcome') }}
        </button>
      }
    }

    <ng-template #form>
      @if (draft(); as d) {
        <form class="form-section" (submit)="$event.preventDefault(); save()" novalidate>
          <div class="form-grid three">
            <div class="field">
              <label for="o-key">{{ t('common.key') }}</label>
              <input
                id="o-key"
                class="text-input key"
                [value]="d.key"
                [readonly]="editing() !== 0"
                (input)="patch({ key: $any($event.target).value })"
              />
            </div>
            <div class="field">
              <label for="o-min">{{ t('builder.min_score') }}</label>
              <input
                id="o-min"
                class="text-input"
                type="number"
                aria-describedby="o-min-hint"
                [value]="d.min_score ?? ''"
                (input)="setMin($any($event.target).value)"
              />
              <p id="o-min-hint" class="hint">{{ t('builder.min_score_hint') }}</p>
            </div>
            <div class="field">
              <label for="o-icon">{{ t('common.icon') }}</label>
              <select id="o-icon" (change)="patch({ icon: $any($event.target).value })">
                @for (icon of icons; track icon) {
                  <option [value]="icon" [selected]="icon === d.icon">{{ icon }}</option>
                }
              </select>
            </div>
          </div>
          <div class="form-grid">
            <app-localized-field
              [label]="t('builder.outcome_title')"
              [required]="true"
              [value]="d.title"
              (valueChange)="patch({ title: $event! })"
            />
            <app-localized-field
              [label]="t('builder.outcome_body')"
              [required]="true"
              [multiline]="true"
              [value]="d.body"
              (valueChange)="patch({ body: $event! })"
            />
            <app-localized-field
              [label]="t('builder.outcome_falc')"
              [multiline]="true"
              [value]="d.body_falc"
              (valueChange)="patch({ body_falc: $event })"
            />
            <div class="field">
              <label for="o-next">{{ t('builder.next_questionnaire') }}</label>
              <select
                id="o-next"
                aria-describedby="o-next-hint"
                (change)="patch({ next_questionnaire: $any($event.target).value || null })"
              >
                <option value="" [selected]="!d.next_questionnaire">
                  {{ t('builder.next_none') }}
                </option>
                @for (q of others(); track q.key) {
                  <option [value]="q.key" [selected]="q.key === d.next_questionnaire">
                    {{ text(q.title) }}
                  </option>
                }
              </select>
              <p id="o-next-hint" class="hint">{{ t('builder.next_hint') }}</p>
            </div>
          </div>
          <app-pick-list
            [label]="t('builder.outcome_contacts')"
            [hint]="t('builder.outcome_contacts_hint')"
            [ordered]="true"
            [items]="contactItems()"
            [selected]="d.contacts"
            (selectedChange)="patch({ contacts: $event })"
          />
          <div class="actions">
            <button type="submit" class="btn btn-primary" [disabled]="store.busy()">
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
export class OutcomesTabComponent {
  protected readonly store = inject(BuilderStore);
  protected readonly t = adminT();
  protected readonly text = adminText();
  protected readonly icons = ICONS;
  /** Résultat ouvert : son id, 0 pour un nouveau, null si aucun. */
  protected readonly editing = signal<number | null>(null);
  protected readonly draft = signal<Draft | null>(null);
  protected readonly others = computed(() =>
    this.store.questionnaires().filter((q) => q.key !== this.store.detail()?.key),
  );
  protected readonly contactItems = computed(() =>
    this.store.contacts().map((c) => ({ key: c.key, label: this.text(c.name) })),
  );

  protected open(outcome: OutcomeRow | null): void {
    if (outcome) {
      const { id: _id, ...draft } = outcome;
      this.draft.set(draft);
    } else {
      this.draft.set({
        key: '',
        min_score: null,
        icon: 'book',
        title: { fr: '', en: '' },
        body: { fr: '', en: '' },
        body_falc: null,
        next_questionnaire: null,
        contacts: [],
      });
    }
    this.editing.set(outcome?.id ?? 0);
  }

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  protected setMin(raw: string): void {
    this.patch({ min_score: raw === '' ? null : Number(raw) });
  }

  protected async save(): Promise<void> {
    const id = this.editing();
    const ok = id
      ? await this.store.change('put', `/outcomes/${id}`, this.draft())
      : await this.store.change('post', '/outcomes', this.draft());
    if (ok) this.editing.set(null);
  }

  protected async remove(outcome: OutcomeRow): Promise<void> {
    await this.store.change('delete', `/outcomes/${outcome.id}`);
  }

  protected async move(index: number, delta: number): Promise<void> {
    const ids = this.store.detail()!.outcomes.map((o) => o.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    await this.store.change('post', '/outcomes/reorder', { ids });
  }
}
