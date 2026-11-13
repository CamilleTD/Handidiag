import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';
import { AdminApi, BankQuestion } from '../../admin-api.service';
import { adminT, adminText } from '../../admin-i18n';

/** Banque de questions : chaque question peut servir dans plusieurs questionnaires. */
@Component({
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './questions.page.html',
  styleUrl: './questions.page.scss',
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
