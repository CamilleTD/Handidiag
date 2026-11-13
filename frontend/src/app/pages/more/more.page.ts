import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n.service';
import { QuizService } from '../../core/quiz.service';
import { IconComponent, MedalComponent } from '../../shared/icon.component';

/** Fin des questions principales : voir le résultat ou répondre aux questions facultatives. */
@Component({
  imports: [IconComponent, MedalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="narrow">
      <div class="quiz-card more-card">
        <app-medal name="badge" />
        <h1>{{ i18n.t('quiz.more_title') }}</h1>
        <p class="lead">{{ i18n.t('quiz.more_text', { n: count(), m: minutes() }) }}</p>
        <div class="actions">
          <button type="button" class="btn btn-primary" (click)="continue()">
            {{ i18n.t('quiz.more_continue') }} <app-icon name="arrow" />
          </button>
          <button type="button" class="btn" (click)="finish()">
            {{ i18n.t('quiz.more_skip') }}
          </button>
        </div>
        <p class="hint">{{ i18n.t('quiz.more_later') }}</p>
      </div>
      <p>
        <button type="button" class="linklike" (click)="back()">
          <app-icon name="back" /> {{ i18n.t('quiz.back') }}
        </button>
      </p>
    </div>
  `,
})
export class MorePage {
  protected readonly i18n = inject(I18nService);
  private readonly quiz = inject(QuizService);
  private readonly router = inject(Router);
  readonly key = input.required<string>();
  protected readonly count = computed(() => this.quiz.optionalQuestions().length);
  protected readonly minutes = computed(() => Math.max(1, Math.round((this.count() * 25) / 60)));

  constructor() {
    // Questions principales pas encore terminées : retour au questionnaire
    queueMicrotask(() => {
      if (this.quiz.maxIndex() < this.quiz.core().length - 1)
        void this.router.navigate(['/q', this.key(), 1], { replaceUrl: true });
    });
  }

  protected continue(): void {
    const first = this.quiz.openOptional();
    void this.router.navigate(['/q', this.key(), first + 1]);
  }

  protected finish(): void {
    this.quiz.finish();
    void this.router.navigate(['/q', this.key(), 'result']);
  }

  protected back(): void {
    void this.router.navigate(['/q', this.key(), this.quiz.core().length]);
  }
}
