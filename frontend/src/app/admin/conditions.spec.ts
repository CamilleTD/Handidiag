import { describe as suite, expect, it } from 'vitest';
import { translate } from '../../testing/i18n';
import type { Condition, LocalizedText, Question } from '../core/models';
import { describe, emptyLeaf, leafOperator } from './conditions';

const t = (key: string, vars?: Record<string, string | number>) =>
  translate('fr', `admin.${key}`, vars);
const text = (value: LocalizedText | null | undefined) => value?.fr ?? '';

const label = (fr: string): LocalizedText => ({ fr, en: '' });
const questions: Question[] = [
  {
    key: 'duration',
    kind: 'single',
    text: label('Depuis quand ?'),
    text_falc: null,
    help: null,
    options: [
      { key: 'short', exclusive: false, label: label('Moins de 6 mois') },
      { key: 'long', exclusive: false, label: label('Plus de 6 mois') },
    ],
  },
  {
    key: 'needs',
    kind: 'multiple',
    text: label('Besoins'),
    text_falc: null,
    help: null,
    options: [
      { key: 'time', exclusive: false, label: label('Temps') },
      { key: 'room', exclusive: false, label: label('Salle') },
    ],
  },
];
const sum = (c: Condition | null) => describe(c, questions, t, text);

suite('résumé lisible des conditions', () => {
  it('sans condition : toujours', () => {
    expect(sum(null)).toBe('toujours');
  });

  it('affiche les libellés des réponses plutôt que leurs clés', () => {
    expect(sum({ q: 'duration', in: ['long'] })).toBe('duration = « Plus de 6 mois »');
    expect(sum({ q: 'duration', in: ['short', 'long'] })).toBe(
      'duration = « Moins de 6 mois » ou « Plus de 6 mois »',
    );
  });

  it('garde la clé d’une réponse inconnue', () => {
    expect(sum({ q: 'duration', in: ['gone'] })).toBe('duration = « gone »');
  });

  it('décrit chaque opérateur', () => {
    expect(sum({ q: 'needs', hasAny: ['time'] })).toBe('needs contient « Temps »');
    expect(sum({ q: 'needs', countAtLeast: 2 })).toBe('needs : au moins 2 réponse(s)');
    expect(sum({ q: 'needs', countAtLeast: 1, among: ['room'] })).toBe(
      'needs : au moins 1 parmi « Salle »',
    );
    expect(sum({ q: 'needs', answered: true })).toBe('needs répondue');
    expect(sum({ q: 'needs', answered: false })).toBe('needs non répondue');
  });

  it('met entre parenthèses les groupes imbriqués', () => {
    const condition: Condition = {
      all: [
        { q: 'duration', in: ['long'] },
        {
          any: [
            { q: 'needs', hasAny: ['time'] },
            { q: 'needs', answered: false },
          ],
        },
      ],
    };
    expect(sum(condition)).toBe(
      'duration = « Plus de 6 mois » ET (needs contient « Temps » OU needs non répondue)',
    );
    expect(sum({ not: { q: 'duration', in: ['short'] } })).toBe(
      'NON duration = « Moins de 6 mois »',
    );
  });
});

suite('outils de l’éditeur de conditions', () => {
  it('reconnaît l’opérateur d’une condition simple', () => {
    expect(leafOperator({ q: 'needs', countAtLeast: 1 })).toBe('countAtLeast');
    expect(leafOperator({ all: [] })).toBeNull();
  });

  it('propose une première condition sur la première question', () => {
    expect(emptyLeaf(questions)).toEqual({ q: 'duration', in: ['short'] });
    expect(emptyLeaf([])).toEqual({ q: '', in: [] });
  });
});
