'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { evaluate, check } = require('../public/js/engine.js');

const pub = path.join(__dirname, '..', 'public');
const read = (p) => JSON.parse(fs.readFileSync(path.join(pub, p), 'utf8'));
const rules = read('data/rules.json');
const questions = read('data/questions.json').questions;
const fr = read('i18n/fr.json');
const en = read('i18n/en.json');
const resources = read('data/resources.json');

/* ---------- Scenarios de demonstration (personas) ---------- */

test('Salarie, fatigue chronique, plusieurs besoins -> echange rapide conseille', () => {
  const r = evaluate({ profile: 'employee', duration: 'long', areas: ['energy'], frequency: 'often',
    needs: ['schedule', 'breaks', 'remote'], pathway: ['job'], support: 'none', awareness: 'partial',
    barriers: ['employer'], urgency: 'months' }, rules);
  assert.strictEqual(r.level, 'talk_soon');
  assert.ok(r.flags.includes('employer'));
  assert.ok(r.flags.includes('no_support'));
});

test('Etudiant avec difficultes de lecture, peu de besoins -> echange utile', () => {
  const r = evaluate({ profile: 'student', duration: 'unsure', areas: ['attention'], frequency: 'sometimes',
    needs: ['extra_time'], pathway: ['studies'], support: 'none', awareness: 'unknown' }, rules);
  assert.strictEqual(r.level, 'talk');
  assert.ok(r.flags.includes('needs_info'));
});

test('Aucun signal -> information seulement', () => {
  const r = evaluate({ profile: 'jobseeker', duration: 'none', frequency: 'never', needs: ['none'], pathway: ['none'] }, rules);
  assert.strictEqual(r.level, 'explore');
  assert.strictEqual(r.overridden, 'explore');
});

test('RQTH deja detenue -> parcours "already", quel que soit le score', () => {
  const r = evaluate({ profile: 'public_agent', support: 'has_rqth', duration: 'long', frequency: 'always',
    needs: ['schedule', 'workstation', 'breaks'], pathway: ['job'], areas: ['mobility'] }, rules);
  assert.strictEqual(r.level, 'already');
  assert.ok(r.flags.includes('already_rqth'));
});

test('Questionnaire entierement saute (sauf le profil) -> pas de plantage, niveau explore', () => {
  const r = evaluate({ profile: 'student' }, rules);
  assert.strictEqual(r.level, 'explore');
  assert.strictEqual(r.score, 0);
});

test('Le moteur est deterministe et explicable : chaque regle declenchee est listee', () => {
  const answers = { profile: 'employee', duration: 'long', frequency: 'always', areas: ['psych'] };
  const a = evaluate(answers, rules), b = evaluate(answers, rules);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.score, a.matched.reduce((s, m) => s + m.points, 0));
});

test('Les urgences et freins ne modifient pas le score (pas de decision sensible automatique)', () => {
  const base = { profile: 'employee', duration: 'short', frequency: 'sometimes' };
  const plain = evaluate(base, rules);
  const withFlags = evaluate(Object.assign({}, base, { urgency: 'urgent', barriers: ['stigma', 'time'], awareness: 'unknown' }), rules);
  assert.strictEqual(plain.score, withFlags.score);
  assert.strictEqual(plain.level, withFlags.level);
});

/* ---------- Coherence du contenu ---------- */

const profiles = ['student', 'employee', 'jobseeker', 'public_agent'];
const coreOf = (answers) => questions.filter((q) => !q.hidden && (q.phase || 'core') === 'core' && (!q.showIf || check(q.showIf, answers)));
const deepOf = (answers) => questions.filter((q) => q.phase === 'deep' && (!q.showIf || check(q.showIf, answers)));

test('Questions ESSENTIELLES : entre 8 et 12 par parcours (profil x avec/sans difficulte), dont une propre au profil', () => {
  profiles.forEach((profile) => ['none', 'unsure', 'short', 'long'].forEach((duration) => {
    const core = coreOf({ profile, duration });
    assert.ok(core.length >= 8 && core.length <= 12, profile + '/' + duration + ' : ' + core.length + ' questions essentielles');
    assert.ok(core.some((q) => q.id.startsWith('ctx_')), profile + ' : pas de question propre au profil');
  }));
});

test('Parcours ADAPTATIF : sans difficulte, les questions sur les symptomes disparaissent et d\'autres apparaissent', () => {
  const none = coreOf({ profile: 'employee', duration: 'none' }).map((q) => q.id);
  const diff = coreOf({ profile: 'employee', duration: 'long' }).map((q) => q.id);
  ['areas', 'frequency', 'needs'].forEach((id) => { assert.ok(!none.includes(id) && diff.includes(id), id); });
  ['for_whom', 'worry'].forEach((id) => { assert.ok(none.includes(id) && !diff.includes(id), id); });
});

test('Questions COMPLEMENTAIRES : suivent le profil et les domaines coches', () => {
  const ids = (a) => deepOf(a).map((q) => q.id);
  const stu = ids({ profile: 'student', duration: 'long', areas: ['energy', 'attention'], frequency: 'often', ctx_student: ['exams', 'work'] });
  ['energy_when', 'energy_effects', 'attn_tasks', 'st_year', 'st_exam_detail', 'st_work_detail', 'goals'].forEach((id) => assert.ok(stu.includes(id), 'etudiant : ' + id));
  ['senses_which', 'mob_aspects', 'emp_manager', 'js_obstacles', 'pub_referent'].forEach((id) => assert.ok(!stu.includes(id), 'etudiant ne doit pas avoir : ' + id));
  const emp = ids({ profile: 'employee', duration: 'long', areas: ['senses', 'mobility'] });
  ['senses_which', 'mob_aspects', 'emp_manager', 'emp_occ'].forEach((id) => assert.ok(emp.includes(id), 'salarie : ' + id));
  assert.ok(!emp.includes('st_year'));
  const rel = ids({ profile: 'employee', duration: 'none', for_whom: 'relative' });
  assert.ok(rel.includes('sup_goal') && rel.includes('sup_worry') && !rel.includes('prev_interest'));
  const self = ids({ profile: 'employee', duration: 'none', for_whom: 'self' });
  assert.ok(self.includes('prev_interest') && !self.includes('sup_goal'));
});

test('Les questions complementaires n\'ajoutent JAMAIS de points (elles personnalisent seulement les pistes)', () => {
  const deepIds = new Set(questions.filter((q) => q.phase === 'deep').map((q) => q.id));
  const qsIn = (c) => (c.q ? [c.q] : [].concat(c.all || [], c.any || [], c.not ? [c.not] : []).flatMap(qsIn));
  rules.rules.forEach((r) => {
    const refs = qsIn(r.when);
    if (refs.some((x) => deepIds.has(x))) assert.strictEqual(r.points || 0, 0, r.id + ' reference une question complementaire mais ajoute des points');
  });
  const base = { profile: 'student', duration: 'long', areas: ['energy'], frequency: 'often', needs: ['breaks'], pathway: ['studies'] };
  const withDeep = Object.assign({}, base, { energy_effects: ['sitting'], energy_rest: 'planned', st_exam_detail: ['extra_time'], goals: ['keep_job', 'funding'], helper: 'would_like' });
  assert.strictEqual(evaluate(base, rules).score, evaluate(withDeep, rules).score);
  assert.strictEqual(evaluate(base, rules).level, evaluate(withDeep, rules).level);
});

test('Pistes : les reponses cochees produisent des pistes adaptees (et seulement elles)', () => {
  const r = evaluate({ profile: 'student', duration: 'long', areas: ['energy', 'attention'], ctx_student: ['exams'],
    energy_effects: ['sitting', 'commuting'], attn_tasks: ['reading', 'listening'], st_exam_detail: ['extra_time'], st_contact: 'no', st_year: 'graduating' }, rules);
  ['posture', 'commute', 'reading_writing', 'listening', 'exam_request', 'contact_school', 'transition'].forEach((id) => assert.ok(r.todo.includes(id), 'piste attendue : ' + id));
  ['vision', 'hearing', 'manager_ok', 'interview', 'prevention_doc'].forEach((id) => assert.ok(!r.todo.includes(id), 'piste non attendue : ' + id));
  assert.deepStrictEqual(evaluate({ profile: 'student' }, rules).todo, []);
});

test('Personne sans difficulte qui accompagne un proche : points d\'attention de confidentialite, pas de piste medicale', () => {
  const r = evaluate({ profile: 'employee', duration: 'none', for_whom: 'relative', sup_goal: ['talk'], sup_worry: ['confidentiality'] }, rules);
  assert.strictEqual(r.level, 'explore');
  ['for_relative', 'sup_confidentiality'].forEach((f) => assert.ok(r.flags.includes(f), f));
  assert.ok(r.todo.includes('how_to_talk'));
});

test('La question de profil est toujours posee en premier et jamais conditionnelle', () => {
  assert.strictEqual(questions[0].id, 'profile');
  assert.ok(!questions[0].showIf);
});

test('Chaque question et option a un texte en francais ET en anglais', () => {
  [['fr', fr], ['en', en]].forEach(([lang, d]) => {
    questions.forEach((q) => {
      assert.ok(d.questions[q.id] && d.questions[q.id].text, lang + ' texte manquant : ' + q.id);
      q.options.forEach((o) => assert.ok(d.questions[q.id].options[o.id], lang + ' option manquante : ' + q.id + '.' + o.id));
    });
  });
});

test('Chaque regle qui compte des points (ou force un niveau) a une explication lisible, en FR et EN', () => {
  rules.rules.filter((r) => r.points > 0 || r.override).forEach((r) => {
    assert.ok(fr.rules[r.id], 'FR manquant : ' + r.id);
    assert.ok(en.rules[r.id], 'EN manquant : ' + r.id);
  });
});

test('Chaque piste (todo) utilisee par une regle a un texte FR/EN, et chaque texte de piste est utilise', () => {
  const used = new Set(); rules.rules.forEach((r) => (r.todo || []).forEach((x) => used.add(x)));
  used.forEach((id) => { assert.ok(fr.todo[id] && en.todo[id], 'piste sans texte : ' + id); });
  Object.keys(fr.todo).forEach((id) => assert.ok(used.has(id), 'texte de piste inutilise : ' + id));
  assert.deepStrictEqual(Object.keys(fr.todo).sort(), Object.keys(en.todo).sort());
});

test('Les pistes sont formulees avec prudence : aucune injonction ni promesse', () => {
  const imperative = /(vous devez|il faut absolument|vous allez obtenir|garanti)/i;
  [fr, en].forEach((d) => Object.values(d.todo).forEach((txt) => assert.ok(!imperative.test(txt), 'formulation trop directive : ' + txt)));
});

test('Chaque drapeau et chaque niveau a un message FR/EN', () => {
  const flags = new Set(); rules.rules.forEach((r) => (r.flags || []).forEach((f) => flags.add(f)));
  flags.forEach((f) => { assert.ok(fr.flags[f], 'FR flag ' + f); assert.ok(en.flags[f], 'EN flag ' + f); });
  const levels = rules.levels.map((l) => l.id).concat(['already']);
  levels.forEach((l) => { assert.ok(fr.levels[l] && en.levels[l], 'niveau ' + l); });
});

test('Aucune formulation d\'eligibilite ou de promesse dans les messages de resultat', () => {
  const forbidden = /(éligible|eligible|vous avez droit|vous obtiendrez|you are entitled|you will (get|be granted)|you qualify|vous remplissez les conditions)/i;
  [fr, en].forEach((d) => {
    const bag = JSON.stringify([d.levels, d.flags, d.todo, d.rules, d.result]);
    assert.ok(!forbidden.test(bag), 'formulation interdite trouvee : ' + (bag.match(forbidden) || [])[0]);
  });
});

test('Les variantes FALC sont plus courtes que les textes standard', () => {
  [fr, en].forEach((d) => {
    assert.ok(d.info.what_falc.length < d.info.what.length);
    Object.keys(d.levels).forEach((k) => assert.ok(d.levels[k].body_falc.length <= d.levels[k].body.length));
  });
});

test('Contacts : chaque profil a des contacts definis, et chaque lien pointe vers une ressource officielle https', () => {
  ['student', 'employee', 'jobseeker', 'public_agent'].forEach((p) => {
    assert.ok(resources.contacts[p].length > 0);
    resources.contacts[p].forEach((c) => {
      assert.ok(resources.contact_defs[c], 'contact_defs manquant : ' + c);
      assert.ok(fr.contacts[c] && en.contacts[c], 'texte contact manquant : ' + c);
    });
  });
  resources.official_links.forEach((l) => {
    assert.ok(/^https:\/\//.test(l.url), l.id);
    assert.ok(fr.links[l.id] && en.links[l.id], 'texte lien manquant : ' + l.id);
  });
});

/* ---------- Nouvelles questions : drapeaux contextuels sans effet sur le score ---------- */

test('Les questions contextuelles et le suivi medical ne modifient jamais le score', () => {
  const base = { profile: 'student', duration: 'long', frequency: 'sometimes', needs: ['extra_time'], pathway: ['studies'] };
  const plain = evaluate(base, rules);
  const ctx = evaluate(Object.assign({}, base, { ctx_student: ['exams', 'work'], followup: 'none' }), rules);
  assert.strictEqual(plain.score, ctx.score);
  assert.ok(ctx.flags.includes('student_exam') && ctx.flags.includes('student_work') && ctx.flags.includes('see_doctor'));
});

test('Drapeaux par profil : horaires decales, recherche longue, statut contractuel', () => {
  assert.ok(evaluate({ profile: 'employee', ctx_employee: 'shifts' }, rules).flags.includes('shift_work'));
  assert.ok(evaluate({ profile: 'jobseeker', ctx_jobseeker: 'long' }, rules).flags.includes('long_search'));
  assert.ok(evaluate({ profile: 'public_agent', ctx_public: 'contract' }, rules).flags.includes('public_status'));
  assert.ok(!evaluate({ profile: 'employee', ctx_employee: 'fixed' }, rules).flags.includes('shift_work'));
});

test('Polices : fichiers presents, licences incluses, formats woff2', () => {
  const dir = path.join(pub, 'fonts');
  ['atkinson-hyperlegible', 'lexend', 'opendyslexic'].forEach((f) => {
    [400, 700].forEach((w) => assert.ok(fs.existsSync(path.join(dir, f + '-latin-' + w + '-normal.woff2')), f + ' ' + w));
    assert.ok(fs.existsSync(path.join(dir, 'LICENSE-' + f + '.txt')), 'licence ' + f);
  });
  const css = fs.readFileSync(path.join(pub, 'css', 'style.css'), 'utf8');
  assert.ok(!/https?:\/\//.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'aucune ressource distante dans le CSS');
});

/* ---------- Edition etudiants : pole handicap et monde du travail ---------- */

test('Pole handicap : la 1re question visible est « pole » ; « pole_join » seulement si la reponse est non', () => {
  const visible = (a) => coreOf(Object.assign({ profile: 'student' }, a)).map((q) => q.id);
  assert.strictEqual(visible({})[0], 'pole');
  assert.ok(!visible({ pole: 'yes' }).includes('pole_join'));
  assert.ok(visible({ pole: 'no' }).includes('pole_join'));
  assert.ok(!visible({}).includes('pole_join'), 'question passee : pas de question sur l\'adhesion');
  const deepIds = (a) => deepOf(Object.assign({ profile: 'student' }, a)).map((q) => q.id);
  assert.ok(!deepIds({ pole: 'yes', duration: 'long' }).includes('st_contact'), 'deja suivi : on ne demande pas si le pole a deja ete contacte');
  assert.ok(deepIds({ pole: 'no', duration: 'long' }).includes('st_contact'));
  assert.ok(questions.find((q) => q.id === 'profile').hidden, 'la question de profil est masquee');
});

test('Pole handicap : pistes selon les reponses, contacts par e-mail uniquement (pas de Teams)', () => {
  assert.ok(evaluate({ profile: 'student', pole: 'yes' }, rules).todo.includes('pole_member_rqth'));
  assert.ok(evaluate({ profile: 'student', pole: 'no', pole_join: 'yes' }, rules).todo.includes('pole_join_yes'));
  assert.ok(!evaluate({ profile: 'student', pole: 'no', pole_join: 'no' }, rules).todo.includes('pole_join_yes'));
  const res = read('data/resources.json');
  assert.deepStrictEqual(res.pole_contacts, ['pole_social', 'pole_rse']);
  assert.strictEqual(res.contact_defs.pole_social.email, 'charlie.dupic@efrei.fr');
  assert.strictEqual(res.contact_defs.pole_rse.email, 'stephanie.libeskind@efrei.fr');
  assert.ok(!JSON.stringify(res).toLowerCase().includes('teams'));
  assert.deepStrictEqual(res.contacts.student.slice(0, 2), ['pole_social', 'pole_rse']);
});

test('Monde du travail : pistes pour stage, alternance, recrutement', () => {
  const t = (a) => evaluate(Object.assign({ profile: 'student' }, a), rules).todo;
  assert.ok(t({ pathway: ['internship'] }).includes('rqth_work_value'));
  assert.ok(t({ st_next: 'alternance' }).includes('alternance_rqth'));
  assert.ok(t({ recruit: ['tests'] }).includes('recruit_adapt'));
  assert.ok(t({ recruit: ['cv'] }).includes('disclosure'));
  assert.ok(t({ ctx_student: ['recruit'] }).includes('recruit_adapt'));
});

test('Aucune question n\'est obligatoire : « Je prefere ne pas repondre » partout', () => {
  assert.ok(questions.every((q) => !q.required));
});
