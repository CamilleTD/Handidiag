/**
 * Moteur de règles explicable (fonctions pures, sans Angular).
 * Les réponses restent dans le navigateur : rien de ce qui est calculé ici n'est envoyé.
 */
import type {
  Condition,
  Contact,
  Outcome,
  QuestionnaireQuestion,
  QuestionnaireSnapshot,
  Rule,
} from './models';

export type Answers = Record<string, string | string[]>;

export interface Evaluation {
  score: number;
  outcome: string;
  matched: { key: string; points: number }[];
  flags: string[];
  suggestions: string[];
  /** Résultat imposé par une règle (null : choisi d'après le score). */
  overridden: string | null;
}

function values(answers: Answers, question: string): string[] {
  const value = answers[question];
  if (value === undefined || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

export function check(condition: Condition, answers: Answers): boolean {
  if ('all' in condition) return condition.all.every((c) => check(c, answers));
  if ('any' in condition) return condition.any.some((c) => check(c, answers));
  if ('not' in condition) return !check(condition.not, answers);
  const given = values(answers, condition.q);
  if ('in' in condition) return given.some((v) => condition.in.includes(v));
  if ('hasAny' in condition) return given.some((v) => condition.hasAny.includes(v));
  if ('countAtLeast' in condition) {
    const pool = condition.among ? given.filter((v) => condition.among!.includes(v)) : given;
    return pool.length >= condition.countAtLeast;
  }
  if ('answered' in condition) return given.length > 0 === condition.answered;
  return false;
}

/** Résultat atteint par le score : le dernier palier (dans l'ordre) dont le seuil est atteint. */
export function outcomeFromScore(score: number, outcomes: Outcome[]): string {
  const steps = outcomes.filter((o) => o.min_score !== null);
  let current = steps[0]?.key ?? outcomes[0]?.key ?? '';
  for (const outcome of steps) if (score >= outcome.min_score!) current = outcome.key;
  return current;
}

export function evaluate(answers: Answers, rules: Rule[], outcomes: Outcome[]): Evaluation {
  const result: Evaluation = {
    score: 0,
    outcome: '',
    matched: [],
    flags: [],
    suggestions: [],
    overridden: null,
  };
  for (const rule of rules) {
    if (!check(rule.condition, answers)) continue;
    result.matched.push({ key: rule.key, points: rule.points });
    result.score += rule.points;
    for (const flag of rule.flags) if (!result.flags.includes(flag)) result.flags.push(flag);
    for (const s of rule.suggestions)
      if (!result.suggestions.includes(s)) result.suggestions.push(s);
    // La première règle qui impose un résultat l'emporte
    if (rule.override && !result.overridden) result.overridden = rule.override;
  }
  result.outcome = result.overridden ?? outcomeFromScore(result.score, outcomes);
  return result;
}

/* ---------------------------------------------------------------- déroulé du questionnaire */

/** Questions à poser : ni fixées d'office, ni masquées par leur condition d'affichage. */
export function visibleQuestions(
  snapshot: QuestionnaireSnapshot,
  answers: Answers,
  optional: boolean,
): QuestionnaireQuestion[] {
  return snapshot.sections
    .filter((s) => s.optional === optional)
    .flatMap((s) => s.questions)
    .filter((q) => !q.auto_answer && (!q.show_if || check(q.show_if, answers)));
}

/** Réponses fixées d'office (ex. profil « student »). */
export function automaticAnswers(snapshot: QuestionnaireSnapshot): Answers {
  const answers: Answers = {};
  for (const section of snapshot.sections)
    for (const q of section.questions) if (q.auto_answer) answers[q.key] = q.auto_answer;
  return answers;
}

/**
 * Retire les réponses aux questions de ce questionnaire devenues invisibles. Les réponses aux
 * questions d'autres questionnaires sont gardées : elles sont partagées pendant la visite.
 */
export function prune(snapshot: QuestionnaireSnapshot, answers: Answers): Answers {
  const own = new Set(snapshot.sections.flatMap((s) => s.questions.map((q) => q.key)));
  const visible = new Set(
    [
      ...visibleQuestions(snapshot, answers, false),
      ...visibleQuestions(snapshot, answers, true),
    ].map((q) => q.key),
  );
  const kept: Answers = {};
  for (const [key, value] of Object.entries(answers))
    if (!own.has(key) || visible.has(key)) kept[key] = value;
  return { ...kept, ...automaticAnswers(snapshot) };
}

/** Applique un choix à une réponse multiple en respectant les options exclusives. */
export function toggleOption(
  question: { options: { key: string; exclusive: boolean }[] },
  current: string[],
  option: string,
  checked: boolean,
): string[] {
  if (!checked) return current.filter((v) => v !== option);
  const exclusive = question.options.find((o) => o.key === option)?.exclusive;
  const kept = exclusive
    ? []
    : current.filter((v) => !question.options.find((o) => o.key === v)?.exclusive);
  return [...kept.filter((v) => v !== option), option];
}

/* ---------------------------------------------------------------- restitution */

/**
 * Interlocuteurs proposés : ceux du résultat, puis ceux des règles déclenchées, dans l'ordre.
 * Si un point d'attention le demande, les professionnels tenus au secret médical passent en premier.
 */
export function collectContacts(
  snapshot: QuestionnaireSnapshot,
  evaluation: Evaluation,
): { contacts: Contact[]; confidentialFirst: boolean } {
  const outcome = snapshot.outcomes.find((o) => o.key === evaluation.outcome);
  const matched = new Set(evaluation.matched.map((m) => m.key));
  const keys = [
    ...(outcome?.contacts ?? []),
    ...snapshot.rules.filter((r) => matched.has(r.key)).flatMap((r) => r.contacts),
  ];
  const byKey = new Map(snapshot.contacts.map((c) => [c.key, c]));
  let contacts = [...new Set(keys)].map((k) => byKey.get(k)).filter((c): c is Contact => !!c);
  const confidentialFirst = snapshot.flags.some(
    (f) => f.highlight_confidential && evaluation.flags.includes(f.key),
  );
  if (confidentialFirst) {
    const rank = (c: Contact) => (c.is_confidential ? 0 : 1);
    contacts = [...contacts].sort((a, b) => rank(a) - rank(b));
  }
  return { contacts, confidentialFirst };
}
