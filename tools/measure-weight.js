'use strict';
// Indicateur d'ecoconception : poids du site (brut et compresse gzip) et detection de ressources externes.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = path.join(__dirname, '..', 'public');
const BUDGET_GZIP_KB = 60;      // objectif : parcours complet sous 60 Ko transferes (hors liens externes)
const rows = []; let raw = 0, gz = 0, rawFonts = 0, rawLazy = 0, gzLazy = 0; const external = [];
const langGz = {};

(function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    const buf = fs.readFileSync(p);
    const z = zlib.gzipSync(buf).length;
    const rel = path.relative(root, p).replace(/\\/g, '/');
    // Charges SEULEMENT a la demande : polices choisies, espace administrateur, autre langue
    if (/^fonts\//.test(rel)) { rawFonts += buf.length; rows.push([rel + '  (a la demande)', buf.length, z]); return; }
    if (rel === 'js/pdf.js') { rawLazy += buf.length; gzLazy += z; rows.push([rel + '  (PDF, a la demande)', buf.length, z]); return; }
    if (rel === 'js/admin.js') { rawLazy += buf.length; gzLazy += z; rows.push([rel + '  (admin, a la demande)', buf.length, z]); return; }
    if (/^i18n\/[a-z]+\.json$/.test(rel)) langGz[rel] = { raw: buf.length, z };
    raw += buf.length; gz += z;
    rows.push([rel, buf.length, z]);
    if (/\.(html|css|js)$/.test(e.name)) {
      const txt = buf.toString('utf8');
      (txt.match(/(?:src|href)=["']https?:\/\/[^"']+/g) || []).forEach((m) => external.push(e.name + ' -> ' + m));
      (txt.match(/url\(["']?https?:\/\/[^)]+/g) || []).forEach((m) => external.push(e.name + ' -> ' + m));
    }
  });
})(root);

// Premiere visite : une seule langue est telechargee (on retient la plus lourde = pire cas)
const langs = Object.values(langGz);
const lightest = langs.reduce((m, l) => Math.min(m, l.z), Infinity);
const rawFirst = raw - langs.reduce((m, l) => Math.min(m, l.raw), Infinity);
const gzFirst = gz - lightest;

rows.sort((a, b) => b[1] - a[1]);
console.log('Fichier'.padEnd(44) + 'Brut (Ko)'.padStart(10) + 'Gzip (Ko)'.padStart(11));
rows.forEach((r) => console.log(r[0].padEnd(44) + (r[1] / 1024).toFixed(1).padStart(10) + (r[2] / 1024).toFixed(1).padStart(11)));
console.log('-'.repeat(65));
console.log('PREMIERE VISITE (une langue)'.padEnd(44) + (rawFirst / 1024).toFixed(1).padStart(10) + (gzFirst / 1024).toFixed(1).padStart(11));
console.log('A la demande : espace admin ' + (gzLazy / 1024).toFixed(1) + ' Ko gzip ; autre langue ' + (lightest / 1024).toFixed(1) + ' Ko gzip ; polices ' + (rawFonts / 1024).toFixed(0) + ' Ko au maximum (2 a 3 fichiers a la fois).');
console.log('\nRessources externes (src/href http...) hors liens <a> vers sites officiels :');
const ext = external.filter((x) => !/<a /.test(x));
console.log(ext.length ? ext.join('\n') : '  aucune');
console.log('\nBudget premiere visite : ' + BUDGET_GZIP_KB + ' Ko gzip -> ' + ((gzFirst / 1024) <= BUDGET_GZIP_KB ? 'RESPECTE' : 'DEPASSE'));
console.log('(Mesure reelle sur le reseau, brotli : voir `npm run e2e`.)');
