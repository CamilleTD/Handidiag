'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const http = require('http');
const zlib = require('zlib');
const os = require('os');
const path = require('path');
const { createServer } = require('../server.js');

function start(extra) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hd-'));
  const server = createServer(Object.assign({ k: 3, adminToken: 'secret-token', statsFile: path.join(dir, 'stats.json'), adminFile: path.join(dir, 'admin.json'), logFile: null, quiet: true }, extra));
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, base: 'http://127.0.0.1:' + server.address().port, dir })));
}
function stop(server) { server.closeAllConnections(); server.close(); }
const post = (base, body) => fetch(base + '/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const stats = (base, token) => fetch(base + '/api/stats', { headers: token ? { Authorization: 'Bearer ' + token } : {} });

test('le serveur sert l\'application avec des en-tetes de securite et sans cookie', async () => {
  const { server, base } = await start();
  const r = await fetch(base + '/');
  assert.strictEqual(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.strictEqual(r.headers.get('x-content-type-options'), 'nosniff');
  assert.strictEqual(r.headers.get('set-cookie'), null);
  stop(server);
});

test('protection contre la traversee de repertoire', async () => {
  const { server, base } = await start();
  const r = await fetch(base + '/..%2fserver.js');
  assert.strictEqual(r.status, 404);
  stop(server);
});

test('evenements invalides refuses (liste blanche) et valeurs libres rejetees', async () => {
  const { server, base } = await start();
  assert.strictEqual((await post(base, { t: 'complete', profile: 'martin.dupont@mail.fr', level: 'talk' })).status, 400);
  assert.strictEqual((await post(base, { t: 'complete', profile: 'student', level: 'eligible' })).status, 400);
  assert.strictEqual((await post(base, { t: 'start', lang: 'xx' })).status, 400);
  assert.strictEqual((await post(base, { t: 'doc', doc: 'http://evil' })).status, 400);
  assert.strictEqual((await post(base, { t: 'unknown' })).status, 400);
  stop(server);
});

test('statistiques : jeton obligatoire, seuil k applique, aucun croisement stocke', async () => {
  const { server, base } = await start();
  assert.strictEqual((await stats(base)).status, 401);
  assert.strictEqual((await stats(base, 'mauvais')).status, 401);

  for (let i = 0; i < 4; i++) await post(base, { t: 'start', lang: 'fr' });
  await post(base, { t: 'complete', profile: 'student', level: 'talk' });
  await post(base, { t: 'complete', profile: 'student', level: 'explore' });
  for (let i = 0; i < 4; i++) await post(base, { t: 'complete', profile: 'employee', level: 'talk' });

  const d = await (await stats(base, 'secret-token')).json();
  assert.strictEqual(d.totals.starts, 4);
  assert.strictEqual(d.totals.completes, 6);
  assert.strictEqual(d.byProfile.student, '<3');          // 2 < k=3 : masque
  // une seule cellule masquee -> suppression complementaire de la plus petite autre cellule (anti-soustraction)
  assert.strictEqual(d.byProfile.employee, '<3*');
  assert.ok(!('student_talk' in d.byProfile));            // pas de croisement
  assert.strictEqual(d.byLevel.explore, '<3');
  stop(server);
});

test('le fichier de compteurs ne contient que des nombres (aucune donnee individuelle)', async () => {
  const { server, base, dir } = await start();
  await post(base, { t: 'complete', profile: 'student', level: 'talk' });
  server.flushStats();
  const raw = fs.readFileSync(path.join(dir, 'stats.json'), 'utf8');
  const walk = (o) => Object.values(o).forEach((v) => (typeof v === 'object' ? walk(v) : assert.strictEqual(typeof v, 'number')));
  walk(JSON.parse(raw));
  stop(server);
});

test('export CSV protege et masque', async () => {
  const { server, base } = await start();
  await post(base, { t: 'start', lang: 'en' });
  assert.strictEqual((await fetch(base + '/api/export.csv')).status, 401);
  const r = await fetch(base + '/api/export.csv', { headers: { Authorization: 'Bearer secret-token' } });
  assert.strictEqual(r.status, 200);
  const csv = await r.text();
  assert.match(csv, /metric,key,value/);
  assert.match(csv, /lang,en,<3/);
  stop(server);
});

test('DISABLE_STATS : aucun compteur, tableau de bord et export introuvables, application toujours servie', async () => {
  const { server, base } = await start({ disableStats: true });
  assert.strictEqual((await post(base, { t: 'start', lang: 'fr' })).status, 202);
  assert.strictEqual((await stats(base, 'secret-token')).status, 404);
  assert.strictEqual((await fetch(base + '/admin.html')).status, 404);
  assert.strictEqual((await fetch(base + '/api/export.csv', { headers: { Authorization: 'Bearer secret-token' } })).status, 404);
  assert.strictEqual((await fetch(base + '/')).status, 200);
  stop(server);
});

test('l\'evenement de telechargement PDF est accepte (compteur seulement)', async () => {
  const { server, base } = await start();
  assert.strictEqual((await post(base, { t: 'doc', doc: 'pdf_download' })).status, 202);
  stop(server);
});

// requete brute (sans decompression automatique) pour verifier les en-tetes de compression
function raw(base, urlPath, headers) {
  return new Promise((resolve, reject) => {
    http.get(base + urlPath, { headers: headers || {}, agent: false }, (res) => {
      const chunks = []; res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

test('compression : brotli et gzip a la demande, contenu identique apres decompression, texte brut sinon', async () => {
  const { server, base } = await start();
  const plain = await raw(base, '/js/app.js', { 'Accept-Encoding': 'identity' });
  assert.strictEqual(plain.headers['content-encoding'], undefined);
  const gz = await raw(base, '/js/app.js', { 'Accept-Encoding': 'gzip' });
  assert.strictEqual(gz.headers['content-encoding'], 'gzip');
  assert.ok(gz.body.length < plain.body.length * 0.5, 'gzip doit diviser la taille par 2 au moins');
  assert.deepStrictEqual(zlib.gunzipSync(gz.body), plain.body);
  const br = await raw(base, '/js/app.js', { 'Accept-Encoding': 'br, gzip' });
  assert.strictEqual(br.headers['content-encoding'], 'br');
  assert.ok(br.body.length <= gz.body.length);
  assert.deepStrictEqual(zlib.brotliDecompressSync(br.body), plain.body);
  const font = await raw(base, '/fonts/lexend-latin-400-normal.woff2', { 'Accept-Encoding': 'br, gzip' });
  assert.strictEqual(font.headers['content-encoding'], undefined, 'les polices ne sont pas recompressees');
  assert.match(font.headers['cache-control'], /immutable/);
  stop(server);
});

test('cache : ETag et reponse 304 sans corps', async () => {
  const { server, base } = await start();
  const first = await raw(base, '/css/style.css', { 'Accept-Encoding': 'gzip' });
  const tag = first.headers['etag'];
  assert.ok(tag);
  const again = await raw(base, '/css/style.css', { 'Accept-Encoding': 'gzip', 'If-None-Match': tag });
  assert.strictEqual(again.status, 304);
  assert.strictEqual(again.body.length, 0);
  stop(server);
});

test('page 404 soignee (statut 404, HTML, lien de retour)', async () => {
  const { server, base } = await start();
  const r = await raw(base, '/n-existe-pas', { 'Accept-Encoding': 'identity' });
  assert.strictEqual(r.status, 404);
  assert.match(r.headers['content-type'], /text\/html/);
  assert.match(r.body.toString('utf8'), /Page introuvable/);
  stop(server);
});

test('anti-force-brute : 10 echecs de connexion au tableau de bord -> 429, meme avec le bon jeton', async () => {
  const { server, base } = await start();
  for (let i = 0; i < 10; i++) assert.strictEqual((await stats(base, 'faux-' + i)).status, 401);
  assert.strictEqual((await stats(base, 'faux-encore')).status, 429);
  assert.strictEqual((await stats(base, 'secret-token')).status, 429);
  stop(server);
});

/* ---------- Comptes administrateur ---------- */
const jpost = (base, p, body, token) => fetch(base + p, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) });
const login = async (base, username, password) => jpost(base, '/api/admin/login', { username, password });
const { DEMO_USER, DEMO_PASSWORD } = require('../server.js');

test('compte de demonstration cree au premier demarrage, mot de passe jamais stocke en clair', async () => {
  const { server, base, dir } = await start();
  const r = await login(base, DEMO_USER, DEMO_PASSWORD);
  assert.strictEqual(r.status, 200);
  const body = await r.json();
  assert.strictEqual(body.isDefault, true);
  assert.ok(/^[0-9a-f]{64}$/.test(body.token));
  const file = fs.readFileSync(path.join(dir, 'admin.json'), 'utf8');
  assert.ok(!file.includes(DEMO_PASSWORD), 'le mot de passe ne doit pas etre ecrit en clair');
  assert.match(file, /"hash"/);
  stop(server);
});

test('connexion : mauvais mot de passe et utilisateur inconnu donnent la meme reponse (401)', async () => {
  const { server, base } = await start();
  const a = await login(base, DEMO_USER, 'mauvais');
  const b = await login(base, 'inconnu', DEMO_PASSWORD);
  assert.strictEqual(a.status, 401); assert.strictEqual(b.status, 401);
  assert.deepStrictEqual(await a.json(), await b.json());
  stop(server);
});

test('session : le jeton de session ouvre les statistiques, un faux jeton non, la deconnexion invalide la session', async () => {
  const { server, base } = await start();
  const { token } = await (await login(base, DEMO_USER, DEMO_PASSWORD)).json();
  assert.strictEqual((await stats(base, token)).status, 200);
  assert.strictEqual((await stats(base, 'a'.repeat(64))).status, 401);
  const me = await (await fetch(base + '/api/admin/me', { headers: { Authorization: 'Bearer ' + token } })).json();
  assert.strictEqual(me.username, DEMO_USER);
  await jpost(base, '/api/admin/logout', {}, token);
  assert.strictEqual((await stats(base, token)).status, 401);
  stop(server);
});

test('changement de mot de passe : refuse si mot de passe actuel faux ou nouveau trop faible, sinon applique', async () => {
  const { server, base } = await start();
  const { token } = await (await login(base, DEMO_USER, DEMO_PASSWORD)).json();
  const other = (await (await login(base, DEMO_USER, DEMO_PASSWORD)).json()).token;
  assert.strictEqual((await jpost(base, '/api/admin/password', { current: 'faux', next: 'Un-Nouveau-Mot-De-Passe-1' }, token)).status, 403);
  assert.strictEqual((await jpost(base, '/api/admin/password', { current: DEMO_PASSWORD, next: 'court' }, token)).status, 400);
  assert.strictEqual((await jpost(base, '/api/admin/password', { current: DEMO_PASSWORD, next: DEMO_PASSWORD }, token)).status, 400);
  assert.strictEqual((await jpost(base, '/api/admin/password', { current: DEMO_PASSWORD, next: 'Un-Nouveau-Mot-De-Passe-1' }, token)).status, 200);
  assert.strictEqual((await login(base, DEMO_USER, DEMO_PASSWORD)).status, 401, 'l\'ancien mot de passe ne marche plus');
  const again = await (await login(base, DEMO_USER, 'Un-Nouveau-Mot-De-Passe-1')).json();
  assert.strictEqual(again.isDefault, false);
  assert.strictEqual((await stats(base, other)).status, 401, 'les autres sessions sont fermees');
  assert.strictEqual((await stats(base, token)).status, 200, 'la session courante reste ouverte');
  stop(server);
});

test('anti-force-brute sur la connexion : 10 echecs -> 429, meme avec le bon mot de passe', async () => {
  const { server, base } = await start();
  for (let i = 0; i < 10; i++) assert.strictEqual((await login(base, DEMO_USER, 'faux' + i)).status, 401);
  assert.strictEqual((await login(base, DEMO_USER, DEMO_PASSWORD)).status, 429);
  stop(server);
});

test('compte defini par l\'environnement (adminUser / adminPassword) : pas de compte de demonstration', async () => {
  const { server, base } = await start({ adminUser: 'camille', adminPassword: 'Un-Mot-De-Passe-Solide-2026' });
  assert.strictEqual((await login(base, 'camille', 'Un-Mot-De-Passe-Solide-2026')).status, 200);
  assert.strictEqual((await login(base, DEMO_USER, DEMO_PASSWORD)).status, 401);
  assert.deepStrictEqual(server.adminUsers(), [{ username: 'camille', isDefault: false }]);
  stop(server);
});

test('/admin.html redirige vers la page integree au site (#/admin)', async () => {
  const { server, base } = await start();
  const r = await raw(base, '/admin.html', { 'Accept-Encoding': 'identity' });
  assert.strictEqual(r.status, 302);
  assert.strictEqual(r.headers['location'], '/#/admin');
  stop(server);
});

test('evenement « questions complementaires » : compteur + dernier evenement + nombre de cas par graphique', async () => {
  const { server, base } = await start({ k: 1 });
  const { token } = await (await login(base, DEMO_USER, DEMO_PASSWORD)).json();
  const before = await (await stats(base, token)).json();
  assert.strictEqual(before.lastEventAt, null);
  assert.strictEqual((await post(base, { t: 'start', lang: 'fr' })).status, 202);
  assert.strictEqual((await post(base, { t: 'deep' })).status, 202);
  assert.strictEqual((await post(base, { t: 'complete', profile: 'student', level: 'talk', lang: 'fr' })).status, 202);
  const d = await (await stats(base, token)).json();
  assert.strictEqual(d.totals.deep, 1);
  assert.strictEqual(d.totals.deepRate, 100);
  assert.strictEqual(typeof d.lastEventAt, 'number');
  assert.strictEqual(d.n.profile, 1);
  assert.strictEqual(d.n.level, 1);
  stop(server);
});

test('desactivation : la connexion administrateur n\'existe plus', async () => {
  const { server, base } = await start({ disableStats: true });
  assert.strictEqual((await login(base, DEMO_USER, DEMO_PASSWORD)).status, 404);
  assert.strictEqual(server.adminUsers().length, 0);
  stop(server);
});

test('donnees de demonstration et remise a zero : reservees a l\'administrateur connecte', async () => {
  const { server, base } = await start({ k: 1 });
  assert.strictEqual((await jpost(base, '/api/admin/demo-data', { sessions: 50 })).status, 401);
  assert.strictEqual((await jpost(base, '/api/admin/reset', { confirm: true })).status, 401);
  const { token } = await (await login(base, DEMO_USER, DEMO_PASSWORD)).json();
  assert.strictEqual((await jpost(base, '/api/admin/demo-data', { sessions: 80 }, token)).status, 200);
  let d = await (await stats(base, token)).json();
  assert.strictEqual(d.demo, true);
  assert.strictEqual(d.totals.starts, 80);
  assert.ok(d.totals.completes > 0 && d.n.profile === d.totals.completes);
  assert.ok(typeof d.lastEventAt === 'number');
  assert.strictEqual((await jpost(base, '/api/admin/reset', {}, token)).status, 400, 'confirmation obligatoire');
  assert.strictEqual((await jpost(base, '/api/admin/reset', { confirm: true }, token)).status, 200);
  d = await (await stats(base, token)).json();
  assert.strictEqual(d.demo, false); assert.strictEqual(d.totals.starts, 0); assert.strictEqual(d.lastEventAt, null);
  stop(server);
});

test('limite de debit des evenements configurable (et large par defaut)', async () => {
  const { server, base } = await start({ rateLimit: 5 });
  for (let i = 0; i < 5; i++) assert.strictEqual((await post(base, { t: 'start', lang: 'fr' })).status, 202);
  assert.strictEqual((await post(base, { t: 'start', lang: 'fr' })).status, 429);
  stop(server);
  const big = await start();
  for (let i = 0; i < 100; i++) assert.strictEqual((await post(big.base, { t: 'start', lang: 'fr' })).status, 202);
  stop(big.server);
});
