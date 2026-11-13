import { describe, expect, it } from 'vitest';
import {
  check,
  coreQuestions,
  evaluate,
  levelFromScore,
  orderContacts,
  poleOutcome,
  prune,
  toggleOption,
  visibleIn,
} from './engine';
import type { Condition, Level, Question, Rule } from './models';

const text = (fr: string) => ({ fr, en: '' });
const question = (key: string, extra: Partial<Question> = {}): Question => ({
  key,
  kind: 'single',
  phase: 'core',
  step: null,
  required: false,
  hidden: false,
  auto_answer: null,
  show_if: null,
  stop_if: null,
  tracks: [],
  text: text(key),
  text_falc: null,
  help: null,
  options: ['yes', 'no'].map((k) => ({ key: k, exclusive: false, label: text(k) })),
  ...extra,
});
const level = (key: string, min_score: number | null): Level => ({
  key,
  min_score,
  icon: 'book',
  title: text(key),
  body: text(key),
  body_falc: null,
});
const rule = (key: string, extra: Partial<Rule>): Rule => ({
  key,
  condition: { q: 'a', in: ['yes'] },
  points: 0,
  override_level: null,
  pole_outcome: null,
  explanation: null,
  flags: [],
  suggestions: [],
  ...extra,
});

const LEVELS = [
  level('explore', 0),
  level('talk', 3),
  level('talk_soon', 6),
  level('already', null),
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
    expect(evaluate({ a: 'yes', b: 'x' }, rules, LEVELS).level).toBe('talk');
    expect(evaluate({ a: 'yes' }, rules, LEVELS).level).toBe('explore');
  });

  it('la première règle qui impose un niveau l’emporte sur le score', () => {
    const rules = [
      rule('big', { points: 10 }),
      rule('already', { override_level: 'already' }),
      rule('other', { override_level: 'explore' }),
    ];
    const result = evaluate({ a: 'yes' }, rules, LEVELS);
    expect(result.score).toBe(10);
    expect(result.level).toBe('already');
  });

  it('dédoublonne points d’attention et pistes, « suggest » l’emporte sur « maybe »', () => {
    const rules = [
      rule('r1', { flags: ['f'], suggestions: ['s'], pole_outcome: 'maybe' }),
      rule('r2', { flags: ['f'], suggestions: ['s', 't'], pole_outcome: 'suggest' }),
      rule('r3', { pole_outcome: 'maybe' }),
    ];
    const result = evaluate({ a: 'yes' }, rules, LEVELS);
    expect(result.flags).toEqual(['f']);
    expect(result.suggestions).toEqual(['s', 't']);
    expect(result.pole).toBe('suggest');
  });

  it('ignore les niveaux sans seuil pour le calcul du score', () => {
    expect(levelFromScore(100, LEVELS)).toBe('talk_soon');
  });
});

describe('déroulé du questionnaire', () => {
  const questions = [
    question('profile', { hidden: true, auto_answer: 'student' }),
    question('pole', { step: 'pole' }),
    question('pole_next', {
      show_if: { q: 'pole', in: ['no'] },
      stop_if: { q: 'pole_next', in: ['end'] },
      options: ['rqth', 'end'].map((k) => ({ key: k, exclusive: false, label: text(k) })),
    }),
    question('duration'),
    question('detail', { phase: 'deep', show_if: { q: 'duration', in: ['yes'] } }),
    question('pole_fear', { phase: 'deep', tracks: ['pole'] }),
  ];

  it('masque les questions conditionnelles et les questions masquées', () => {
    expect(coreQuestions(questions, { pole: 'yes' }).map((q) => q.key)).toEqual([
      'pole',
      'duration',
    ]);
  });

  it('s’arrête après une question dont la condition d’arrêt est vraie', () => {
    const answers = { pole: 'no', pole_next: 'end' };
    expect(coreQuestions(questions, answers).map((q) => q.key)).toEqual(['pole', 'pole_next']);
    // Seules les questions complémentaires du parcours « pole » restent proposées
    expect(visibleIn(questions, 'deep', answers).map((q) => q.key)).toEqual(['pole_fear']);
  });

  it('retire les réponses devenues invisibles et garde les réponses automatiques', () => {
    const kept = prune(questions, { pole: 'yes', pole_next: 'end', duration: 'no', detail: 'yes' });
    expect(kept).toEqual({ profile: 'student', pole: 'yes', duration: 'no' });
  });

  it('une option exclusive décoche les autres, et inversement', () => {
    const multi = question('m', {
      kind: 'multiple',
      options: [
        { key: 'a', exclusive: false, label: text('a') },
        { key: 'b', exclusive: false, label: text('b') },
        { key: 'none', exclusive: true, label: text('none') },
      ],
    });
    expect(toggleOption(multi, ['a', 'b'], 'none', true)).toEqual(['none']);
    expect(toggleOption(multi, ['none'], 'a', true)).toEqual(['a']);
    expect(toggleOption(multi, ['a', 'b'], 'a', false)).toEqual(['b']);
  });
});

describe('restitution', () => {
  const evaluation = evaluate({}, [], LEVELS);

  it('choisit le message du pôle d’après les réponses', () => {
    expect(poleOutcome({ pole: 'yes' }, evaluation)).toBe('followed');
    expect(poleOutcome({ pole: 'no' }, evaluation)).toBe('declined');
    expect(poleOutcome({ pole: 'no', pole_check: 'yes' }, evaluation)).toBe('none');
    expect(poleOutcome({ pole: 'no', pole_check: 'yes' }, { ...evaluation, pole: 'maybe' })).toBe(
      'maybe',
    );
    expect(poleOutcome({}, evaluation)).toBeNull();
  });

  it('ordonne les interlocuteurs : travail d’abord, puis secret médical si la personne craint le regard', () => {
    const keys = ['pole_social', 'pole_career', 'health', 'mdph'];
    const options = { confidential: new Set(['health']), work: new Set(['pole_career']) };
    expect(orderContacts(keys, { ...options, workFocused: true, sensitive: false })).toEqual([
      'pole_career',
      'pole_social',
      'health',
      'mdph',
    ]);
    expect(orderContacts(keys, { ...options, workFocused: false, sensitive: true })[0]).toBe(
      'health',
    );
  });
});
