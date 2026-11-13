/**
 * Moteur de règles explicable (fonctions pures, sans Angular).
 * Les réponses restent dans le navigateur : rien de ce qui est calculé ici n'est envoyé.
 */
import type { Condition, Level, PoleOutcomeKey, Question, Rule } from './models';

export type Answers = Record<string, string | string[]>;

export interface Evaluation {
  score: number;
  level: string;
  matched: { key: string; points: number }[];
  flags: string[];
  suggestions: string[];
  overridden: string | null;
  /** Orientation vers le pôle handicap déduite des règles (« suggest » l'emporte sur « maybe »). */
  pole: 'suggest' | 'maybe' | null;
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

/** Niveau atteint par le score : le dernier palier dont le seuil est atteint. */
export function levelFromScore(score: number, levels: Level[]): string {
  const steps = levels.filter((l) => l.min_score !== null);
  let current = steps[0]?.key ?? levels[0]?.key ?? '';
  for (const level of steps) if (score >= level.min_score!) current = level.key;
  return current;
}

export function evaluate(answers: Answers, rules: Rule[], levels: Level[]): Evaluation {
  const result: Evaluation = {
    score: 0,
    level: '',
    matched: [],
    flags: [],
    suggestions: [],
    overridden: null,
    pole: null,
  };
  for (const rule of rules) {
    if (!check(rule.condition, answers)) continue;
    result.matched.push({ key: rule.key, points: rule.points });
    result.score += rule.points;
    for (const flag of rule.flags) if (!result.flags.includes(flag)) result.flags.push(flag);
    for (const s of rule.suggestions)
      if (!result.suggestions.includes(s)) result.suggestions.push(s);
    // La première règle qui impose un niveau l'emporte
    if (rule.override_level && !result.overridden) result.overridden = rule.override_level;
    if (rule.pole_outcome && (rule.pole_outcome === 'suggest' || !result.pole))
      result.pole = rule.pole_outcome;
  }
  result.level = result.overridden ?? levelFromScore(result.score, levels);
  return result;
}

/* ---------------------------------------------------------------- déroulé du questionnaire */

/** Étape « pôle » terminée ici : la personne ne poursuit pas vers les questions RQTH. */
export function endedAfterPole(answers: Answers): boolean {
  return answers['pole'] === 'no' && answers['pole_next'] === 'end';
}

export function visibleIn(questions: Question[], phase: Question['phase'], answers: Answers) {
  const stop = endedAfterPole(answers);
  return questions.filter((q) => {
    if (stop && phase === 'deep' && !q.tracks.includes('pole')) return false;
    return !q.hidden && q.phase === phase && (!q.show_if || check(q.show_if, answers));
  });
}

/** Questions essentielles : la liste s'arrête après une question dont la condition d'arrêt est vraie. */
export function coreQuestions(questions: Question[], answers: Answers): Question[] {
  const list = visibleIn(questions, 'core', answers);
  const stop = list.findIndex((q) => q.stop_if && check(q.stop_if, answers));
  return stop === -1 ? list : list.slice(0, stop + 1);
}

/** Réponses fixées d'office pour les questions masquées (ex. profil « student »). */
export function automaticAnswers(questions: Question[]): Answers {
  const answers: Answers = {};
  for (const q of questions) if (q.hidden && q.auto_answer) answers[q.key] = q.auto_answer;
  return answers;
}

/** Retire les réponses aux questions devenues invisibles. */
export function prune(questions: Question[], answers: Answers): Answers {
  const auto = automaticAnswers(questions);
  const visible = new Set(
    [...coreQuestions(questions, answers), ...visibleIn(questions, 'deep', answers)].map(
      (q) => q.key,
    ),
  );
  const kept: Answers = { ...auto };
  for (const [key, value] of Object.entries(answers)) if (visible.has(key)) kept[key] = value;
  return kept;
}

/** Applique un choix à une réponse multiple en respectant les options exclusives. */
export function toggleOption(
  question: Question,
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

/** Message de la section « pôle handicap », ou null si la question a été passée. */
export function poleOutcome(answers: Answers, evaluation: Evaluation): PoleOutcomeKey | null {
  if (answers['pole'] === 'yes') return 'followed';
  if (answers['pole'] !== 'no') return null;
  return answers['pole_check'] === 'yes' ? (evaluation.pole ?? 'none') : 'declined';
}

/** Le projet vise-t-il le monde du travail ? Sert à ordonner les interlocuteurs. */
export function workFocused(answers: Answers): boolean {
  const has = (q: string, wanted: string[]) => values(answers, q).some((v) => wanted.includes(v));
  return (
    has('pathway', ['internship', 'job', 'jobsearch']) ||
    has('st_next', ['internship', 'alternance', 'first_job']) ||
    has('ctx_student', ['work', 'recruit'])
  );
}

export const SENSITIVE_FLAGS = ['employer', 'stigma'];

/**
 * Interlocuteurs proposés pour un profil. Projet tourné vers le travail : le référent « travail »
 * du pôle passe avant les autres. Crainte du regard des autres : les professionnels tenus au
 * secret médical passent en premier.
 */
export function orderContacts(
  keys: string[],
  options: {
    workFocused: boolean;
    sensitive: boolean;
    confidential: Set<string>;
    work: Set<string>;
  },
): string[] {
  let ordered = [...keys];
  if (options.workFocused) {
    ordered = [
      ...ordered.filter((k) => options.work.has(k)),
      ...ordered.filter((k) => !options.work.has(k)),
    ];
  }
  if (options.sensitive) {
    const rank = (k: string) => (options.confidential.has(k) ? 0 : 1);
    ordered = [...ordered].sort((a, b) => rank(a) - rank(b));
  }
  return ordered;
}
