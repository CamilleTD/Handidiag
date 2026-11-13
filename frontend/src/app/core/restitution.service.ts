import { Injectable, computed, inject } from '@angular/core';
import { ContentService } from './content.service';
import { collectContacts } from './engine';
import { QuizService } from './quiz.service';

/** Restitution calculée à partir du résultat : partagée par la page, le PDF et le résumé. */
@Injectable({ providedIn: 'root' })
export class RestitutionService {
  private readonly quiz = inject(QuizService);
  private readonly content = inject(ContentService);

  readonly view = computed(() => {
    const result = this.quiz.result();
    const snapshot = this.quiz.snapshot();
    if (!result || !snapshot) return null;
    const outcome = snapshot.outcomes.find((o) => o.key === result.outcome) ?? null;
    const rules = new Map(snapshot.rules.map((r) => [r.key, r]));
    const { contacts, confidentialFirst } = collectContacts(snapshot, result);
    const published = new Set(this.content.content().questionnaires.map((q) => q.key));
    return {
      snapshot,
      result,
      outcome,
      // Questionnaire proposé ensuite, s'il est publié (ou en aperçu)
      next:
        outcome?.next && (published.has(outcome.next.key) || this.quiz.preview())
          ? outcome.next
          : null,
      // Points d'attention dans l'ordre défini par l'administration
      flags: snapshot.flags.filter((f) => result.flags.includes(f.key)),
      suggestions: result.suggestions
        .map((key) => snapshot.suggestions.find((s) => s.key === key))
        .filter((s) => s !== undefined),
      contacts,
      confidentialFirst,
      // « Ce qui a été pris en compte » : règles expliquées qui ajoutent des points ou imposent le résultat
      reasons: result.matched
        .map((m) => ({ ...m, rule: rules.get(m.key) }))
        .filter((m) => m.rule?.explanation && (m.points > 0 || m.rule.override))
        .map((m) => ({ key: m.key, points: m.points, explanation: m.rule!.explanation! })),
    };
  });
}
