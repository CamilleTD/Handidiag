import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ContentService } from '../../core/content.service';
import type { LocalizedText, Question, QuestionOption } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { AdminApi, AdminQuestion, Payload } from '../admin-api.service';
import { ConditionFieldComponent } from '../components/condition-field.component';
import { LocalizedFieldComponent } from '../components/localized-field.component';

type Draft = Omit<Payload<AdminQuestion>, 'options'>;
interface OptionDraft extends QuestionOption {
  /** Réponse déjà enregistrée : sa clé ne change plus (des conditions peuvent la citer). */
  saved: boolean;
}

const KEY_HINT = 'Lettres, chiffres et « _ », sans espace. Ne peut plus être modifiée ensuite.';

@Component({
  imports: [RouterLink, IconComponent, LocalizedFieldComponent, ConditionFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './question-editor.page.html',
})
export class QuestionEditorPage {
  private readonly api = inject(AdminApi);
  private readonly content = inject(ContentService);
  private readonly router = inject(Router);
  readonly id = input.required<string>();

  protected readonly keyHint = KEY_HINT;
  protected readonly isNew = computed(() => this.id() === 'new');
  protected readonly all = signal<AdminQuestion[]>([]);
  protected readonly draft = signal<Draft | null>(null);
  protected readonly options = signal<OptionDraft[]>([]);
  protected readonly message = signal('');
  protected readonly failed = signal(false);
  protected readonly saving = signal(false);
  protected readonly confirmDelete = signal(false);

  /** Questions disponibles dans les conditions, dont celle en cours d'édition. */
  protected readonly catalog = computed<Question[]>(() => {
    const draft = this.draft();
    const others = this.all().filter((q) => String(q.id) !== this.id());
    return draft ? [...others, { ...draft, options: this.options() }] : others;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.load(id));
    });
  }

  private async load(id: string): Promise<void> {
    try {
      const all = await this.api.list<AdminQuestion>('questions');
      this.all.set(all);
      const existing = all.find((q) => String(q.id) === id);
      if (id !== 'new' && !existing) throw new Error('Question introuvable.');
      const { id: _id, position: _position, options, ...draft } = existing ?? this.blank();
      this.draft.set(draft);
      this.options.set(options.map((o) => ({ ...o, saved: !!existing })));
    } catch (error) {
      this.fail(error);
    }
  }

  private blank(): AdminQuestion {
    return {
      id: 0,
      position: 0,
      key: '',
      kind: 'single',
      phase: 'core',
      step: null,
      required: false,
      hidden: false,
      auto_answer: null,
      show_if: null,
      stop_if: null,
      tracks: [],
      text: { fr: '', en: '' },
      text_falc: null,
      help: null,
      options: [
        { key: 'yes', exclusive: false, label: { fr: 'Oui', en: 'Yes' } },
        { key: 'no', exclusive: false, label: { fr: 'Non', en: 'No' } },
      ],
    };
  }

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected setTracks(raw: string): void {
    this.patch({
      tracks: raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }

  protected patchOption(index: number, change: Partial<OptionDraft>): void {
    this.options.update((list) => list.map((o, i) => (i === index ? { ...o, ...change } : o)));
  }

  protected setOptionLabel(index: number, label: LocalizedText | null): void {
    this.patchOption(index, { label: label ?? { fr: '', en: '' } });
  }

  protected addOption(): void {
    const n = this.options().length + 1;
    this.options.update((list) => [
      ...list,
      { key: `option_${n}`, exclusive: false, label: { fr: '', en: '' }, saved: false },
    ]);
  }

  protected moveOption(index: number, delta: number): void {
    const list = [...this.options()];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.options.set(list);
  }

  protected removeOption(index: number): void {
    this.options.update((list) => list.filter((_, i) => i !== index));
  }

  protected async save(): Promise<void> {
    const draft = this.draft();
    if (!draft) return;
    const body = { ...draft, options: this.options().map(({ saved: _saved, ...o }) => o) };
    this.saving.set(true);
    try {
      const saved = this.isNew()
        ? await this.api.create<AdminQuestion>('questions', body)
        : await this.api.update<AdminQuestion>('questions', Number(this.id()), body);
      this.failed.set(false);
      this.message.set('Question enregistrée. Elle est en ligne immédiatement.');
      void this.content.load();
      if (this.isNew())
        void this.router.navigate(['/admin/questions', saved.id], { replaceUrl: true });
      else this.options.update((list) => list.map((o) => ({ ...o, saved: true })));
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    this.confirmDelete.set(false);
    try {
      await this.api.remove('questions', Number(this.id()));
      void this.content.load();
      void this.router.navigateByUrl('/admin/questions');
    } catch (error) {
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    this.failed.set(true);
    this.message.set((error as Error).message);
  }
}
