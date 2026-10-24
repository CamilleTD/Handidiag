/*
 * HandiDiag - moteur de regles explicable.
 * Fonction pure : evaluate(answers, rules) -> { score, level, matched, flags, todo, overridden }
 * flags = points d'attention ; todo = pistes pour avancer (jamais de conseil medical ni de decision).
 * Utilisable dans le navigateur (window.HandiEngine) et dans Node (tests).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HandiEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function asArray(v) {
    if (v === undefined || v === null || v === '') return [];
    return Array.isArray(v) ? v : [v];
  }

  // Evalue une condition lisible : all / any / not / in / hasAny / countAtLeast / answered
  function check(cond, answers) {
    if (cond.all) return cond.all.every(function (c) { return check(c, answers); });
    if (cond.any) return cond.any.some(function (c) { return check(c, answers); });
    if (cond.not) return !check(cond.not, answers);
    var a = asArray(answers[cond.q]);
    if (cond.in) return a.some(function (v) { return cond.in.indexOf(v) !== -1; });
    if (cond.hasAny) return a.some(function (v) { return cond.hasAny.indexOf(v) !== -1; });
    if (cond.countAtLeast !== undefined) {
      var pool = cond.among ? a.filter(function (v) { return cond.among.indexOf(v) !== -1; }) : a;
      return pool.length >= cond.countAtLeast;
    }
    if (cond.answered !== undefined) return (a.length > 0) === cond.answered;
    return false;
  }

  function levelFromScore(score, levels) {
    var current = levels[0].id;
    levels.forEach(function (l) { if (score >= l.min) current = l.id; });
    return current;
  }

  function evaluate(answers, rules) {
    answers = answers || {};
    var matched = [];
    var score = 0;
    var flags = [];
    var todo = [];
    var overridden = null;

    rules.rules.forEach(function (r) {
      if (!check(r.when, answers)) return;
      matched.push({ id: r.id, points: r.points || 0 });
      score += r.points || 0;
      (r.flags || []).forEach(function (f) { if (flags.indexOf(f) === -1) flags.push(f); });
      (r.todo || []).forEach(function (x) { if (todo.indexOf(x) === -1) todo.push(x); });
      if (r.override && !overridden) overridden = r.override; // la premiere regle d'override l'emporte
    });

    var level = overridden || levelFromScore(score, rules.levels);
    return { score: score, level: level, matched: matched, flags: flags, todo: todo, overridden: overridden };
  }

  return { evaluate: evaluate, check: check, levelFromScore: levelFromScore };
});
