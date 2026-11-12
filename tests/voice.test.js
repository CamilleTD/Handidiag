'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { pickVoice, splitSentences, makeChunks } = require('../public/js/voice.js');

const V = (name, lang, local, uri, def) => ({ name, lang, localService: local, voiceURI: uri || name, default: !!def });
const voices = [
  V('Microsoft Hortense - French (France)', 'fr-FR', true),
  V('Microsoft Denise Online (Natural) - French (France)', 'fr-FR', false),
  V('Google français', 'fr-FR', false),
  V('Thomas', 'fr-FR', true),
  V('eSpeak French compact', 'fr-FR', true),
  V('Google UK English Female', 'en-GB', false),
  V('Daniel', 'en-GB', true)
];

test('voix en ligne autorisee : la voix naturelle est preferee a la voix robotique', () => {
  const v = pickVoice(voices, 'fr', { allowOnline: true });
  assert.match(v.name, /Natural/);
});

test('voix locale uniquement : jamais de voix en ligne, jamais de voix robotique si mieux existe', () => {
  const v = pickVoice(voices, 'fr', { allowOnline: false });
  assert.strictEqual(v.localService, true);
  assert.ok(!/espeak/i.test(v.name));
});

test('le choix explicite de l\'utilisateur est respecte, meme en ligne', () => {
  const v = pickVoice(voices, 'fr', { allowOnline: false, preferred: 'Google français' });
  assert.strictEqual(v.name, 'Google français');
});

test('une voix choisie pour une autre langue est ignoree', () => {
  const v = pickVoice(voices, 'fr', { preferred: 'Daniel' });
  assert.ok(v === null || v.lang.startsWith('fr'));
});

test('aucune voix de la langue -> null (le navigateur choisira)', () => {
  assert.strictEqual(pickVoice(voices, 'de', {}), null);
  assert.strictEqual(pickVoice([], 'fr', { allowOnline: true }), null);
});

test('decoupage en phrases : pauses plus longues entre blocs qu\'entre phrases', () => {
  assert.deepStrictEqual(splitSentences('Bonjour. Comment allez-vous ? Très bien !'), ['Bonjour.', 'Comment allez-vous ?', 'Très bien !']);
  const chunks = makeChunks([{ text: 'Une phrase. Une autre.', pause: 500 }, { text: 'Fin' }]);
  assert.strictEqual(chunks.length, 3);
  assert.strictEqual(chunks[0].pause, 160);
  assert.strictEqual(chunks[1].pause, 500);
  assert.strictEqual(chunks[2].pause, 350);
});
