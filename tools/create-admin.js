'use strict';
// Cree ou met a jour un compte administrateur (mot de passe hache avec scrypt, jamais stocke en clair).
//   node tools/create-admin.js <identifiant> <mot-de-passe>
// Le fichier var/admin.json est lu au demarrage du serveur (redemarrer le serveur apres modification).
const fs = require('fs'), path = require('path');
const { hashPassword, passwordProblem } = require('../server.js');
const file = process.env.ADMIN_FILE || path.join(__dirname, '..', 'var', 'admin.json');
const [username, password] = process.argv.slice(2);
if (!username || !password) { console.error('Usage : node tools/create-admin.js <identifiant> <mot-de-passe>'); process.exit(1); }
const problem = passwordProblem(password, username);
if (problem) { console.error('Mot de passe refuse (' + problem + ') : 10 caracteres minimum, different de l\'identifiant et du mot de passe de demonstration.'); process.exit(1); }
let admin = { users: [] };
try { admin = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* nouveau fichier */ }
const h = hashPassword(password);
admin.users = (admin.users || []).filter((u) => u.username.toLowerCase() !== username.toLowerCase());
admin.users.push({ username, salt: h.salt, hash: h.hash, isDefault: false, createdAt: Date.now(), updatedAt: Date.now() });
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(admin, null, 1), { mode: 0o600 });
console.log('Compte « ' + username + ' » enregistre dans ' + file + '. Redemarrez le serveur.');
