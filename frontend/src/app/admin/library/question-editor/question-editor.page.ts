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
import type { LocalizedText, QuestionOption } from '../../../core/models';
import { IconComponent } from '../../../shared/icon/icon.component';
import { AdminApi, BankQuestion, Payload } from '../../admin-api.service';
import { RepublishPanelComponent } from '../../components/republish-panel/republish-panel.component';
import { adminT } from '../../admin-i18n';
import { LocalizedFieldComponent } from '../../components/localized-field/localized-field.component';

type Draft = Omit<Payload<BankQuestion>, 'options'>;
interface OptionDraft extends QuestionOption {
  /** Réponse déjà enregistrée : sa clé ne change plus (des conditions peuvent la citer). */
  saved: boolean;
}

@Component({
  imports: [RouterLink, IconComponent, LocalizedFieldComponent, RepublishPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './question-editor.page.html',
  styleUrl: './question-editor.page.scss',
})
export class QuestionEditorPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  protected readonly t = adminT();
  readonly id = input.required<string>();

  protected readonly isNew = computed(() => this.id() === 'new');
  protected readonly draft = signal<Draft | null>(null);
  protected readonly options = signal<OptionDraft[]>([]);
  protected readonly usedIn = signal<string[]>([]);
  /** Questionnaires à republier après un enregistrement (élément partagé). */
  protected readonly republish = signal<string[]>([]);
  protected readonly message = signal('');
  protected readonly failed = signal(false);
  protected readonly saving = signal(false);
  protected readonly confirmDelete = signal(false);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.load(id));
    });
  }

  private async load(id: string): Promise<void> {
    if (id === 'new') {
      this.draft.set({
        key: '',
        kind: 'single',
        text: { fr: '', en: '' },
        text_falc: null,
        help: null,
      });
      this.options.set([
        { key: 'yes', exclusive: false, label: { fr: 'Oui', en: 'Yes' }, saved: false },
        { key: 'no', exclusive: false, label: { fr: 'Non', en: 'No' }, saved: false },
      ]);
      return;
    }
    try {
      const question = (await this.api.list<BankQuestion>('questions')).find(
        (q) => String(q.id) === id,
      );
      if (!question) throw new Error(this.t('errors.not_found'));
      const { id: _id, used_in, options, ...draft } = question;
      this.draft.set(draft);
      this.usedIn.set(used_in);
      this.options.set(options.map((o) => ({ ...o, saved: true })));
    } catch (error) {
      this.fail(error);
    }
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
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
    [list[index], list[index + delta]] = [list[index + delta], list[index]];
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
        ? await this.api.create<BankQuestion>('questions', body)
        : await this.api.update<BankQuestion>('questions', Number(this.id()), body);
      this.failed.set(false);
      this.message.set(this.t(saved.used_in.length ? 'questions.saved_used' : 'common.saved'));
      this.usedIn.set(saved.used_in);
      this.republish.set(saved.used_in);
      if (this.isNew())
        void this.router.navigate(['/admin/library/questions', saved.id], { replaceUrl: true });
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
      void this.router.navigateByUrl('/admin/library/questions');
    } catch (error) {
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    this.failed.set(true);
    this.message.set((error as Error).message);
  }
}
