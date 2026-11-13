import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { AdminApi, BankQuestion } from '../admin-api.service';
import { adminT, adminText } from '../admin-i18n';

/** Banque de questions : chaque question peut servir dans plusieurs questionnaires. */
@Component({
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <h1>{{ t('questions.title') }}</h1>
      <a class="btn btn-primary" routerLink="/admin/library/questions/new">
        <app-icon name="plus" /> {{ t('questions.new') }}
      </a>
    </div>
    <p class="hint">{{ t('questions.intro') }}</p>
    <div class="toolbar">
      <label class="sr-only" for="q-filter">{{ t('common.filter') }}</label>
      <input
        id="q-filter"
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
      @for (q of shown(); track q.id) {
        <li class="item">
          <div>
            <p class="item-title">
              <a [routerLink]="['/admin/library/questions', q.id]">{{ text(q.text) }}</a>
            </p>
            <div class="item-meta">
              <span class="key">{{ q.key }}</span>
              <span class="tag is-quiet">{{ t('questions.kind_' + q.kind) }}</span>
              <span class="tag is-quiet">{{
                t('questions.n_options', { n: q.options.length })
              }}</span>
              @for (where of q.used_in; track where) {
                <span class="tag">{{ where }}</span>
              } @empty {
                <span class="tag is-sun">{{ t('questions.unused') }}</span>
              }
              @if (!q.text.en) {
                <span class="tag is-sun">{{ t('common.missing_en') }}</span>
              }
            </div>
          </div>
        </li>
      }
    </ul>
  `,
})
export class QuestionsPage {
  private readonly api = inject(AdminApi);
  protected readonly t = adminT();
  protected readonly text = adminText();
  protected readonly questions = signal<BankQuestion[]>([]);
  protected readonly filter = signal('');
  protected readonly error = signal('');
  protected readonly shown = computed(() => {
    const needle = this.filter().trim().toLowerCase();
    return this.questions().filter(
      (q) =>
        !needle ||
        q.key.toLowerCase().includes(needle) ||
        q.text.fr.toLowerCase().includes(needle) ||
        q.text.en.toLowerCase().includes(needle),
    );
  });

  constructor() {
    this.api.list<BankQuestion>('questions').then(
      (questions) => this.questions.set(questions),
      (error: Error) => this.error.set(error.message),
    );
  }
}
