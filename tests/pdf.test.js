'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { build, wrap, textW, toBytes } = require('../public/js/pdf.js');

const long = 'Ceci est une phrase assez longue pour obliger le moteur à passer à la ligne plusieurs fois, avec des accents : é è à ç ù œ « guillemets » et une apostrophe ’ typographique. ';
function sample(n) {
  const blocks = [{ type: 'title', text: 'Votre orientation' }, { type: 'notice', text: 'Ce résultat est une aide à l’orientation.' }];
  for (let i = 0; i < n; i++) {
    blocks.push({ type: 'h2', text: 'Section ' + i }, { type: 'p', text: long }, { type: 'bullet', text: long }, { type: 'check', text: 'Case à cocher ' + i });
  }
  blocks.push({ type: 'url', text: 'https://www.service-public.fr/particuliers/vosdroits/R19993', url: 'https://www.service-public.fr/particuliers/vosdroits/R19993' });
  return { title: 'HandiDiag – résumé', lang: 'fr-FR', footer: 'HandiDiag – page {n}/{total}', blocks };
}
const asString = (u8) => Buffer.from(u8).toString('latin1');

test('le PDF est structurellement valide : en-tête, fin, startxref et table xref exacts', () => {
  const s = asString(build(sample(12)));
  assert.ok(s.startsWith('%PDF-1.4'));
  assert.ok(s.endsWith('%%EOF\n'));
  const startxref = Number(/startxref\n(\d+)\n%%EOF/.exec(s)[1]);
  assert.strictEqual(s.slice(startxref, startxref + 4), 'xref');
  const m = /xref\n0 (\d+)\n/.exec(s.slice(startxref));
  const count = Number(m[1]);
  const entries = s.slice(startxref + m[0].length).split('\n').slice(0, count);
  assert.match(entries[0], /^0000000000 65535 f/);
  for (let i = 1; i < count; i++) {
    const off = Number(entries[i].slice(0, 10));
    assert.ok(s.slice(off).startsWith(i + ' 0 obj'), 'objet ' + i + ' introuvable à l\'offset ' + off);
  }
});

test('plusieurs pages sont créées quand le contenu est long, et /Count est exact', () => {
  const s = asString(build(sample(12)));
  const pages = (s.match(/\/Type \/Page /g) || []).length;
  const count = Number(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/.exec(s)[1]);
  assert.ok(pages >= 3, 'pages = ' + pages);
  assert.strictEqual(pages, count);
  assert.match(s, /HandiDiag/); // titre ASCII non requis, mais le producteur est présent
});

test('les accents français sont encodés en WinAnsi (é = E9, œ = 9C, « = AB)', () => {
  assert.deepStrictEqual(toBytes('é'), [0xe9]);
  assert.deepStrictEqual(toBytes('œ'), [0x9c]);
  assert.deepStrictEqual(toBytes('«»'), [0xab, 0xbb]);
  assert.deepStrictEqual(toBytes('’'), [0x92]);
  assert.deepStrictEqual(toBytes('→'), [63]);   // caractère non représentable : '?'
});

test('le retour à la ligne respecte la largeur maximale', () => {
  const maxW = 483;
  wrap(long.repeat(3), 11, false, maxW).forEach((ln) => assert.ok(textW(ln, 11, false) <= maxW, 'ligne trop large : ' + ln));
  wrap('x'.repeat(400), 11, false, maxW).forEach((ln) => assert.ok(textW(ln, 11, false) <= maxW));
  assert.ok(textW('Bonjour', 11, true) > textW('Bonjour', 11, false));
});

test('les liens sont cliquables (annotations URI) et la langue est déclarée', () => {
  const s = asString(build(sample(1)));
  assert.match(s, /\/Subtype \/Link/);
  assert.match(s, /\/URI \(https:\/\/www\.service-public\.fr\/particuliers\/vosdroits\/R19993\)/);
  assert.match(s, /\/Lang \(fr-FR\)/);
});

test('aucun caractère hors ASCII n\'est écrit dans le fichier (texte encodé en hexadécimal)', () => {
  const u8 = build(sample(3));
  for (const b of u8) assert.ok(b < 128, 'octet hors ASCII : ' + b);
});
