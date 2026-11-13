import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { AdminApi, BankQuestion, LibraryRule } from '../admin-api.service';
import { adminT, adminText } from '../admin-i18n';
import { describe } from '../conditions';

/** Bibliothèque de règles : condition et messages, partagés entre questionnaires. */
@Component({
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <h1>{{ t('rules.title') }}</h1>
      <a class="btn btn-primary" routerLink="/admin/library/rules/new">
        <app-icon name="plus" /> {{ t('rules.new') }}
      </a>
    </div>
    <p class="hint">{{ t('rules.intro') }}</p>
    <div class="toolbar">
      <label class="sr-only" for="r-filter">{{ t('common.filter') }}</label>
      <input
        id="r-filter"
        class="text-input"
        type="search"
        [placeholder]="t('common.filter_placeholder')"
        (input)="filter.set($any($event.target).value)"
      />
      <span class="hint">{{ t('common.count', { n: shown().length }) }}</span>
    </div>
    @if (error()) {
      <p class="status is-error" role="alert">{{ error() }}</p>
    }
    <ul class="item-list">
      @for (rule of shown(); track rule.id) {
        <li class="item">
          <div>
            <p class="item-title">
              <a [routerLink]="['/admin/library/rules', rule.id]">{{ rule.key }}</a>
            </p>
            <p class="condition-summary">{{ t('rules.if') }} {{ summary(rule) }}</p>
            @if (rule.explanation) {
              <p>« {{ text(rule.explanation) }} »</p>
            }
            <div class="item-meta">
              @for (where of rule.used_in; track where) {
                <span class="tag">{{ where }}</span>
              } @empty {
                <span class="tag is-sun">{{ t('rules.unused') }}</span>
              }
              @if (rule.flags.length) {
                <span class="tag is-quiet">{{ t('rules.n_flags', { n: rule.flags.length }) }}</span>
              }
              @if (rule.suggestions.length) {
                <span class="tag is-quiet">{{
                  t('rules.n_suggestions', { n: rule.suggestions.length })
                }}</span>
              }
              @if (rule.contacts.length) {
                <span class="tag is-quiet">{{
                  t('rules.n_contacts', { n: rule.contacts.length })
                }}</span>
              }
            </div>
          </div>
        </li>
      }
    </ul>
  `,
})
export class RulesPage {
  private readonly api = inject(AdminApi);
  protected readonly t = adminT();
  protected readonly text = adminText();
  protected readonly rules = signal<LibraryRule[]>([]);
  private readonly questions = signal<BankQuestion[]>([]);
  protected readonly filter = signal('');
  protected readonly error = signal('');
  protected readonly shown = computed(() => {
    const needle = this.filter().trim().toLowerCase();
    if (!needle) return this.rules();
    return this.rules().filter((r) =>
      [r.key, r.explanation?.fr ?? '', JSON.stringify(r.condition), r.used_in.join(' ')].some(
        (value) => value.toLowerCase().includes(needle),
      ),
    );
  });

  constructor() {
    Promise.all([
      this.api.list<LibraryRule>('rules'),
      this.api.list<BankQuestion>('questions'),
    ]).then(
      ([rules, questions]) => {
        this.rules.set(rules);
        this.questions.set(questions);
      },
      (error: Error) => this.error.set(error.message),
    );
  }

  protected summary(rule: LibraryRule): string {
    return describe(rule.condition, this.questions(), this.t, this.text);
  }
}
