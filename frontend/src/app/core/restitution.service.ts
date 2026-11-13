import { Injectable, computed, inject } from '@angular/core';
import { ContentService } from './content.service';
import { SENSITIVE_FLAGS, orderContacts, poleOutcome, workFocused } from './engine';
import type { Contact, PoleOutcomeKey } from './models';
import { QuizService } from './quiz.service';

/** Restitution calculée à partir du résultat : partagée par la page, le PDF et le résumé. */
@Injectable({ providedIn: 'root' })
export class RestitutionService {
  private readonly content = inject(ContentService);
  private readonly quiz = inject(QuizService);

  readonly view = computed(() => {
    const result = this.quiz.result();
    if (!result) return null;
    const content = this.content.content();
    const answers = this.quiz.answers();
    const contacts = this.content.contacts();
    const work = workFocused(answers);
    const sensitive = result.flags.some((f) => SENSITIVE_FLAGS.includes(f));
    const keys = content.profile_contacts[result.profile] ?? ['mdph'];
    const ordered = orderContacts(keys, {
      workFocused: work,
      sensitive,
      confidential: new Set(content.contacts.filter((c) => c.is_confidential).map((c) => c.key)),
      work: new Set(content.contacts.filter((c) => c.pole_group === 'work').map((c) => c.key)),
    });
    const pole = poleOutcome(answers, result);
    const rules = new Map(content.rules.map((r) => [r.key, r]));

    return {
      result,
      level: content.levels.find((l) => l.key === result.level) ?? null,
      // Points d'attention dans l'ordre défini par l'administration
      flags: content.flags.filter((f) => result.flags.includes(f.key)),
      suggestions: result.suggestions
        .map((key) => content.suggestions.find((s) => s.key === key))
        .filter((s) => s !== undefined),
      contacts: ordered.map((key) => contacts.get(key)).filter((c): c is Contact => !!c),
      sensitive,
      pole,
      /** Le pôle est mis en avant quand la personne n'est pas encore suivie. */
      poleFirst: pole !== null && answers['pole'] === 'no',
      poleMessage: pole ? (content.pole_outcomes[pole] ?? null) : null,
      poleGroups: this.poleGroups(work),
      // « Ce qui a été pris en compte » : règles expliquées qui ajoutent des points ou imposent un niveau
      reasons: result.matched
        .map((m) => ({ ...m, rule: rules.get(m.key) }))
        .filter((m) => m.rule?.explanation && (m.points > 0 || m.rule.override_level))
        .map((m) => ({ key: m.key, points: m.points, explanation: m.rule!.explanation! })),
    };
  });

  /** Interlocuteurs du pôle handicap, groupés par besoin (études / monde du travail). */
  poleGroups(work = workFocused(this.quiz.answers())) {
    const contacts = this.content.content().contacts;
    const groups = (['school', 'work'] as const).map((group) => ({
      group,
      contacts: contacts.filter((c) => c.pole_group === group),
    }));
    return work ? groups.reverse() : groups;
  }

  /** Message du pôle à reprendre dans les fichiers : jamais « déjà suivi(e) ». */
  exportablePole(): PoleOutcomeKey | null {
    const pole = this.view()?.pole ?? null;
    return pole === 'followed' ? null : pole;
  }
}
