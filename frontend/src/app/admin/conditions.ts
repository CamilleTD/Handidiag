import type { Condition, Question } from '../core/models';

export type LeafOperator = 'in' | 'hasAny' | 'countAtLeast' | 'answered';

export const OPERATOR_LABELS: Record<LeafOperator, string> = {
  in: 'a répondu',
  hasAny: 'a coché au moins une de',
  countAtLeast: 'a coché au moins N réponses parmi',
  answered: 'a répondu ou non à la question',
};

export function isGroup(c: Condition): c is { all: Condition[] } | { any: Condition[] } {
  return 'all' in c || 'any' in c;
}

export function leafOperator(c: Condition): LeafOperator | null {
  for (const op of ['in', 'hasAny', 'countAtLeast', 'answered'] as const) if (op in c) return op;
  return null;
}

/** Résumé lisible d'une condition, pour les listes de l'administration. */
export function describe(condition: Condition | null, questions: Question[]): string {
  if (!condition) return 'toujours';
  const label = (q: string) => q;
  const options = (q: string, keys: string[]) => {
    const question = questions.find((x) => x.key === q);
    return keys
      .map((k) => question?.options.find((o) => o.key === k)?.label.fr ?? k)
      .map((t) => `« ${t} »`)
      .join(' ou ');
  };
  if ('all' in condition)
    return condition.all.map((c) => wrap(describe(c, questions))).join(' ET ');
  if ('any' in condition)
    return condition.any.map((c) => wrap(describe(c, questions))).join(' OU ');
  if ('not' in condition) return `NON ${wrap(describe(condition.not, questions))}`;
  if ('in' in condition) return `${label(condition.q)} = ${options(condition.q, condition.in)}`;
  if ('hasAny' in condition)
    return `${label(condition.q)} contient ${options(condition.q, condition.hasAny)}`;
  if ('countAtLeast' in condition)
    return `${label(condition.q)} : au moins ${condition.countAtLeast}${
      condition.among ? ` parmi ${options(condition.q, condition.among)}` : ''
    }`;
  if ('answered' in condition)
    return `${label(condition.q)} ${condition.answered ? 'répondue' : 'non répondue'}`;
  return '?';
}

function wrap(text: string): string {
  return /\s(ET|OU)\s/.test(text) ? `(${text})` : text;
}

/** Condition de départ pour une nouvelle règle ou un nouveau critère. */
export function emptyLeaf(questions: Question[]): Condition {
  const question = questions[0];
  return { q: question?.key ?? '', in: question?.options[0] ? [question.options[0].key] : [] };
}
