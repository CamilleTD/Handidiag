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
import { IconComponent } from '../../shared/icon.component';
import {
  AdminApi,
  AdminLevel,
  AdminQuestion,
  AdminRule,
  AdminTextItem,
  Payload,
} from '../admin-api.service';
import { emptyLeaf } from '../conditions';
import { ConditionFieldComponent } from '../components/condition-field.component';
import { LocalizedFieldComponent } from '../components/localized-field.component';

type Draft = Payload<AdminRule>;

@Component({
  imports: [RouterLink, IconComponent, LocalizedFieldComponent, ConditionFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rule-editor.page.html',
})
export class RuleEditorPage {
  private readonly api = inject(AdminApi);
  private readonly content = inject(ContentService);
  private readonly router = inject(Router);
  readonly id = input.required<string>();

  protected readonly isNew = computed(() => this.id() === 'new');
  protected readonly draft = signal<Draft | null>(null);
  protected readonly questions = signal<AdminQuestion[]>([]);
  protected readonly levels = signal<AdminLevel[]>([]);
  protected readonly flags = signal<AdminTextItem[]>([]);
  protected readonly suggestions = signal<AdminTextItem[]>([]);
  protected readonly suggestionFilter = signal('');
  protected readonly message = signal('');
  protected readonly failed = signal(false);
  protected readonly saving = signal(false);
  protected readonly confirmDelete = signal(false);

  protected readonly shownSuggestions = computed(() => {
    const needle = this.suggestionFilter().trim().toLowerCase();
    const chosen = new Set(this.draft()?.suggestions ?? []);
    return this.suggestions().filter(
      (s) =>
        !needle ||
        chosen.has(s.key) ||
        s.key.toLowerCase().includes(needle) ||
        s.text.fr.toLowerCase().includes(needle),
    );
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.load(id));
    });
  }

  private async load(id: string): Promise<void> {
    try {
      const [rules, questions, levels, flags, suggestions] = await Promise.all([
        this.api.list<AdminRule>('rules'),
        this.api.list<AdminQuestion>('questions'),
        this.api.list<AdminLevel>('levels'),
        this.api.list<AdminTextItem>('flags'),
        this.api.list<AdminTextItem>('suggestions'),
      ]);
      this.questions.set(questions);
      this.levels.set(levels);
      this.flags.set(flags);
      this.suggestions.set(suggestions);
      const existing = rules.find((r) => String(r.id) === id);
      if (id !== 'new' && !existing) throw new Error('Règle introuvable.');
      if (existing) {
        const { id: _id, position: _position, ...draft } = existing;
        this.draft.set(draft);
      } else {
        this.draft.set({
          key: 'R_',
          condition: emptyLeaf(questions),
          points: 1,
          override_level: null,
          pole_outcome: null,
          explanation: null,
          flags: [],
          suggestions: [],
        });
      }
    } catch (error) {
      this.fail(error);
    }
  }

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected toggle(list: 'flags' | 'suggestions', key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.draft()?.[list] ?? [];
    this.patch({ [list]: checked ? [...current, key] : current.filter((k) => k !== key) });
  }

  protected async save(): Promise<void> {
    const draft = this.draft();
    if (!draft) return;
    this.saving.set(true);
    try {
      const saved = this.isNew()
        ? await this.api.create<AdminRule>('rules', draft)
        : await this.api.update<AdminRule>('rules', Number(this.id()), draft);
      this.failed.set(false);
      this.message.set('Règle enregistrée. Elle s’applique immédiatement.');
      void this.content.load();
      if (this.isNew()) void this.router.navigate(['/admin/rules', saved.id], { replaceUrl: true });
    } catch (error) {
      this.fail(error);
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    this.confirmDelete.set(false);
    try {
      await this.api.remove('rules', Number(this.id()));
      void this.content.load();
      void this.router.navigateByUrl('/admin/rules');
    } catch (error) {
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    this.failed.set(true);
    this.message.set((error as Error).message);
  }
}
