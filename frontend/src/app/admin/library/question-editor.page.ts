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
import type { LocalizedText, QuestionOption } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';
import { AdminApi, BankQuestion, Payload } from '../admin-api.service';
import { adminT } from '../admin-i18n';
import { LocalizedFieldComponent } from '../components/localized-field.component';

type Draft = Omit<Payload<BankQuestion>, 'options'>;
interface OptionDraft extends QuestionOption {
  /** Réponse déjà enregistrée : sa clé ne change plus (des conditions peuvent la citer). */
  saved: boolean;
}

@Component({
  imports: [RouterLink, IconComponent, LocalizedFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>
      <a routerLink="/admin/library/questions">← {{ t('questions.back') }}</a>
    </p>
    @if (draft(); as d) {
      <h1>{{ isNew() ? t('questions.new') : d.text.fr || d.key }}</h1>
      @if (usedIn().length) {
        <p class="status">{{ t('questions.used_in', { list: usedIn().join(', ') }) }}</p>
      }
      <form (submit)="$event.preventDefault(); save()" novalidate>
        <section class="form-section">
          <div class="form-grid two">
            <div class="field">
              <label for="q-key">{{ t('common.key') }}</label>
              <input
                id="q-key"
                class="text-input key"
                aria-describedby="q-key-hint"
                [value]="d.key"
                [readonly]="!isNew()"
                (input)="patch({ key: value($event) })"
              />
              <p id="q-key-hint" class="hint">{{ t('common.key_hint') }}</p>
            </div>
            <div class="field">
              <label for="q-kind">{{ t('questions.kind') }}</label>
              <select id="q-kind" (change)="patch({ kind: $any(value($event)) })">
                <option value="single" [selected]="d.kind === 'single'">
                  {{ t('questions.kind_single') }}
                </option>
                <option value="multiple" [selected]="d.kind === 'multiple'">
                  {{ t('questions.kind_multiple') }}
                </option>
              </select>
            </div>
          </div>
          <div class="form-grid">
            <app-localized-field
              [label]="t('questions.text')"
              [required]="true"
              [multiline]="true"
              [value]="d.text"
              (valueChange)="patch({ text: $event! })"
            />
            <app-localized-field
              [label]="t('questions.text_falc')"
              [hint]="t('questions.text_falc_hint')"
              [multiline]="true"
              [value]="d.text_falc"
              (valueChange)="patch({ text_falc: $event })"
            />
            <app-localized-field
              [label]="t('questions.help')"
              [multiline]="true"
              [value]="d.help"
              (valueChange)="patch({ help: $event })"
            />
          </div>
        </section>

        <section class="form-section" aria-labelledby="s-options">
          <h2 id="s-options">{{ t('questions.options') }}</h2>
          @for (
            option of options();
            track $index;
            let i = $index;
            let first = $first;
            let last = $last
          ) {
            <div class="option-row">
              <div class="option-head">
                <div class="cond-row">
                  <label class="sr-only" [for]="'opt-key-' + i">{{ t('common.key') }}</label>
                  <input
                    [id]="'opt-key-' + i"
                    class="text-input key"
                    [value]="option.key"
                    [readonly]="option.saved"
                    (input)="patchOption(i, { key: value($event) })"
                  />
                  <label class="check">
                    <input
                      type="checkbox"
                      [checked]="option.exclusive"
                      (change)="patchOption(i, { exclusive: $any($event.target).checked })"
                    />
                    <span>{{ t('questions.exclusive') }}</span>
                  </label>
                </div>
                <div class="item-actions">
                  <button
                    type="button"
                    class="btn btn-small btn-quiet"
                    [attr.aria-label]="t('common.move_up') + ' : ' + option.key"
                    [disabled]="first"
                    (click)="moveOption(i, -1)"
                  >
                    <app-icon name="up" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-small btn-quiet"
                    [attr.aria-label]="t('common.move_down') + ' : ' + option.key"
                    [disabled]="last"
                    (click)="moveOption(i, 1)"
                  >
                    <app-icon name="down" />
                  </button>
                  <button
                    type="button"
                    class="btn btn-small btn-quiet"
                    [attr.aria-label]="t('common.delete') + ' : ' + option.key"
                    [disabled]="options().length === 1"
                    (click)="removeOption(i)"
                  >
                    <app-icon name="trash" />
                  </button>
                </div>
              </div>
              <app-localized-field
                [label]="t('questions.option_label', { n: i + 1 })"
                [required]="true"
                [value]="option.label"
                (valueChange)="setOptionLabel(i, $event)"
              />
            </div>
          }
          <button type="button" class="btn btn-small" (click)="addOption()">
            <app-icon name="plus" /> {{ t('questions.add_option') }}
          </button>
        </section>

        @if (message()) {
          <p class="status" [class.is-error]="failed()" role="status">{{ message() }}</p>
        }
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ t('common.save') }}
          </button>
          <a class="btn btn-quiet" routerLink="/admin/library/questions">{{
            t('common.cancel')
          }}</a>
          @if (!isNew()) {
            @if (confirmDelete()) {
              <button type="button" class="btn" (click)="remove()">
                {{ t('common.confirm_delete') }}
              </button>
              <button type="button" class="btn btn-quiet" (click)="confirmDelete.set(false)">
                {{ t('common.keep') }}
              </button>
            } @else {
              <button type="button" class="btn btn-quiet" (click)="confirmDelete.set(true)">
                <app-icon name="trash" /> {{ t('common.delete') }}…
              </button>
            }
          }
        </div>
      </form>
    } @else if (message()) {
      <p class="status is-error" role="alert">{{ message() }}</p>
    } @else {
      <p>{{ t('common.loading') }}</p>
    }
  `,
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
