import type { Condition, LocalizedText, Question } from '../core/models';

export type LeafOperator = 'in' | 'hasAny' | 'countAtLeast' | 'answered';
export const OPERATORS: LeafOperator[] = ['in', 'hasAny', 'countAtLeast', 'answered'];

type Translate = (key: string, vars?: Record<string, string | number>) => string;
type Text = (value: LocalizedText | null | undefined) => string;

export function leafOperator(c: Condition): LeafOperator | null {
  for (const op of OPERATORS) if (op in c) return op;
  return null;
}

/** Résumé lisible d'une condition, dans la langue de l'interface (clés admin.cond.*). */
export function describe(
  condition: Condition | null,
  questions: Question[],
  t: Translate,
  text: Text,
): string {
  if (!condition) return t('cond.always');
  const options = (q: string, keys: string[]) => {
    const question = questions.find((x) => x.key === q);
    return keys
      .map((k) => text(question?.options.find((o) => o.key === k)?.label) || k)
      .map((label) => t('common.quoted', { text: label }))
      .join(` ${t('cond.or')} `);
  };
  const wrap = (part: string) =>
    new RegExp(` (${t('cond.and_word')}|${t('cond.or_word')}) `).test(part) ? `(${part})` : part;
  const sub = (c: Condition) => wrap(describe(c, questions, t, text));
  if ('all' in condition) return condition.all.map(sub).join(` ${t('cond.and_word')} `);
  if ('any' in condition) return condition.any.map(sub).join(` ${t('cond.or_word')} `);
  if ('not' in condition) return `${t('cond.not_word')} ${sub(condition.not)}`;
  if ('in' in condition) return `${condition.q} = ${options(condition.q, condition.in)}`;
  if ('hasAny' in condition)
    return t('cond.sum_has_any', {
      q: condition.q,
      options: options(condition.q, condition.hasAny),
    });
  if ('countAtLeast' in condition)
    return condition.among
      ? t('cond.sum_count_among', {
          q: condition.q,
          n: condition.countAtLeast,
          options: options(condition.q, condition.among),
        })
      : t('cond.sum_count', { q: condition.q, n: condition.countAtLeast });
  if ('answered' in condition)
    return t(condition.answered ? 'cond.sum_answered' : 'cond.sum_not_answered', {
      q: condition.q,
    });
  return '?';
}

/** Condition de départ pour un nouveau critère. */
export function emptyLeaf(questions: Question[]): Condition {
  const question = questions[0];
  return { q: question?.key ?? '', in: question?.options[0] ? [question.options[0].key] : [] };
}
