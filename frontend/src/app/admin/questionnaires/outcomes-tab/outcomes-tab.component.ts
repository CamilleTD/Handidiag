import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon.component';
import { OutcomeRow, Payload } from '../../admin-api.service';
import { adminT, adminText } from '../../admin-i18n';
import { LocalizedFieldComponent } from '../../components/localized-field/localized-field.component';
import { PickListComponent } from '../../components/pick-list/pick-list.component';
import { BuilderStore } from '../builder.store';

type Draft = Payload<OutcomeRow>;
const ICONS = ['book', 'chat', 'clock', 'badge', 'user', 'building', 'shield', 'doc', 'compass'];

/** Résultats possibles : par seuil de score, ou imposés par une règle. */
@Component({
  selector: 'app-outcomes-tab',
  imports: [NgTemplateOutlet, IconComponent, LocalizedFieldComponent, PickListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './outcomes-tab.component.html',
  styleUrl: './outcomes-tab.component.scss',
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
