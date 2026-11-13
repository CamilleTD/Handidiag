import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AnalyticsService } from './analytics.service';
import {
  Answers,
  Evaluation,
  automaticAnswers,
  evaluate,
  prune,
  toggleOption,
  visibleQuestions,
} from './engine';
import { I18nService } from './i18n.service';
import type { QuestionnaireQuestion, QuestionnaireSnapshot } from './models';

export type QuizResult = Evaluation;

/**
 * État du questionnaire en cours. Les réponses vivent uniquement en mémoire, dans cet onglet :
 * elles ne sont ni enregistrées ni envoyées. Elles sont partagées entre les questionnaires d'une
 * même visite : une question déjà répondue ailleurs arrive pré-remplie.
 */
@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly http = inject(HttpClient);
  private readonly analytics = inject(AnalyticsService);
  private readonly i18n = inject(I18nService);

  readonly snapshot = signal<QuestionnaireSnapshot | null>(null);
  /** Aperçu d'un brouillon depuis l'administration : rien n'est compté. */
  readonly preview = signal(false);
  readonly answers = signal<Answers>({});
  /** Question la plus avancée déjà atteinte (on ne peut pas sauter au-delà). */
  readonly maxIndex = signal(0);
  /** Questions facultatives acceptées par la personne. */
  readonly optionalOpen = signal(false);
  readonly result = signal<QuizResult | null>(null);
  readonly checklist = signal<Record<number, boolean>>({});
  private started = false;
  private optionalSent = false;

  readonly key = computed(() => this.snapshot()?.key ?? '');
  readonly core = computed(() => this.visible(false));
  readonly optionalQuestions = computed(() => this.visible(true));
  readonly flow = computed(() => [
    ...this.core(),
    ...(this.optionalOpen() ? this.optionalQuestions() : []),
  ]);

  private visible(optional: boolean): QuestionnaireQuestion[] {
    const snapshot = this.snapshot();
    return snapshot ? visibleQuestions(snapshot, this.answers(), optional) : [];
  }

  /** Le questionnaire demandé est-il chargé ? Sinon, charge sa version publiée. */
  async ensure(key: string): Promise<boolean> {
    return this.snapshot()?.key === key || this.open(key);
  }

  /** Charge la version publiée d'un questionnaire (sans effacer les réponses déjà données). */
  async open(key: string): Promise<boolean> {
    try {
      const snapshot = await firstValueFrom(
        this.http.get<QuestionnaireSnapshot>(`/api/questionnaires/${key}`),
      );
      this.use(snapshot, false);
      return true;
    } catch {
      return false;
    }
  }

  /** Charge le brouillon d'un questionnaire pour le tester (réservé à l'administration). */
  async openPreview(id: number): Promise<string | null> {
    try {
      const snapshot = await firstValueFrom(
        this.http.get<QuestionnaireSnapshot>(`/api/admin/questionnaires/${id}/preview`),
      );
      this.use(snapshot, true);
      return snapshot.key;
    } catch {
      return null;
    }
  }

  private use(snapshot: QuestionnaireSnapshot, preview: boolean): void {
    this.snapshot.set(snapshot);
    this.preview.set(preview);
    this.restart(false);
  }

  /** Recommence le questionnaire en cours ; `forget` efface aussi toutes les réponses. */
  restart(forget = true): void {
    const snapshot = this.snapshot();
    if (forget) this.answers.set({});
    if (snapshot)
      this.answers.update((a) => prune(snapshot, { ...a, ...automaticAnswers(snapshot) }));
    this.maxIndex.set(0);
    this.optionalOpen.set(false);
    this.result.set(null);
    this.started = false;
    this.optionalSent = false;
  }

  /** Efface toutes les réponses de la visite. */
  forgetAll(): void {
    this.answers.set({});
    this.checklist.set({});
    this.restart(false);
  }

  /** À appeler à l'affichage d'une question. */
  begin(): void {
    if (this.started || this.preview()) return;
    this.started = true;
    this.analytics.send({ t: 'start', questionnaire: this.key(), lang: this.i18n.lang() });
  }

  selected(question: QuestionnaireQuestion): string[] {
    const value = this.answers()[question.key];
    return value === undefined ? [] : Array.isArray(value) ? value : [value];
  }

  choose(question: QuestionnaireQuestion, option: string, checked: boolean): void {
    const answers = { ...this.answers() };
    if (question.kind === 'single') answers[question.key] = option;
    else {
      const next = toggleOption(question, this.selected(question), option, checked);
      if (next.length) answers[question.key] = next;
      else delete answers[question.key];
    }
    this.setAnswers(answers);
  }

  skip(question: QuestionnaireQuestion): void {
    const answers = { ...this.answers() };
    delete answers[question.key];
    this.setAnswers(answers);
  }

  private setAnswers(answers: Answers): void {
    const snapshot = this.snapshot();
    this.answers.set(snapshot ? prune(snapshot, answers) : answers);
  }

  reach(index: number): void {
    this.maxIndex.update((max) => Math.max(max, index));
  }

  openOptional(): number {
    this.optionalOpen.set(true);
    this.result.set(null);
    if (!this.optionalSent && !this.preview()) {
      this.optionalSent = true;
      this.analytics.send({ t: 'optional', questionnaire: this.key() });
    }
    const first = this.core().length;
    this.reach(first);
    return first;
  }

  finish(): QuizResult | null {
    const snapshot = this.snapshot();
    if (!snapshot) return null;
    const answers = prune(snapshot, this.answers());
    this.answers.set(answers);
    const result = evaluate(answers, snapshot.rules, snapshot.outcomes);
    this.result.set(result);
    if (!this.preview())
      this.analytics.send({ t: 'complete', questionnaire: snapshot.key, outcome: result.outcome });
    return result;
  }
}
