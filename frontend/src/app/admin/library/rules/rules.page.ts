import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';
import { AdminApi, BankQuestion, LibraryRule } from '../../admin-api.service';
import { adminT, adminText } from '../../admin-i18n';
import { describe } from '../../conditions';

/** Bibliothèque de règles : condition et messages, partagés entre questionnaires. */
@Component({
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rules.page.html',
  styleUrl: './rules.page.scss',
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
