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
import { IconComponent } from '../../shared/icon.component';
import {
  AdminApi,
  BankQuestion,
  ContactRow,
  LibraryRule,
  Payload,
  TextItemRow,
} from '../admin-api.service';
import { adminT, adminText } from '../admin-i18n';
import { emptyLeaf } from '../conditions';
import { ConditionFieldComponent } from '../components/condition-field.component';
import { LocalizedFieldComponent } from '../components/localized-field.component';
import { PickListComponent } from '../components/pick-list.component';

type Draft = Payload<LibraryRule>;

/** Partie partagée d'une règle. Points et résultat imposé se règlent dans chaque questionnaire. */
@Component({
  imports: [
    RouterLink,
    IconComponent,
    LocalizedFieldComponent,
    ConditionFieldComponent,
    PickListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>
      <a routerLink="/admin/library/rules">← {{ t('rules.back') }}</a>
    </p>
    @if (draft(); as d) {
      <h1>{{ isNew() ? t('rules.new') : d.key }}</h1>
      @if (usedIn().length) {
        <p class="status">{{ t('rules.used_in', { list: usedIn().join(', ') }) }}</p>
      }
      <form (submit)="$event.preventDefault(); save()" novalidate>
        <section class="form-section">
          <div class="form-grid">
            <div class="field">
              <label for="r-key">{{ t('common.key') }}</label>
              <input
                id="r-key"
                class="text-input key"
                aria-describedby="r-key-hint"
                [value]="d.key"
                [readonly]="!isNew()"
                (input)="patch({ key: value($event) })"
              />
              <p id="r-key-hint" class="hint">{{ t('common.key_hint') }}</p>
            </div>
            <app-localized-field
              [label]="t('rules.explanation')"
              [hint]="t('rules.explanation_hint')"
              [multiline]="true"
              [value]="d.explanation"
              (valueChange)="patch({ explanation: $event })"
            />
          </div>
        </section>

        <app-condition-field
          [label]="t('rules.condition')"
          [hint]="t('rules.condition_hint')"
          [questions]="questions()"
          [value]="d.condition"
          (valueChange)="patch({ condition: $event! })"
        />

        <app-pick-list
          [label]="t('rules.flags')"
          [items]="flagItems()"
          [selected]="d.flags"
          (selectedChange)="patch({ flags: $event })"
        />
        <app-pick-list
          [label]="t('rules.suggestions')"
          [items]="suggestionItems()"
          [selected]="d.suggestions"
          (selectedChange)="patch({ suggestions: $event })"
        />
        <app-pick-list
          [label]="t('rules.contacts')"
          [hint]="t('rules.contacts_hint')"
          [ordered]="true"
          [items]="contactItems()"
          [selected]="d.contacts"
          (selectedChange)="patch({ contacts: $event })"
        />
        <p class="hint">{{ t('rules.messages_hint') }}</p>

        @if (message()) {
          <p class="status" [class.is-error]="failed()" role="status">{{ message() }}</p>
        }
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" [disabled]="saving()">
            {{ t('common.save') }}
          </button>
          <a class="btn btn-quiet" routerLink="/admin/library/rules">{{ t('common.cancel') }}</a>
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
export class RuleEditorPage {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  protected readonly t = adminT();
  private readonly text = adminText();
  readonly id = input.required<string>();

  protected readonly isNew = computed(() => this.id() === 'new');
  protected readonly draft = signal<Draft | null>(null);
  protected readonly usedIn = signal<string[]>([]);
  protected readonly questions = signal<BankQuestion[]>([]);
  private readonly flags = signal<TextItemRow[]>([]);
  private readonly suggestions = signal<TextItemRow[]>([]);
  private readonly contacts = signal<ContactRow[]>([]);
  protected readonly message = signal('');
  protected readonly failed = signal(false);
  protected readonly saving = signal(false);
  protected readonly confirmDelete = signal(false);

  protected readonly flagItems = computed(() =>
    this.flags().map((f) => ({ key: f.key, label: this.text(f.text) })),
  );
  protected readonly suggestionItems = computed(() =>
    this.suggestions().map((s) => ({ key: s.key, label: this.text(s.text) })),
  );
  protected readonly contactItems = computed(() =>
    this.contacts().map((c) => ({ key: c.key, label: this.text(c.name) })),
  );

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.load(id));
    });
  }

  private async load(id: string): Promise<void> {
    try {
      const [rules, questions, flags, suggestions, contacts] = await Promise.all([
        this.api.list<LibraryRule>('rules'),
        this.api.list<BankQuestion>('questions'),
        this.api.list<TextItemRow>('flags'),
        this.api.list<TextItemRow>('suggestions'),
        this.api.list<ContactRow>('contacts'),
      ]);
      this.questions.set(questions);
      this.flags.set(flags);
      this.suggestions.set(suggestions);
      this.contacts.set(contacts);
      const rule = rules.find((r) => String(r.id) === id);
      if (id !== 'new' && !rule) throw new Error(this.t('errors.not_found'));
      if (rule) {
        const { id: _id, used_in, ...draft } = rule;
        this.draft.set(draft);
        this.usedIn.set(used_in);
      } else {
        this.draft.set({
          key: 'R_',
          condition: emptyLeaf(questions),
          explanation: null,
          flags: [],
          suggestions: [],
          contacts: [],
        });
      }
    } catch (error) {
      this.fail(error);
    }
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  protected async save(): Promise<void> {
    const draft = this.draft();
    if (!draft) return;
    this.saving.set(true);
    try {
      const saved = this.isNew()
        ? await this.api.create<LibraryRule>('rules', draft)
        : await this.api.update<LibraryRule>('rules', Number(this.id()), draft);
      this.failed.set(false);
      this.message.set(this.t(saved.used_in.length ? 'rules.saved_used' : 'common.saved'));
      if (this.isNew())
        void this.router.navigate(['/admin/library/rules', saved.id], { replaceUrl: true });
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
      void this.router.navigateByUrl('/admin/library/rules');
    } catch (error) {
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    this.failed.set(true);
    this.message.set((error as Error).message);
  }
}
