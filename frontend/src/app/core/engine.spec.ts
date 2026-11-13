import { describe, expect, it } from 'vitest';
import {
  check,
  collectContacts,
  evaluate,
  outcomeFromScore,
  prune,
  toggleOption,
  visibleQuestions,
} from './engine';
import type {
  Condition,
  Contact,
  Outcome,
  QuestionnaireQuestion,
  QuestionnaireSnapshot,
  Rule,
} from './models';

const text = (fr: string) => ({ fr, en: '' });
const question = (
  key: string,
  extra: Partial<QuestionnaireQuestion> = {},
): QuestionnaireQuestion => ({
  key,
  kind: 'single',
  text: text(key),
  text_falc: null,
  help: null,
  options: ['yes', 'no'].map((k) => ({ key: k, exclusive: false, label: text(k) })),
  required: false,
  show_if: null,
  auto_answer: null,
  ...extra,
});
const outcome = (key: string, min_score: number | null, contacts: string[] = []): Outcome => ({
  key,
  min_score,
  icon: 'book',
  title: text(key),
  body: text(key),
  body_falc: null,
  next: null,
  contacts,
});
const rule = (key: string, extra: Partial<Rule>): Rule => ({
  key,
  condition: { q: 'a', in: ['yes'] },
  points: 0,
  override: null,
  explanation: null,
  flags: [],
  suggestions: [],
  contacts: [],
  ...extra,
});
const contact = (key: string, is_confidential = false): Contact => ({
  key,
  icon: 'user',
  name: text(key),
  role: text(key),
  email: null,
  link_url: null,
  link_label: null,
  is_confidential,
  group: null,
});

const OUTCOMES = [
  outcome('explore', 0),
  outcome('talk', 3),
  outcome('talk_soon', 6),
  outcome('already', null),
];

describe('check', () => {
  const answers = { a: 'yes', areas: ['energy', 'senses'] };
  it.each([
    [{ q: 'a', in: ['yes'] }, true],
    [{ q: 'a', in: ['no'] }, false],
    [{ q: 'areas', hasAny: ['senses', 'other'] }, true],
    [{ q: 'areas', countAtLeast: 2 }, true],
    [{ q: 'areas', countAtLeast: 2, among: ['energy', 'other'] }, false],
    [{ q: 'missing', answered: false }, true],
    [{ all: [{ q: 'a', in: ['yes'] }, { not: { q: 'areas', hasAny: ['other'] } }] }, true],
    [
      {
        any: [
          { q: 'a', in: ['no'] },
          { q: 'areas', answered: true },
        ],
      },
      true,
    ],
  ] as [Condition, boolean][])('%j → %s', (condition, expected) => {
    expect(check(condition, answers)).toBe(expected);
  });
});

describe('evaluate', () => {
  it('additionne les points et choisit le dernier palier atteint', () => {
    const rules = [
      rule('r1', { points: 2 }),
      rule('r2', { points: 2, condition: { q: 'b', answered: true } }),
    ];
    expect(evaluate({ a: 'yes', b: 'x' }, rules, OUTCOMES).outcome).toBe('talk');
    expect(evaluate({ a: 'yes' }, rules, OUTCOMES).outcome).toBe('explore');
  });

  it('la première règle qui impose un résultat l’emporte sur le score', () => {
    const rules = [
      rule('big', { points: 10 }),
      rule('already', { override: 'already' }),
      rule('other', { override: 'explore' }),
    ];
    const result = evaluate({ a: 'yes' }, rules, OUTCOMES);
    expect(result.score).toBe(10);
    expect(result.outcome).toBe('already');
  });

  it('dédoublonne points d’attention et pistes', () => {
    const rules = [
      rule('r1', { flags: ['f'], suggestions: ['s'] }),
      rule('r2', { flags: ['f'], suggestions: ['s', 't'] }),
    ];
    const result = evaluate({ a: 'yes' }, rules, OUTCOMES);
    expect(result.flags).toEqual(['f']);
    expect(result.suggestions).toEqual(['s', 't']);
  });

  it('ignore les résultats sans seuil pour le calcul du score', () => {
    expect(outcomeFromScore(100, OUTCOMES)).toBe('talk_soon');
  });
});

describe('déroulé du questionnaire', () => {
  const snapshot: QuestionnaireSnapshot = {
    key: 'test',
    title: text('Test'),
    description: null,
    sections: [
      {
        title: text('Principal'),
        intro: null,
        optional: false,
        questions: [
          question('profile', { auto_answer: 'student' }),
          question('pole'),
          question('pole_check', { show_if: { q: 'pole', in: ['no'] } }),
        ],
      },
      {
        title: text('Plus'),
        intro: null,
        optional: true,
        questions: [question('detail', { show_if: { q: 'pole_check', in: ['yes'] } })],
      },
    ],
    outcomes: OUTCOMES,
    rules: [],
    flags: [],
    suggestions: [],
    contacts: [],
  };

  it('masque les questions conditionnelles et celles à réponse fixée', () => {
    expect(visibleQuestions(snapshot, { pole: 'yes' }, false).map((q) => q.key)).toEqual(['pole']);
    expect(visibleQuestions(snapshot, { pole: 'no' }, false).map((q) => q.key)).toEqual([
      'pole',
      'pole_check',
    ]);
    expect(visibleQuestions(snapshot, { pole: 'no', pole_check: 'yes' }, true)).toHaveLength(1);
  });

  it('retire les réponses devenues invisibles, garde celles des autres questionnaires', () => {
    const kept = prune(snapshot, { pole: 'yes', pole_check: 'no', duration: 'long' });
    expect(kept).toEqual({ pole: 'yes', duration: 'long', profile: 'student' });
  });

  it('une option exclusive décoche les autres, et inversement', () => {
    const multi = {
      options: [
        { key: 'a', exclusive: false },
        { key: 'b', exclusive: false },
        { key: 'none', exclusive: true },
      ],
    };
    expect(toggleOption(multi, ['a', 'b'], 'none', true)).toEqual(['none']);
    expect(toggleOption(multi, ['none'], 'a', true)).toEqual(['a']);
    expect(toggleOption(multi, ['a', 'b'], 'a', false)).toEqual(['b']);
  });
});

describe('interlocuteurs', () => {
  const snapshot: QuestionnaireSnapshot = {
    key: 'test',
    title: text('Test'),
    description: null,
    sections: [],
    outcomes: [outcome('talk', 0, ['pole'])],
    rules: [
      rule('profile', { contacts: ['mdph', 'doctor', 'pole'] }),
      rule('fear', { flags: ['stigma'], condition: { q: 'fear', in: ['yes'] } }),
    ],
    flags: [{ key: 'stigma', text: text('stigma'), highlight_confidential: true }],
    suggestions: [],
    contacts: [contact('pole'), contact('mdph'), contact('doctor', true)],
  };

  it('résultat d’abord, puis règles, sans doublon', () => {
    const evaluation = evaluate({ a: 'yes' }, snapshot.rules, snapshot.outcomes);
    const { contacts, confidentialFirst } = collectContacts(snapshot, evaluation);
    expect(contacts.map((c) => c.key)).toEqual(['pole', 'mdph', 'doctor']);
    expect(confidentialFirst).toBe(false);
  });

  it('secret médical en premier quand un point d’attention le demande', () => {
    const evaluation = evaluate({ a: 'yes', fear: 'yes' }, snapshot.rules, snapshot.outcomes);
    const { contacts, confidentialFirst } = collectContacts(snapshot, evaluation);
    expect(confidentialFirst).toBe(true);
    expect(contacts[0].key).toBe('doctor');
  });
});
