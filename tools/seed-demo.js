'use strict';
// Ajoute des evenements FICTIFS pour la demonstration (ou utiliser le bouton du tableau de bord).
//   node tools/seed-demo.js [nombre-de-parcours]      (serveur lance sur http://localhost:3000)
// Identifiants : ADMIN_USER / ADMIN_PASSWORD, sinon le compte de demonstration.
const base = process.env.BASE || 'http://localhost:3000';
const user = process.env.ADMIN_USER || 'admin';
const pass = process.env.ADMIN_PASSWORD || 'HandiDiag-Demo-2026';
const n = Number(process.argv[2]) || 120;
(async () => {
  const login = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user, password: pass }) });
  if (!login.ok) { console.error('Connexion refusee (' + login.status + '). Definir ADMIN_USER et ADMIN_PASSWORD.'); process.exit(1); }
  const { token } = await login.json();
  const r = await fetch(base + '/api/admin/demo-data', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ sessions: n }) });
  if (!r.ok) { console.error('Refuse (' + r.status + ').'); process.exit(1); }
  console.log('Donnees FICTIVES ajoutees (' + n + ' parcours simules sur 10 jours). Ouvrir http://localhost:3000/#/admin');
})().catch((e) => { console.error('Serveur injoignable ? ' + e.message); process.exit(1); });
