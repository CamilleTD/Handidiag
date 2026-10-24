'use strict';
/*
 * HandiDiag - back-end leger, sans dependance (Node.js >= 18).
 *  - sert le dossier public/
 *  - POST /api/event      : incremente des compteurs anonymes (aucune donnee individuelle)
 *  - POST /api/admin/login|logout|password, GET /api/admin/me : comptes administrateur (mot de passe hache, session en memoire)
 *  - GET  /api/stats      : donnees agregees, reservees aux administrateurs, seuil d'affichage k
 *  - GET  /api/export.csv : meme chose en CSV
 *
 * Ce que le serveur NE fait PAS : pas d'adresse IP stockee, pas de User-Agent, pas de cookie,
 * pas de reponse individuelle, pas de croisement entre compteurs (profil x niveau, etc.).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const PUBLIC_DIR = path.join(__dirname, 'public');
const RESOURCES = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'data', 'resources.json'), 'utf8'));

// Listes blanches : tout ce qui n'est pas ici est refuse.
const ALLOWED = {
  lang: ['fr', 'en'],
  profile: ['student', 'employee', 'jobseeker', 'public_agent'],
  level: ['explore', 'talk', 'talk_soon', 'already'],
  doc: RESOURCES.official_links.map((l) => l.id).concat(['print', 'pdf_download', 'summary_download'])
};
const COMPRESSIBLE = /\.(html|css|js|json|svg|txt)$/;   // les polices .woff2 sont deja compressees
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon'
};

const DEMO_USER = 'admin';
const DEMO_PASSWORD = 'HandiDiag-Demo-2026';   // compte de DEMONSTRATION uniquement (voir README : a changer avant toute mise en ligne)
const SESSION_TTL = 2 * 60 * 60 * 1000;          // 2 h, renouvelees a chaque action

function scryptHash(password, salt) { return crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 }); }
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return { salt: salt.toString('hex'), hash: scryptHash(password, salt).toString('hex') };
}
function verifyPassword(password, user) {
  const h = scryptHash(password, Buffer.from(user.salt, 'hex'));
  const want = Buffer.from(user.hash, 'hex');
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}
function passwordProblem(pw, username) {
  if (typeof pw !== 'string' || pw.length < 10) return 'too_short';
  if (pw.length > 200) return 'too_long';
  if (pw === DEMO_PASSWORD || pw.toLowerCase() === String(username).toLowerCase()) return 'too_weak';
  return null;
}

function emptyStats() {
  return { days: {}, profile: {}, level: {}, lang: {}, docs: {}, deep: 0, lastEventAt: 0, demo: 0 };
}

function createServer(opts) {
  opts = opts || {};
  const k = opts.k || Number(process.env.MIN_COUNT) || 5;            // seuil d'affichage
  const statsFile = opts.statsFile || process.env.STATS_FILE || path.join(__dirname, 'var', 'stats.json');
  const logFile = opts.logFile === undefined ? path.join(__dirname, 'var', 'app.log') : opts.logFile;
  // DISABLE_STATS=1 : aucune statistique, aucun tableau de bord (l'application utilisateur fonctionne a l'identique)
  const disableStats = opts.disableStats !== undefined ? !!opts.disableStats : process.env.DISABLE_STATS === '1';
  // Jeton statique facultatif (automatisation, export par script). Les personnes se connectent avec un compte.
  const adminToken = opts.adminToken || process.env.ADMIN_TOKEN || null;
  const adminFile = opts.adminFile || process.env.ADMIN_FILE || path.join(__dirname, 'var', 'admin.json');
  let admin = { users: [] };
  try { admin = Object.assign({ users: [] }, JSON.parse(fs.readFileSync(adminFile, 'utf8'))); } catch (e) { /* premier demarrage */ }
  let initialPassword = null;           // mot de passe genere, affiche UNE fois dans la console
  function saveAdmin() {
    try {
      fs.mkdirSync(path.dirname(adminFile), { recursive: true });
      const tmp = adminFile + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(admin, null, 1), { mode: 0o600 });
      fs.renameSync(tmp, adminFile);
    } catch (e) { console.error('admin save failed:', e.message); }
  }
  function addUser(username, password, isDefault) {
    const h = hashPassword(password);
    admin.users = admin.users.filter((u) => u.username.toLowerCase() !== username.toLowerCase());
    admin.users.push({ username, salt: h.salt, hash: h.hash, isDefault: !!isDefault, createdAt: Date.now(), updatedAt: Date.now() });
    saveAdmin();
  }
  if (!admin.users.length && !(opts.disableStats !== undefined ? opts.disableStats : process.env.DISABLE_STATS === '1')) {
    const envUser = opts.adminUser || process.env.ADMIN_USER, envPass = opts.adminPassword || process.env.ADMIN_PASSWORD;
    if (envPass) addUser(envUser || DEMO_USER, envPass, false);
    else if (process.env.NODE_ENV === 'production' && !opts.demoAccount) { initialPassword = crypto.randomBytes(12).toString('base64url'); addUser(DEMO_USER, initialPassword, false); }
    else addUser(DEMO_USER, DEMO_PASSWORD, true);               // compte de demonstration
  }
  const sessions = new Map();           // jeton -> { username, exp } (memoire vive uniquement)
  function newSession(username) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { username, exp: Date.now() + SESSION_TTL });
    if (sessions.size > 200) for (const [t, v] of sessions) if (v.exp < Date.now()) sessions.delete(t);
    return token;
  }

  let stats = emptyStats();
  try { stats = Object.assign(emptyStats(), JSON.parse(fs.readFileSync(statsFile, 'utf8'))); } catch (e) { /* premier demarrage */ }

  // Ecriture differee et atomique : un fichier JSON de compteurs, rien d'autre.
  let saveTimer = null;
  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(flush, 3000);
    saveTimer.unref();
  }
  function flush() {
    saveTimer = null;
    try {
      fs.mkdirSync(path.dirname(statsFile), { recursive: true });
      const tmp = statsFile + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(stats));
      fs.renameSync(tmp, statsFile);
    } catch (e) { console.error('stats save failed:', e.message); }
  }

  // Journal technique minimal : date, methode, chemin (sans parametres), code. Ni IP, ni User-Agent.
  function log(method, urlPath, status) {
    const line = new Date().toISOString() + ' ' + method + ' ' + urlPath.slice(0, 120) + ' ' + status;
    if (!opts.quiet) console.log(line);
    if (!logFile) return;
    try {
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      if (fs.existsSync(logFile) && fs.statSync(logFile).size > 1024 * 1024) fs.writeFileSync(logFile, '');
      fs.appendFileSync(logFile, line + '\n');
    } catch (e) { /* le journal ne doit jamais casser le service */ }
  }

  // Limitation de debit en memoire vive uniquement (cle = empreinte salee, jamais ecrite).
  const salt = crypto.randomBytes(8);
  const hits = new Map();
  // Limite par adresse et par minute (anti-spam). Large par defaut : a l'ecole, tous les etudiants partagent la meme adresse.
  const rateLimit = opts.rateLimit || Number(process.env.EVENT_RATE_LIMIT) || 600;
  function ipOf(req) {
    if (process.env.TRUST_PROXY === '1') { const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); if (xf) return xf; }
    return req.socket.remoteAddress || '';
  }
  function limited(req) {
    const key = crypto.createHash('sha256').update(salt).update(ipOf(req)).digest('hex').slice(0, 16);
    const now = Date.now();
    const rec = hits.get(key) || { start: now, n: 0 };
    if (now - rec.start > 60000) { rec.start = now; rec.n = 0; }
    rec.n++;
    hits.set(key, rec);
    if (hits.size > 5000) hits.clear();
    return rec.n > rateLimit;
  }

  // Limitation des tentatives de connexion au tableau de bord : 10 echecs par 5 minutes et par appareil (memoire vive seulement).
  const fails = new Map();
  function clientKey(req) { return crypto.createHash('sha256').update(salt).update(ipOf(req)).digest('hex').slice(0, 16); }
  function authBlocked(req) {
    const rec = fails.get(clientKey(req));
    return !!rec && Date.now() - rec.start < 300000 && rec.n >= 10;
  }
  function authFailed(req) {
    const key = clientKey(req), now = Date.now();
    let rec = fails.get(key);
    if (!rec || now - rec.start >= 300000) rec = { start: now, n: 0 };
    rec.n++; fails.set(key, rec);
    if (fails.size > 5000) fails.clear();
  }

  function inc(obj, key) { obj[key] = (obj[key] || 0) + 1; }
  function today() { return new Date().toISOString().slice(0, 10); }

  function recordEvent(ev) {
    if (!recordEventInner(ev)) return false;
    stats.lastEventAt = Date.now();
    return true;
  }
  function recordEventInner(ev) {
    if (!ev || typeof ev !== 'object') return false;
    if (ev.t === 'deep') { stats.deep++; return true; }
    if (ev.t === 'start') {
      if (!ALLOWED.lang.includes(ev.lang)) return false;
      const d = stats.days[today()] || (stats.days[today()] = { start: 0, complete: 0 });
      d.start++; inc(stats.lang, ev.lang);
      return true;
    }
    if (ev.t === 'complete') {
      if (!ALLOWED.profile.includes(ev.profile) || !ALLOWED.level.includes(ev.level)) return false;
      const d = stats.days[today()] || (stats.days[today()] = { start: 0, complete: 0 });
      d.complete++;
      // Compteurs SEPARES : on ne stocke jamais le couple (profil, niveau).
      inc(stats.profile, ev.profile); inc(stats.level, ev.level);
      return true;
    }
    if (ev.t === 'doc') {
      if (!ALLOWED.doc.includes(ev.doc)) return false;
      inc(stats.docs, ev.doc);
      return true;
    }
    return false;
  }

  /* ----- Outils de DEMONSTRATION (administrateur connecte uniquement) ----- */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function injectDemo(n) {
    const profiles = ['student'];
    const levels = ['explore', 'talk', 'talk', 'talk_soon', 'already', 'talk'];
    const docs = ['rqth_mph', 'mdph_portal', 'print', 'pdf_download', 'summary_download', 'agefiph', 'service_public_rqth'];
    for (let i = 0; i < n; i++) {
      const day = new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000).toISOString().slice(0, 10);
      const d = stats.days[day] || (stats.days[day] = { start: 0, complete: 0 });
      d.start++; inc(stats.lang, Math.random() < 0.85 ? 'fr' : 'en');
      if (Math.random() < 0.7) { d.complete++; inc(stats.profile, pick(profiles)); inc(stats.level, pick(levels)); }
      if (Math.random() < 0.4) stats.deep++;
      if (Math.random() < 0.5) inc(stats.docs, pick(docs));
    }
    stats.demo = 1; stats.lastEventAt = Date.now(); scheduleSave();
  }

  /* ----- Agregation avec seuil (k-anonymat simple + suppression complementaire) ----- */
  function maskValue(v) { return v > 0 && v < k ? '<' + k : v; }
  function maskDimension(obj, keys) {
    const cells = keys.map((key) => ({ key, v: obj[key] || 0 }));
    const small = cells.filter((c) => c.v > 0 && c.v < k);
    // Si une seule cellule est masquee, la soustraction avec le total la revelerait : on masque aussi la plus petite autre.
    if (small.length === 1) {
      const others = cells.filter((c) => c.v >= k).sort((a, b) => a.v - b.v);
      if (others.length) others[0].forceMask = true;
    }
    const out = {};
    cells.forEach((c) => { out[c.key] = c.forceMask ? '<' + k + '*' : maskValue(c.v); });
    return out;
  }
  function aggregate() {
    const totalStart = Object.values(stats.days).reduce((s, d) => s + d.start, 0);
    const totalComplete = Object.values(stats.days).reduce((s, d) => s + d.complete, 0);
    const daily = Object.keys(stats.days).sort().slice(-30).map((date) => ({
      date, start: maskValue(stats.days[date].start), complete: maskValue(stats.days[date].complete)
    }));
    const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    return {
      k,
      generated: new Date().toISOString(),
      lastEventAt: stats.lastEventAt || null,
      demo: !!stats.demo,
      totals: {
        starts: maskValue(totalStart),
        completes: maskValue(totalComplete),
        completionRate: totalStart >= k ? Math.round((totalComplete / totalStart) * 100) : null,
        deep: maskValue(stats.deep),
        deepRate: totalStart >= k ? Math.round((stats.deep / totalStart) * 100) : null
      },
      // Nombre de cas pris en compte par graphique (masque s'il est inferieur au seuil)
      n: { profile: maskValue(sum(stats.profile)), level: maskValue(sum(stats.level)), lang: maskValue(sum(stats.lang)), docs: maskValue(sum(stats.docs)) },
      byProfile: maskDimension(stats.profile, ALLOWED.profile),
      byLevel: maskDimension(stats.level, ALLOWED.level),
      byLang: maskDimension(stats.lang, ALLOWED.lang),
      docs: maskDimension(stats.docs, ALLOWED.doc),
      daily
    };
  }
  function toCsv(a) {
    const rows = [['metric', 'key', 'value']];
    rows.push(['totals', 'starts', a.totals.starts], ['totals', 'completes', a.totals.completes],
      ['totals', 'completion_rate_percent', a.totals.completionRate === null ? 'n/a' : a.totals.completionRate],
      ['totals', 'deep_questions_started', a.totals.deep]);
    Object.keys(a.n).forEach((m) => rows.push(['sample_size', m, a.n[m]]));
    rows.push(['meta', 'contains_demo_data', a.demo ? 1 : 0]);
    [['profile', a.byProfile], ['level', a.byLevel], ['lang', a.byLang], ['doc', a.docs]].forEach(([m, o]) => {
      Object.keys(o).forEach((key) => rows.push([m, key, o[key]]));
    });
    a.daily.forEach((d) => { rows.push(['daily_start', d.date, d.start], ['daily_complete', d.date, d.complete]); });
    return rows.map((r) => r.join(',')).join('\n') + '\n';
  }

  // Retourne { username } si la requete porte un jeton de session valide (ou le jeton statique), sinon null
  function identify(req) {
    const h = req.headers['authorization'] || '';
    const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!tok) return null;
    if (adminToken) {
      const a = Buffer.from(tok), b = Buffer.from(adminToken);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return { username: 'jeton-api' };
    }
    const sess = sessions.get(tok);
    if (!sess) return null;
    if (sess.exp < Date.now()) { sessions.delete(tok); return null; }
    sess.exp = Date.now() + SESSION_TTL;
    return { username: sess.username, token: tok };
  }
  function authorized(req) { return !!identify(req); }
  function readJson(req, res, cb) {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 2048) req.destroy(); else chunks.push(c); });
    req.on('end', () => {
      let body = null;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { /* invalide */ }
      if (!body || typeof body !== 'object') return json(res, req, 400, { error: 'invalid_json' });
      cb(body);
    });
  }
  function findUser(username) {
    return admin.users.find((u) => u.username.toLowerCase() === String(username || '').toLowerCase());
  }

  function headers(extra) {
    return Object.assign({
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'geolocation=(), camera=(), microphone=(), interest-cohort=()',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }, extra || {});
  }
  function send(res, req, status, body, extra) {
    res.writeHead(status, headers(extra));
    res.end(req.method === 'HEAD' ? undefined : body);
    log(req.method, (req.url || '').split('?')[0], status);
  }
  function json(res, req, status, obj) {
    send(res, req, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  }

  // Cache memoire des fichiers statiques (quelques centaines de Ko) : lecture, ETag et versions compressees calculees une fois.
  const fileCache = new Map();
  function loadFile(file, cb) {
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return cb(err || new Error('not a file'));
      const c = fileCache.get(file);
      if (c && c.mtimeMs === st.mtimeMs && c.size === st.size) return cb(null, c);
      fs.readFile(file, (e, buf) => {
        if (e) return cb(e);
        const entry = { mtimeMs: st.mtimeMs, size: st.size, buf, tag: crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16) };
        if (COMPRESSIBLE.test(file) && buf.length > 512) {
          entry.gz = zlib.gzipSync(buf, { level: 9 });
          entry.br = zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } });
        }
        fileCache.set(file, entry);
        cb(null, entry);
      });
    });
  }
  function notFound(req, res) {
    loadFile(path.join(PUBLIC_DIR, '404.html'), (err, c) => {
      if (err) return send(res, req, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
      send(res, req, 404, c.buf, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
    });
  }

  function serveStatic(req, res) {
    let rel;
    try { rel = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { return notFound(req, res); }
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!file.startsWith(PUBLIC_DIR + path.sep) || path.basename(file).startsWith('.')) return notFound(req, res);
    loadFile(file, (err, c) => {
      if (err) return notFound(req, res);
      const ext = path.extname(file);
      const accept = req.headers['accept-encoding'] || '';
      let body = c.buf, enc = null;
      if (c.br && /\bbr\b/.test(accept)) { body = c.br; enc = 'br'; }
      else if (c.gz && /\bgzip\b/.test(accept)) { body = c.gz; enc = 'gzip'; }
      const etag = '"' + c.tag + (enc ? '-' + enc : '') + '"';
      const headers = {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'ETag': etag,
        'Vary': 'Accept-Encoding',
        'Cache-Control': ext === '.html' ? 'no-cache' : (ext === '.woff2' ? 'public, max-age=31536000, immutable' : 'public, max-age=3600')
      };
      if (enc) headers['Content-Encoding'] = enc;
      if (req.headers['if-none-match'] === etag) return send(res, req, 304, undefined, headers);
      send(res, req, 200, body, headers);
    });
  }

  const server = http.createServer((req, res) => {
    try {
      const urlPath = (req.url || '/').split('?')[0];

      if (disableStats && (urlPath.startsWith('/api/stats') || urlPath.startsWith('/api/admin') || urlPath === '/api/export.csv' || urlPath === '/admin.html' || urlPath === '/js/admin.js')) {
        return json(res, req, 404, { error: 'stats_disabled' });
      }
      if (urlPath === '/admin.html') { res.writeHead(302, headers({ Location: '/#/admin' })); res.end(); log(req.method, urlPath, 302); return; }
      if (req.method === 'POST' && urlPath === '/api/event') {
        if (disableStats) return json(res, req, 202, { ok: true, ignored: true });
        if (limited(req)) return json(res, req, 429, { error: 'rate_limited' });
        let size = 0; const chunks = [];
        req.on('data', (c) => { size += c.length; if (size > 2048) { req.destroy(); } else chunks.push(c); });
        req.on('end', () => {
          let ev = null;
          try { ev = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { /* invalide */ }
          if (recordEvent(ev)) { scheduleSave(); return json(res, req, 202, { ok: true }); }
          return json(res, req, 400, { error: 'invalid_event' });
        });
        return;
      }

      // ---- comptes administrateur ----
      if (req.method === 'POST' && urlPath === '/api/admin/login') {
        if (authBlocked(req)) return json(res, req, 429, { error: 'too_many_attempts' });
        return readJson(req, res, (b) => {
          const user = findUser(b.username);
          // meme travail de hachage que l'utilisateur existe ou non (pas de difference de duree)
          const good = user ? verifyPassword(b.password || '', user) : (scryptHash(String(b.password || ''), Buffer.alloc(16)), false);
          if (!good) { authFailed(req); return json(res, req, 401, { error: 'invalid_credentials' }); }
          fails.delete(clientKey(req));
          return json(res, req, 200, { token: newSession(user.username), username: user.username, isDefault: !!user.isDefault, expiresInSeconds: SESSION_TTL / 1000 });
        });
      }
      if (req.method === 'POST' && urlPath === '/api/admin/logout') {
        const who = identify(req);
        if (who && who.token) sessions.delete(who.token);
        return json(res, req, 200, { ok: true });
      }
      if (req.method === 'GET' && urlPath === '/api/admin/me') {
        const who = identify(req);
        if (!who) return json(res, req, 401, { error: 'unauthorized' });
        const user = findUser(who.username);
        return json(res, req, 200, { username: who.username, isDefault: !!(user && user.isDefault) });
      }
      if (req.method === 'POST' && urlPath === '/api/admin/password') {
        const who = identify(req);
        if (!who || !who.token) return json(res, req, 401, { error: 'unauthorized' });
        if (authBlocked(req)) return json(res, req, 429, { error: 'too_many_attempts' });
        return readJson(req, res, (b) => {
          const user = findUser(who.username);
          if (!user || !verifyPassword(b.current || '', user)) { authFailed(req); return json(res, req, 403, { error: 'wrong_current_password' }); }
          const problem = passwordProblem(b.next, user.username);
          if (problem) return json(res, req, 400, { error: problem });
          addUser(user.username, b.next, false);
          for (const [t, v] of sessions) if (v.username === user.username && t !== who.token) sessions.delete(t);   // les autres sessions sont fermees
          return json(res, req, 200, { ok: true });
        });
      }

      if (req.method === 'POST' && urlPath === '/api/admin/demo-data') {
        if (!authorized(req)) return json(res, req, 401, { error: 'unauthorized' });
        if (process.env.NODE_ENV === 'production') return json(res, req, 403, { error: 'disabled_in_production' });
        return readJson(req, res, (b) => {
          const n = Math.max(1, Math.min(500, Math.round(Number(b.sessions) || 120)));
          injectDemo(n);
          return json(res, req, 200, { ok: true, sessions: n });
        });
      }
      if (req.method === 'POST' && urlPath === '/api/admin/reset') {
        if (!authorized(req)) return json(res, req, 401, { error: 'unauthorized' });
        return readJson(req, res, (b) => {
          if (b.confirm !== true) return json(res, req, 400, { error: 'confirmation_required' });
          stats = emptyStats(); flush();
          return json(res, req, 200, { ok: true });
        });
      }

      if ((req.method === 'GET' || req.method === 'HEAD') && urlPath === '/api/stats') {
        if (authBlocked(req)) return json(res, req, 429, { error: 'too_many_attempts' });
        if (!authorized(req)) { authFailed(req); return json(res, req, 401, { error: 'unauthorized' }); }
        return json(res, req, 200, aggregate());
      }
      if (req.method === 'GET' && urlPath === '/api/export.csv') {
        if (authBlocked(req)) return json(res, req, 429, { error: 'too_many_attempts' });
        if (!authorized(req)) { authFailed(req); return json(res, req, 401, { error: 'unauthorized' }); }
        return send(res, req, 200, toCsv(aggregate()), {
          'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store',
          'Content-Disposition': 'attachment; filename="handidiag-stats.csv"'
        });
      }

      if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
      return json(res, req, 405, { error: 'method_not_allowed' });
    } catch (e) {
      send(res, req, 500, 'Server error', { 'Content-Type': 'text/plain' });
    }
  });

  server.flushStats = flush;
  server.adminToken = adminToken;
  server.initialPassword = initialPassword;
  server.adminUsers = () => admin.users.map((u) => ({ username: u.username, isDefault: !!u.isDefault }));
  return server;
}

module.exports = { createServer, ALLOWED, hashPassword, verifyPassword, passwordProblem, DEMO_USER, DEMO_PASSWORD };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const server = createServer();
  server.listen(port, () => {
    console.log('HandiDiag : http://localhost:' + port);
    if (process.env.DISABLE_STATS === '1') { console.log('Statistiques et espace administrateur DESACTIVES (DISABLE_STATS=1).'); return; }
    console.log('Espace administrateur : http://localhost:' + port + '/#/admin');
    const users = server.adminUsers();
    if (server.initialPassword) {
      console.log('Compte administrateur cree : identifiant « ' + users[0].username + ' », mot de passe « ' + server.initialPassword + ' » (affiche UNE seule fois : notez-le).');
    } else if (users.some((u) => u.isDefault)) {
      console.log('COMPTE DE DEMONSTRATION : identifiant « ' + DEMO_USER + ' », mot de passe « ' + DEMO_PASSWORD + ' ».');
      console.log('  -> a changer dans l\'espace administrateur avant toute mise en ligne (ou definir ADMIN_USER / ADMIN_PASSWORD).');
    } else {
      console.log('Compte administrateur : ' + users.map((u) => '« ' + u.username + ' »').join(', ') + ' (mot de passe deja defini).');
    }
  });
  const stop = () => { server.flushStats(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
