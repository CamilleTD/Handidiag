'use strict';
/*
 * Tests de bout en bout dans un VRAI navigateur (Chrome ou Edge), hors dependances d'execution du site.
 *   npm install            (installe puppeteer-core et axe-core, en devDependencies)
 *   npm run e2e
 * Variables utiles : CHROME_PATH (chemin du navigateur), HEADLESS (true | shell), CHROME_ARGS_JSON (liste d'options),
 *                    E2E_SHOTS=dossier  pour enregistrer des captures d'ecran.
 * Verifie : parcours complet sur 3 formats d'ecran, questionnaire adaptatif (essentiel puis complementaire), pistes,
 * reglages en page, absence de debordement / chevauchement / texte coupe a 50 % et 300 %, polices a la demande,
 * profils, bouton retour, PDF reellement telecharge, poids transfere, espace administrateur (connexion, donnees
 * fictives, remise a zero, changement de mot de passe) et accessibilite automatique (axe-core, WCAG 2.2 AA).
 */
const fs = require('fs'), os = require('os'), path = require('path');
const puppeteer = require('puppeteer-core');
const { createServer, DEMO_USER, DEMO_PASSWORD } = require('../server.js');

const CANDIDATES = [process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const exe = CANDIDATES.filter(Boolean).find((p) => fs.existsSync(p));
if (!exe) { console.error('Aucun navigateur trouve. Definir CHROME_PATH (Chrome ou Edge).'); process.exit(2); }
const args = process.env.CHROME_ARGS_JSON ? JSON.parse(process.env.CHROME_ARGS_JSON) : [];
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const SHOTS = process.env.E2E_SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = {
  telephone: { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablette: { width: 768, height: 1024, isMobile: true, hasTouch: true },
  ordinateur: { width: 1280, height: 800 }
};
// Parcours essentiel d'un etudiant avec difficultes : 12 questions
const ANSWERS = [['pole', 'no'], ['pole_join', 'yes'], ['duration', 'long'], ['areas', 'energy'], ['frequency', 'often'], ['needs', 'extra_time'],
  ['pathway', 'studies'], ['ctx_student', 'exams'], ['support', 'none'], ['awareness', 'partial'], ['barriers', 'employer'], ['urgency', 'soon']];

let pass = 0; const failures = [];
function ok(cond, label, detail) { if (cond) { pass++; console.log('  \u2714 ' + label); } else { failures.push(label + (detail ? ' : ' + detail : '')); console.log('  \u2718 ' + label + (detail ? ' : ' + detail : '')); } }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hd-e2e-'));
  const server = createServer({ k: 5, statsFile: path.join(dir, 's.json'), adminFile: path.join(dir, 'a.json'), logFile: null, quiet: true });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await puppeteer.launch({ executablePath: exe, args, headless: process.env.HEADLESS === 'shell' ? 'shell' : true });

  const headerOverlaps = (p) => p.evaluate(() => {
    const els = ['.brand', '#lang-quick', '#settings-btn', '#nav'].map((s) => document.querySelector(s)).filter(Boolean);
    const rs = els.map((e) => ({ n: e.id || e.className.split(' ')[0], r: e.getBoundingClientRect() }));
    const bad = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i].r, b = rs[j].r;
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push(rs[i].n + ' x ' + rs[j].n);
    }
    return bad;
  });
  const clipped = (p) => p.evaluate(() => [...document.querySelectorAll('nav a, .btn, .choice, .profile-btn')]
    .filter((e) => e.offsetParent !== null && e.scrollWidth > e.clientWidth + 1).map((e) => (e.textContent || '').trim().slice(0, 30)));
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const click = async (p, sel, re) => { const r = await p.evaluate((sel, re) => { const e = [...document.querySelectorAll(sel)].find((x) => x.offsetParent !== null && new RegExp(re, 'i').test(x.textContent)); if (!e) return false; e.click(); return true; }, sel, re); await wait(180); return r; };
  const pick = (p, q, v) => p.evaluate((q, v) => { const i = document.querySelector('input[name="' + q + '"][value="' + v + '"]'); if (i) i.click(); return !!i; }, q, v);
  const openSettings = async (p) => { await p.evaluate(() => { if (location.hash !== '#/settings') document.getElementById('settings-btn').click(); }); await wait(250); };
  const closeSettings = async (p) => { await p.evaluate(() => { if (location.hash === '#/settings') document.getElementById('settings-x').click(); }); await wait(300); };
  const setRange = (p, id, v) => p.evaluate((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, id, v);
  const shot = (p, name, full) => SHOTS ? p.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: !!full }) : null;
  const hash = (p) => p.evaluate(() => location.hash);
  // saisie des identifiants (l'identifiant reste pre-rempli apres une deconnexion ou un echec : on le remplace)
  const login = async (p, user, pass) => { await p.evaluate((u) => { document.getElementById('adm-user').value = u; document.getElementById('adm-pass').value = ''; }, user); await p.type('#adm-pass', pass); await click(p, 'button', 'Se connecter'); };
  async function open(vp, lang) {
    const p = await browser.newPage(); await p.setViewport(vp);
    await p.evaluateOnNewDocument((l) => Object.defineProperty(navigator, 'language', { value: l }), lang || 'fr-FR');
    p._errs = []; p._fonts = [];
    p.on('pageerror', (e) => p._errs.push(e.message));
    p.on('dialog', (d) => d.accept());
    p.on('requestfinished', (r) => { if (/\.woff2/.test(r.url())) p._fonts.push(r.url().split('/').pop()); });
    await p.goto(base, { waitUntil: 'networkidle0' }); await p.waitForSelector('main h1');
    return p;
  }
  // repond aux 12 questions essentielles (until = nombre de questions a traiter) puis, si until absent, choisit « Voir mon orientation »
  async function runAnswers(p, until) {
    await click(p, 'button', 'Commencer'); await p.waitForSelector('.quiz-card');
    for (let i = 0; i < ANSWERS.length; i++) { if (until !== undefined && i >= until) return; await pick(p, ANSWERS[i][0], ANSWERS[i][1]); await click(p, 'button', 'Valider'); }
    await click(p, 'button', 'Voir mon orientation maintenant');
  }

  // 1 -- Parcours complet sur 3 formats
  for (const [name, vp] of Object.entries(VIEWPORTS)) {
    console.log('\n[' + name + ' ' + vp.width + ' px] parcours complet');
    const p = await open(vp);
    ok((await overflow(p)) <= 1, 'accueil sans defilement horizontal');
    { const bad = await headerOverlaps(p); ok(bad.length === 0, 'en-tete sans chevauchement', bad.join(', ')); }
    ok(p._fonts.length === 0, 'aucune police telechargee par defaut', p._fonts.join(','));
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.footer-center')).textAlign === 'center' && /© Équipe HandiDiag/.test(document.querySelector('.footer-brand').textContent)), 'pied de page centre avec « © HandiDiag oriente et informe »');
    await wait(2000); await shot(p, name + '-1-accueil', true);
    // Nouveau parcours : pole handicap, bouton Valider visible, « Je prefere ne pas repondre », contacts e-mail
    await click(p, 'button', 'Commencer'); await p.waitForSelector('.quiz-card');
    ok(/pôle handicap/.test(await p.$eval('#q-title', (e) => e.textContent)), 'la 1re question porte sur le pole handicap');
    ok(await p.evaluate(() => { const b = document.querySelector('.btn-validate'); const r = b.getBoundingClientRect(); return /^Valider/.test(b.textContent.trim()) && r.top >= 0 && r.bottom <= innerHeight + 1; }), 'le bouton « Valider » est visible sans defiler');
    ok(await p.evaluate(() => [...document.querySelectorAll('.btn')].some((b) => /Je préfère ne pas répondre/.test(b.textContent))), 'bouton « Je prefere ne pas repondre » present');
    await pick(p, 'pole', 'no'); await click(p, 'button', 'Valider'); await pick(p, 'pole_join', 'yes');
    const panel = await p.evaluate(() => { const e = document.querySelector('.pole-panel'); return e && !e.hidden ? e.innerText + ' ' + [...e.querySelectorAll('a')].map((a) => a.href).join(' ') : ''; });
    ok(/charlie\.dupic@efrei\.fr/.test(panel) && /stephanie\.libeskind@efrei\.fr/.test(panel) && /Tiers-temps/.test(panel) && /Aides exceptionnelles/.test(panel) && !/teams/i.test(panel), 'contacts du pole affiches (e-mail, sujets, pas de Teams)');
    await shot(p, name + '-1b-pole');
    await pick(p, 'pole_join', 'no');
    ok(await p.evaluate(() => document.querySelector('.pole-panel').hidden), 'panneau des contacts masque si la reponse est non');
    await click(p, 'button', 'Quitter'); await p.waitForSelector('main h1');
    await runAnswers(p, 11);
    const meta = await p.$eval('.q-meta', (e) => e.textContent);
    ok(/12 sur 12/.test(meta), 'derniere question essentielle = 12 sur 12 (parcours etudiant, non suivi, souhaite rejoindre)', meta);
    await pick(p, ANSWERS[11][0], ANSWERS[11][1]); await click(p, 'button', 'Valider');
    ok((await hash(p)) === '#/more', 'apres les 12 questions : ecran « questions complementaires »', await hash(p));
    ok((await overflow(p)) <= 1, 'ecran complementaire sans debordement'); await shot(p, name + '-2-complementaires');
    await click(p, 'button', 'Voir mon orientation maintenant');
    await p.waitForSelector('.level'); ok((await overflow(p)) <= 1, 'resultat sans defilement horizontal'); await shot(p, name + '-3-resultat', true);
    ok(await p.evaluate(() => !!document.querySelector('.refine')), 'le resultat propose d\'affiner (questions complementaires non faites)');
    await p.evaluate(() => { location.hash = '#/kit'; }); await p.waitForSelector('ol.steps'); await wait(150);
    ok((await overflow(p)) <= 1, 'kit sans defilement horizontal'); await shot(p, name + '-4-kit', true);
    ok(p._errs.length === 0, 'aucune erreur JavaScript', p._errs.join(' | '));
    await p.close();
  }

  // 2 -- Questionnaire adaptatif et pistes
  console.log('\n[questionnaire adaptatif et pistes]');
  {
    const p = await open(VIEWPORTS.ordinateur);
    // a) personne SANS difficulte : parcours plus court, autres questions
    await click(p, 'button', 'Commencer'); await pick(p, 'pole', 'yes'); await click(p, 'button', 'Valider'); await pick(p, 'duration', 'none'); await click(p, 'button', 'Valider');
    const q3 = await p.$eval('h1', (e) => e.textContent);
    ok(/Pour qui vous renseignez-vous/.test(q3), 'sans difficulte : question « Pour qui vous renseignez-vous ? » au lieu des domaines de gene', q3);
    ok(/sur 10/.test(await p.$eval('.q-meta', (e) => e.textContent)), 'sans difficulte : parcours essentiel de 10 questions');
    await p.evaluate(() => { location.hash = '#/info'; }); await wait(200);
    // b) etudiant avec fatigue + difficultes de lecture : questions complementaires adaptees
    await click(p, 'button', 'Commencer'); await p.waitForSelector('.quiz-card');
    const core = [['pole','yes'],['duration','long'],['areas','energy'],['areas','attention'],['frequency','often'],['needs','breaks'],['pathway','studies'],['ctx_student','exams'],['support','none'],['awareness','partial'],['barriers','employer'],['urgency','soon']];
    for (const [q, v] of core) { await pick(p, q, v); if (!['areas'].includes(q) || v === 'attention') await click(p, 'button', 'Valider'); }
    ok((await hash(p)) === '#/more', 'ecran de choix atteint');
    const nMore = await p.$eval('.lead', (e) => e.textContent);
    ok(/\d+ questions complémentaires/.test(nMore), 'le nombre de questions complementaires est annonce', nMore);
    await click(p, 'button', 'Répondre aux questions complémentaires');
    const first = await p.$eval('h1', (e) => e.textContent);
    ok(/fatigue ou les douleurs/.test(first) && /complémentaire/.test(first), 'premiere question complementaire = fatigue/douleurs (domaine coche)', first.slice(0, 90));
    const ids = []; let guard = 0;
    while (guard++ < 40) {
      const name = await p.evaluate(() => { const i = document.querySelector('.choices input'); return i ? i.name : null; });
      if (!name) break; ids.push(name);
      const val = await p.evaluate(() => document.querySelector('.choices input').value);
      if (name === 'energy_effects') { await pick(p, name, 'sitting'); await pick(p, name, 'commuting'); }
      else if (name === 'attn_tasks') { await pick(p, name, 'reading'); await pick(p, name, 'listening'); }
      else if (name === 'goals') { await pick(p, name, 'keep_job'); await pick(p, name, 'funding'); }
      else if (name === 'st_exam_detail') await pick(p, name, 'extra_time');
      else await pick(p, name, val);
      await click(p, 'button', 'Valider|orientation');
    }
    ok(ids.includes('energy_effects') && ids.includes('attn_tasks') && ids.includes('st_exam_detail') && ids.includes('goals'), 'questions complementaires posees selon profil et domaines : ' + ids.length, ids.join(','));
    ok(!ids.includes('senses_which') && !ids.includes('emp_manager') && !ids.includes('js_obstacles'), 'aucune question hors profil ni hors domaines coches');
    await p.waitForSelector('.level'); await wait(200);
    const todos = await p.$$eval('.todo-list li', (els) => els.map((e) => e.textContent));
    ok(todos.length >= 5, 'pistes adaptees affichees (' + todos.length + ')');
    ok(todos.some((t) => /examens/i.test(t)) && todos.some((t) => /siège|position|poste/i.test(t)), 'pistes liees aux cases cochees (examens, postes de travail)');
    ok(await p.evaluate(() => /ne sont que des pistes/.test(document.body.textContent)), 'mention « ce ne sont que des pistes »');
    ok(!(await p.evaluate(() => !!document.querySelector('.refine'))), 'plus de bandeau « affiner » une fois les questions faites');
    await shot(p, 'resultat-pistes', true);
    await p.close();
  }

  // 3 -- Reglages en PAGE, texte 50 % / 300 %
  for (const [name, vp] of [['telephone', VIEWPORTS.telephone], ['ordinateur', VIEWPORTS.ordinateur]]) {
    for (const size of [50, 300]) {
      console.log('\n[' + name + '] texte a ' + size + ' %');
      const p = await open(vp);
      await openSettings(p);
      ok((await hash(p)) === '#/settings' && await p.evaluate(() => document.getElementById('main').hidden && !document.getElementById('settings').hidden), 'les reglages s\'ouvrent dans une page dediee');
      await setRange(p, 'set-size', size);
      ok((await overflow(p)) <= 1, 'page des reglages sans debordement');
      await closeSettings(p);
      ok((await hash(p)) !== '#/settings', 'le bouton Retour ramene a la page precedente');
      { const bad = await headerOverlaps(p); ok(bad.length === 0, 'en-tete sans chevauchement', bad.join(', ')); }
      const px = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
      ok(Math.abs(px - 16 * size / 100) < 0.5, 'taille de base ' + px + ' px (attendu ' + 16 * size / 100 + ')');
      for (const v of ['#/info', '#/kit', '#/quiz']) { await p.evaluate((v) => { location.hash = v; }, v); await wait(250); ok((await overflow(p)) <= 1, v + ' sans debordement horizontal'); const cl = await clipped(p); ok(cl.length === 0, v + ' : aucun texte coupe dans les boutons et onglets', cl.join(' | ')); }
      await shot(p, name + '-texte' + size);
      await p.close();
    }
  }

  // 4 -- Polices a la demande, profils, memorisation facultative
  console.log('\n[polices, profils, memorisation]');
  {
    const p = await open(VIEWPORTS.ordinateur); await openSettings(p);
    for (const f of ['atkinson', 'lexend', 'dyslexic']) {
      await p.select('#set-font', f);
      const fam = { atkinson: 'Atkinson Hyperlegible', lexend: 'Lexend', dyslexic: 'OpenDyslexic' }[f];
      const loaded = await p.waitForFunction((fam) => document.fonts.check('16px "' + fam + '"') && getComputedStyle(document.body).fontFamily.includes(fam.split(' ')[0]), { timeout: 8000 }, fam).then(() => true, () => false);
      ok(loaded, 'police ' + fam + ' appliquee');
    }
    for (const prof of ['dys', 'adhd', 'lowvision']) {
      await p.evaluate((x) => document.querySelector('[data-profile="' + x + '"]').click(), prof); await wait(200);
      const st = await p.evaluate(() => ({ font: document.documentElement.dataset.font, theme: document.documentElement.dataset.theme, fs: getComputedStyle(document.documentElement).getPropertyValue('--fs').trim() }));
      ok(prof !== 'lowvision' || (st.theme === 'contrast' && st.fs === '150' && st.font === 'atkinson'), 'profil ' + prof + ' applique', JSON.stringify(st));
    }
    await p.evaluate(() => document.getElementById('profile-reset').click());
    ok(await p.evaluate(() => document.documentElement.dataset.font === 'system' && getComputedStyle(document.documentElement).getPropertyValue('--fs').trim() === '100'), 'retour aux reglages d\'origine');
    await setRange(p, 'set-size', 130);
    ok(!(await p.evaluate(() => localStorage.getItem('hd-prefs'))), 'rien n\'est memorise sans consentement');
    await p.evaluate(() => document.getElementById('set-remember').click());
    await p.reload({ waitUntil: 'networkidle0' });
    ok((await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--fs').trim())) === '130', 'reglages memorises restaures apres rechargement');
    await openSettings(p); await p.evaluate(() => document.getElementById('set-remember').click());
    ok(!(await p.evaluate(() => localStorage.getItem('hd-prefs'))), 'la decoche efface le stockage');
    await p.close();
  }

  // 5 -- Bouton retour, titres, saut d'adresse borne, langue rapide
  console.log('\n[navigation]');
  {
    const p = await open(VIEWPORTS.telephone);
    await runAnswers(p, 3);
    const st = () => p.evaluate(() => ({ hash: location.hash, title: document.title, checked: [...document.querySelectorAll('.choices input:checked')].map((i) => i.value) }));
    let s = await st(); ok(/Question 4 sur 12/.test(s.title), 'le titre de l\'onglet contient la question', s.title);
    await p.goBack(); await wait(250); s = await st(); ok(s.hash === '#/quiz/3' && s.checked.join() === 'long', 'retour navigateur -> question 3, reponse conservee', JSON.stringify(s));
    await p.goForward(); await wait(250); s = await st(); ok(s.hash === '#/quiz/4', 'avancer -> question 4');
    await p.evaluate(() => { location.hash = '#/quiz/11'; }); await wait(250); s = await st(); ok(s.hash === '#/quiz/4', 'saut vers une question non atteinte borne', s.hash);
    await p.evaluate(() => { location.hash = '#/quiz/13'; }); await wait(250); s = await st(); ok(s.hash === '#/quiz/4', 'acces direct a une question complementaire non choisie refuse', s.hash);
    await p.evaluate(() => document.getElementById('lang-quick').click()); await wait(400);
    ok(await p.evaluate(() => document.documentElement.lang === 'en' && /of 12/.test(document.title)), 'langue rapide : anglais');
    await p.close();
  }

  // 6 -- PDF reellement telecharge + impression
  console.log('\n[PDF et impression]');
  {
    const dl = fs.mkdtempSync(path.join(os.tmpdir(), 'hd-dl-'));
    const p = await open(VIEWPORTS.ordinateur);
    await p.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
    const cdp = await p.createCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
    await runAnswers(p); await p.waitForSelector('.level');
    const labels = await p.evaluate(() => [...document.querySelectorAll('.actions button')].map((e) => e.textContent.trim()));
    ok(labels.includes('Imprimer') && labels.includes('Télécharger en PDF'), 'deux boutons distincts : Imprimer et Télécharger en PDF', labels.join(' / '));
    await click(p, 'button', '^\\s*Imprimer'); ok((await p.evaluate(() => window.__printed)) === 1, 'le bouton Imprimer ouvre l\'impression');
    await click(p, 'button', 'Télécharger en PDF'); await wait(1200);
    const f = fs.readdirSync(dl).find((x) => x.endsWith('.pdf'));
    ok(!!f, 'un fichier PDF est telecharge');
    if (f) { const buf = fs.readFileSync(path.join(dl, f)); ok(buf.slice(0, 5).toString() === '%PDF-' && buf.length > 1500 && buf.toString('latin1').includes('%%EOF'), 'le PDF est valide (' + buf.length + ' octets)'); }
    await p.close();
  }

  // 7 -- Poids reellement transfere (compression)
  console.log('\n[poids transfere]');
  {
    const p = await browser.newPage(); await p.setViewport(VIEWPORTS.ordinateur);
    const cdp = await p.createCDPSession(); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    let wire = 0; cdp.on('Network.loadingFinished', (e) => { wire += e.encodedDataLength; });
    await p.goto(base, { waitUntil: 'networkidle0' });
    ok(wire / 1024 <= 60, 'premiere visite : ' + (wire / 1024).toFixed(1) + ' Ko transferes (budget 60 Ko)');
    await p.close();
  }

  // 8 -- Espace administrateur integre : connexion, donnees, remise a zero, mot de passe
  console.log('\n[espace administrateur]');
  {
    const p = await open(VIEWPORTS.ordinateur);
    await click(p, 'a', 'Espace administrateur'); await p.waitForSelector('#adm-user');
    ok((await hash(p)) === '#/admin', 'l\'espace admin est une page du site (#/admin), lien dans le pied de page');
    await p.type('#adm-user', DEMO_USER); await p.type('#adm-pass', 'mauvais'); await click(p, 'button', 'Se connecter'); await wait(600);
    ok(await p.evaluate(() => /incorrect/.test(document.querySelector('.error').textContent) && document.getElementById('adm-user').value === 'admin'), 'mauvais mot de passe refuse, identifiant conserve');
    await p.type('#adm-pass', DEMO_PASSWORD); await click(p, 'button', 'Se connecter'); await p.waitForSelector('.kpis');
    ok(await p.evaluate(() => /mot de passe de démonstration/.test(document.body.textContent)), 'alerte « mot de passe de demonstration »');
    await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { if (/démonstration/.test(d.textContent.slice(0, 40))) d.open = true; }));
    // etat propre : remise a zero, puis 2 vrais evenements -> les petits nombres sont masques (seuil de confidentialite)
    await click(p, 'button', 'Remettre les compteurs à zéro'); await wait(900);
    for (let i = 0; i < 2; i++) await fetch(base + 'api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: 'start', lang: 'fr' }) });
    await click(p, 'button', 'Actualiser'); await wait(800);
    ok(await p.evaluate(() => /moins de 5/.test(document.querySelector('.kpis').textContent)), 'avec 2 parcours seulement : valeurs masquees « moins de 5 » (seuil de confidentialite)');
    await click(p, 'button', 'Ajouter 120 parcours fictifs'); await wait(1200);
    const kpis = await p.$$eval('.kpi', (els) => els.map((e) => e.querySelector('.kpi-value').textContent));
    ok(kpis[0] === '122' && /^\d+$/.test(kpis[1]) && /%/.test(kpis[2]), 'donnees fictives ajoutees : 2 reels + 120 fictifs = 122 parcours commences, termines, taux', kpis.join(' | '));
    ok(await p.evaluate(() => [...document.querySelectorAll('.chart-n')].every((e) => /n = \d+/.test(e.textContent) || /moins de/.test(e.textContent))), 'chaque graphique indique le nombre de cas pris en compte (n = …)');
    ok(await p.evaluate(() => /FICTIVES/.test(document.body.textContent)), 'bandeau « donnees fictives »');
    await shot(p, 'admin-dashboard', true);
    // un vrai evenement fait bouger les compteurs
    const before = Number(kpis[0]);
    await fetch(base + 'api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: 'start', lang: 'fr' }) });
    await click(p, 'button', 'Actualiser'); await wait(800);
    ok(Number(await p.$eval('.kpi-value', (e) => e.textContent)) === before + 1, 'un evenement reel apparait apres « Actualiser » (+1)');
    ok(await p.evaluate(() => /il y a \d+ s|il y a \d+ min/.test(document.querySelector('[data-last]').textContent)), '« dernier evenement recu » mis a jour');
    // remise a zero
    await click(p, 'button', 'Remettre les compteurs à zéro'); await wait(1000);
    ok(await p.evaluate(() => /moins de 5/.test(document.querySelector('.kpis').textContent) || /\b0\b/.test(document.querySelector('.kpi-value').textContent)), 'remise a zero effective');
    // changement de mot de passe
    await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { if (/mot de passe/.test(d.textContent.slice(0, 30))) d.open = true; }));
    await p.type('#pw-cur', DEMO_PASSWORD); await p.type('#pw-new', 'Un-Nouveau-Mot-De-Passe-2026'); await p.type('#pw-conf', 'Un-Nouveau-Mot-De-Passe-2026');
    await click(p, 'button', 'Enregistrer le mot de passe'); await wait(900);
    ok(await p.evaluate(() => /Mot de passe modifié/.test(document.body.textContent)), 'mot de passe modifie');
    await click(p, 'button', 'Se déconnecter'); await p.waitForSelector('#adm-user');
    await login(p, DEMO_USER, DEMO_PASSWORD); await wait(700);
    ok(await p.evaluate(() => !!document.querySelector('.error')), 'l\'ancien mot de passe ne fonctionne plus');
    await login(p, DEMO_USER, 'Un-Nouveau-Mot-De-Passe-2026'); await p.waitForSelector('.kpis');
    ok(await p.evaluate(() => !/mot de passe de démonstration/.test(document.body.textContent)), 'nouveau mot de passe accepte, plus d\'alerte de demonstration');
    const txt = fs.readFileSync(path.join(dir, 'a.json'), 'utf8');
    ok(!txt.includes('Un-Nouveau-Mot-De-Passe-2026') && !txt.includes(DEMO_PASSWORD), 'aucun mot de passe en clair dans le fichier des comptes');
    ok(p._errs.length === 0, 'aucune erreur JavaScript', p._errs.join(' | '));
    await p.close();
  }

  // 9 -- Accessibilite automatique (axe-core, WCAG 2.2 AA + bonnes pratiques)
  console.log('\n[accessibilite axe-core]');
  {
    const p = await open(VIEWPORTS.ordinateur);
    async function axe(label, page) {
      page = page || p; await wait(400); await page.evaluate(AXE);
      const r = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }));
      ok(r.violations.length === 0, label, r.violations.map((v) => v.id + '(' + v.nodes.length + ')').join(', '));
    }
    await axe('accueil'); await openSettings(p); await axe('page des reglages');
    for (const th of ['dark', 'contrast']) { await p.select('#set-theme', th); await axe('reglages, theme ' + th); await closeSettings(p); await axe('accueil, theme ' + th); await openSettings(p); }
    await p.select('#set-theme', 'auto'); await closeSettings(p);
    await click(p, 'button', 'Commencer'); await axe('question a choix unique');
    await pick(p, 'pole', 'yes'); await click(p, 'button', 'Valider'); await pick(p, 'duration', 'long'); await click(p, 'button', 'Valider'); await axe('question a choix multiples');
    await click(p, 'button', 'Valider'); await wait(100); await axe('question avec message d\'erreur');
    await p.evaluate(() => { location.hash = '#/info'; }); await wait(200);
    await click(p, 'button', 'Commencer');
    for (const [q, v] of ANSWERS) { await pick(p, q, v); await click(p, 'button', 'Valider'); }
    await axe('ecran « questions complementaires »');
    await click(p, 'button', 'Répondre aux questions complémentaires'); await axe('question complementaire');
    for (let i = 0; i < 40 && !(await p.$('.level')); i++) { await p.evaluate(() => { const i2 = document.querySelector('.choices input'); if (i2) i2.click(); }); await click(p, 'button', 'Valider|orientation'); }
    await p.waitForSelector('.level'); await axe('resultat avec pistes');
    await p.evaluate(() => { location.hash = '#/kit'; }); await p.waitForSelector('ol.steps'); await axe('kit documentaire');
    await openSettings(p); await setRange(p, 'set-size', 300); await closeSettings(p); await axe('kit a 300 %');
    await openSettings(p); await setRange(p, 'set-size', 100); await p.select('#set-font', 'dyslexic'); await p.evaluate(() => document.getElementById('set-ruler').click()); await closeSettings(p); await axe('kit, OpenDyslexic + repere de lecture');
    await p.evaluate(() => { location.hash = '#/admin'; }); await p.waitForSelector('#adm-user'); await axe('admin : connexion');
    await login(p, DEMO_USER, 'Un-Nouveau-Mot-De-Passe-2026'); await p.waitForSelector('.kpis');
    await p.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
    await axe('admin : tableau de bord (sans donnees)');
    await click(p, 'button', 'Ajouter 120 parcours fictifs'); await wait(1000); await axe('admin : tableau de bord (avec donnees, tout deplie)');
    await p.close();
  }

  await browser.close(); server.closeAllConnections(); server.close();
  console.log('\n' + (failures.length ? '\u2718 ' + failures.length + ' ECHEC(S) sur ' + (pass + failures.length) + ' controles :\n - ' + failures.join('\n - ') : '\u2714 ' + pass + ' controles reussis, aucun echec.'));
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error('ERREUR', e); process.exit(2); });
