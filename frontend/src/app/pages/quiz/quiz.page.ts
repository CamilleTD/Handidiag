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
import { Router } from '@angular/router';
import { ContentService } from '../../core/content.service';
import { I18nService } from '../../core/i18n.service';
import type { Question } from '../../core/models';
import { PageTitleStrategy } from '../../core/page-title.strategy';
import { QuizService } from '../../core/quiz.service';
import { RestitutionService } from '../../core/restitution.service';
import { ReadPart } from '../../core/voice.service';
import { ContactCardComponent } from '../../shared/contact-card.component';
import { IconComponent } from '../../shared/icon.component';
import { ReadButtonComponent } from '../../shared/read-button.component';

@Component({
  imports: [IconComponent, ReadButtonComponent, ContactCardComponent],
  templateUrl: './quiz.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizPage {
  protected readonly i18n = inject(I18nService);
  protected readonly quiz = inject(QuizService);
  private readonly content = inject(ContentService);
  private readonly restitution = inject(RestitutionService);
  private readonly router = inject(Router);
  private readonly titles = inject(PageTitleStrategy);

  /** Numéro de la question dans l'adresse (/quiz/3) : le bouton retour du navigateur fonctionne. */
  readonly number = input<string>();
  protected readonly error = signal('');

  private readonly wanted = computed(() => (Number(this.number()) || 1) - 1);
  /** On ne peut pas sauter au-delà de la question la plus avancée déjà atteinte. */
  protected readonly index = computed(() =>
    Math.max(0, Math.min(this.wanted(), this.quiz.maxIndex(), this.quiz.flow().length - 1)),
  );
  protected readonly question = computed<Question | undefined>(
    () => this.quiz.flow()[this.index()],
  );
  protected readonly isDeep = computed(() => this.index() >= this.quiz.core().length);
  protected readonly progress = computed(
    () =>
      this.i18n.t('quiz.progress', { n: this.index() + 1, total: this.quiz.estimatedTotal() }) +
      (this.isDeep() ? ` · ${this.i18n.t('quiz.deep_tag')}` : ''),
  );
  protected readonly trail = computed(() =>
    Array.from({ length: this.quiz.estimatedTotal() }, (_, i) => i),
  );
  protected readonly isLast = computed(
    () =>
      this.index() === this.quiz.flow().length - 1 &&
      (this.quiz.deep() || !this.quiz.deepQuestions().length),
  );

  /** Étape « pôle » : ce que suggèrent les réponses, puis comment contacter le pôle. */
  protected readonly poleHint = computed(() => {
    if (this.question()?.key !== 'pole_next' || !this.quiz.answers()['pole_fit']) return null;
    const key = this.quiz.preview().pole ?? 'none';
    return this.content.content().pole_outcomes[key] ?? null;
  });
  protected readonly showPolePanel = computed(
    () => this.question()?.key === 'pole_next' && this.quiz.answers()['pole_check'] === 'yes',
  );
  protected readonly poleGroups = computed(() => this.restitution.poleGroups());

  constructor() {
    this.quiz.begin();
    effect(() => {
      const wanted = this.wanted();
      const core = this.quiz.core().length;
      untracked(() => {
        this.error.set('');
        // Accès direct à une question complémentaire sans l'avoir choisie : écran de choix
        if (!this.quiz.deep() && wanted >= core && this.quiz.maxIndex() >= core - 1) {
          void this.router.navigateByUrl('/more', { replaceUrl: true });
        } else if (wanted !== this.index()) {
          void this.router.navigate(['/quiz', this.index() + 1], { replaceUrl: true });
        }
      });
    });
    effect(() => this.titles.prefix.set(this.progress()));
  }

  protected selected(question: Question, option: string): boolean {
    return this.quiz.selected(question).includes(option);
  }

  protected choose(question: Question, option: string, event: Event): void {
    this.error.set('');
    this.quiz.choose(question, option, (event.target as HTMLInputElement).checked);
  }

  protected next(): void {
    const question = this.question();
    if (!question) return;
    if (!this.quiz.selected(question).length) {
      this.error.set(this.i18n.t(question.required ? 'quiz.required' : 'quiz.required_optional'));
      return;
    }
    this.advance();
  }

  protected skip(): void {
    const question = this.question();
    if (question) this.quiz.skip(question);
    this.advance();
  }

  protected back(): void {
    if (this.index() > 0) void this.router.navigate(['/quiz', this.index()]);
  }

  protected cancel(): void {
    this.quiz.reset();
    void this.router.navigateByUrl('/');
  }

  private advance(): void {
    const index = this.index();
    if (index < this.quiz.flow().length - 1) {
      this.quiz.reach(index + 1);
      void this.router.navigate(['/quiz', index + 2]);
    } else if (!this.quiz.deep() && this.quiz.deepQuestions().length) {
      this.quiz.reach(index);
      void this.router.navigateByUrl('/more');
    } else {
      this.quiz.finish();
      void this.router.navigateByUrl('/result');
    }
  }

  protected readonly readParts = (): ReadPart[] => {
    const question = this.question();
    if (!question) return [];
    const byId = (id: string) => document.getElementById(id);
    const help = this.i18n.text(question.help);
    return [
      {
        text: this.i18n.text(question.text, question.text_falc),
        element: byId('q-title'),
        pause: 550,
      },
      ...(help ? [{ text: help, element: byId('q-help'), pause: 450 }] : []),
      { text: this.i18n.t('quiz.read_intro'), pause: 450 },
      ...question.options.map((o) => ({
        text: this.i18n.text(o.label),
        element: byId(`choice-${o.key}`),
        pause: 500,
      })),
    ];
  };
}
