import { Injectable, computed, inject, signal } from '@angular/core';
import { AnalyticsService } from './analytics.service';
import { ContentService } from './content.service';
import {
  Answers,
  Evaluation,
  automaticAnswers,
  coreQuestions,
  endedAfterPole,
  evaluate,
  prune,
  toggleOption,
  visibleIn,
} from './engine';
import { I18nService } from './i18n.service';
import type { Question } from './models';

export interface QuizResult extends Evaluation {
  profile: string;
  /** Parcours arrêté après l'étape « pôle » : pas de niveau RQTH. */
  poleOnly: boolean;
}

/**
 * État du questionnaire. Les réponses vivent uniquement en mémoire, dans cet onglet :
 * elles ne sont ni enregistrées ni envoyées, et disparaissent en fermant la page.
 */
@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly content = inject(ContentService);
  private readonly analytics = inject(AnalyticsService);
  private readonly i18n = inject(I18nService);

  readonly answers = signal<Answers>({});
  /** Question la plus avancée déjà atteinte (on ne peut pas sauter au-delà). */
  readonly maxIndex = signal(0);
  readonly deep = signal(false);
  readonly result = signal<QuizResult | null>(null);
  readonly checklist = signal<Record<number, boolean>>({});
  private started = false;
  private deepSent = false;

  private readonly questions = computed(() => this.content.content().questions);
  readonly core = computed(() => coreQuestions(this.questions(), this.answers()));
  readonly deepQuestions = computed(() => visibleIn(this.questions(), 'deep', this.answers()));
  readonly flow = computed(() => [...this.core(), ...(this.deep() ? this.deepQuestions() : [])]);

  /** Total affiché : tant que la situation n'est pas connue, on suppose le parcours le plus courant. */
  readonly estimatedTotal = computed(() => {
    const assumed: Answers = { duration: 'long', ...this.answers() };
    return (
      coreQuestions(this.questions(), assumed).length +
      (this.deep() ? this.deepQuestions().length : 0)
    );
  });

  reset(): void {
    this.answers.set(automaticAnswers(this.questions()));
    this.maxIndex.set(0);
    this.deep.set(false);
    this.result.set(null);
    this.checklist.set({});
    this.started = false;
    this.deepSent = false;
  }

  /** À appeler à l'affichage de la première question. */
  begin(): void {
    if (!Object.keys(this.answers()).length) this.answers.set(automaticAnswers(this.questions()));
    if (this.started) return;
    this.started = true;
    this.analytics.send({ t: 'start', lang: this.i18n.lang() });
  }

  selected(question: Question): string[] {
    const value = this.answers()[question.key];
    return value === undefined ? [] : Array.isArray(value) ? value : [value];
  }

  choose(question: Question, option: string, checked: boolean): void {
    const answers = { ...this.answers() };
    if (question.kind === 'single') answers[question.key] = option;
    else {
      const next = toggleOption(question, this.selected(question), option, checked);
      if (next.length) answers[question.key] = next;
      else delete answers[question.key];
    }
    this.answers.set(prune(this.questions(), answers));
  }

  skip(question: Question): void {
    const answers = { ...this.answers() };
    delete answers[question.key];
    this.answers.set(prune(this.questions(), answers));
  }

  reach(index: number): void {
    this.maxIndex.update((max) => Math.max(max, index));
  }

  startDeep(): number {
    this.deep.set(true);
    this.result.set(null);
    if (!this.deepSent) {
      this.deepSent = true;
      this.analytics.send({ t: 'deep' });
    }
    const first = this.core().length;
    this.reach(first);
    return first;
  }

  /** Depuis un résultat « pôle seul » : reprendre les questions RQTH là où elles s'étaient arrêtées. */
  continueToRqth(): number {
    this.answers.update((a) => ({ ...a, pole_next: 'rqth' }));
    this.result.set(null);
    this.deep.set(false);
    const next = this.core().findIndex((q) => q.key === 'pole_next') + 1;
    this.reach(next);
    return next;
  }

  /** Évaluation dans une situation hypothétique (indication affichée pendant l'étape « pôle »). */
  preview(): Evaluation {
    const { rules, levels } = this.content.content();
    return evaluate(this.answers(), rules, levels);
  }

  finish(): QuizResult {
    const { questions, rules, levels } = this.content.content();
    const answers = prune(questions, this.answers());
    this.answers.set(answers);
    const result: QuizResult = {
      ...evaluate(answers, rules, levels),
      profile: String(answers['profile'] ?? ''),
      poleOnly: endedAfterPole(answers),
    };
    this.result.set(result);
    // Parcours arrêté après le pôle : pas de niveau, donc pas d'événement « terminé »
    if (!result.poleOnly)
      this.analytics.send({
        t: 'complete',
        profile: result.profile,
        level: result.level,
        lang: this.i18n.lang(),
      });
    return result;
  }
}
