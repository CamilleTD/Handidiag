/*
 * HandiDiag - lecture a voix haute plus naturelle (aucune dependance, aucun service tiers ajoute).
 *  - pickVoice : choisit la meilleure voix disponible du navigateur (neurale / naturelle de preference),
 *                en restant sur une voix LOCALE si allowOnline est faux (protection de la vie privee).
 *  - makeChunks : decoupe le texte en phrases courtes avec des pauses, comme le ferait un lecteur humain
 *                (evite aussi la coupure des longs textes constatee sur certains navigateurs).
 * Utilisable dans le navigateur (window.HandiVoice) et dans Node (tests).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HandiVoice = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var NATURAL = /natural|neural|premium|enhanced|am[ée]lior|siri|wavenet|studio|online/i;
  var ROBOTIC = /compact|espeak|robot|festival|mbrola|novelty/i;

  function norm(tag) { return String(tag || '').toLowerCase().replace('_', '-'); }
  function sameLanguage(v, lang) { return norm(v.lang).indexOf(norm(lang).slice(0, 2)) === 0; }

  function score(v, lang) {
    var s = 0, name = v.name || '';
    if (norm(v.lang) === (lang === 'fr' ? 'fr-fr' : lang === 'en' ? 'en-gb' : norm(lang))) s += 10;
    if (NATURAL.test(name)) s += 40;
    if (/google/i.test(name)) s += 25;
    if (/microsoft/i.test(name)) s += 15;
    if (ROBOTIC.test(name)) s -= 40;
    if (v.localService !== false) s += 5;
    if (v.default) s += 2;
    return s;
  }

  // voices : tableau de SpeechSynthesisVoice ; opts : { preferred (voiceURI), allowOnline }
  function pickVoice(voices, lang, opts) {
    opts = opts || {};
    var pool = (voices || []).filter(function (v) { return sameLanguage(v, lang); });
    if (opts.preferred) {
      var chosen = pool.filter(function (v) { return v.voiceURI === opts.preferred; })[0];
      if (chosen) return chosen;
    }
    if (!opts.allowOnline) pool = pool.filter(function (v) { return v.localService !== false; });
    if (!pool.length) return null;
    return pool.slice().sort(function (a, b) { return score(b, lang) - score(a, lang); })[0];
  }

  function splitSentences(text) {
    var parts = String(text || '').replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]*/g) || [];
    return parts.map(function (p) { return p.trim(); }).filter(Boolean);
  }

  // parts : [{ text, el, pause }] -> [{ text, el, pause }] (une entree par phrase)
  function makeChunks(parts) {
    var out = [];
    parts.forEach(function (p) {
      var sentences = splitSentences(p.text);
      sentences.forEach(function (s, i) {
        out.push({ text: s, el: p.el || null, pause: i === sentences.length - 1 ? (p.pause === undefined ? 350 : p.pause) : 160 });
      });
    });
    return out;
  }

  return { pickVoice: pickVoice, splitSentences: splitSentences, makeChunks: makeChunks, score: score };
});
