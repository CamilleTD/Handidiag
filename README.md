# HandiDiag

Application web **accessible et confidentielle** qui aide une personne à savoir si une démarche **RQTH**
(reconnaissance de la qualité de travailleur handicapé) peut avoir du sens pour elle, et vers qui se tourner.
Projet ING3 Efrei.

> HandiDiag **oriente et informe**. Il ne pose aucun diagnostic, ne dit jamais « vous êtes éligible » et ne
> stocke aucune réponse individuelle. Seule la MDPH peut reconnaître une situation de handicap.

## Démarrage rapide

Prérequis : Node.js 18 ou plus. **Aucune dépendance à installer.**

```bash
node server.js                    # ou : npm start      -> http://localhost:3000
```

- **Application** : http://localhost:3000
- **Espace administrateur** (intégré au site) : http://localhost:3000/#/admin, ou le lien « Espace administrateur » en pied de page.
- **Compte de démonstration**, créé automatiquement au premier démarrage : identifiant **`admin`**, mot de passe **`HandiDiag-Demo-2026`** (rappelés dans la console du serveur). **À changer dans l'espace admin (« Changer le mot de passe ») avant toute mise en ligne.**
- Sans Node : `python3 -m http.server -d public 8080` suffit pour tester le parcours utilisateur (les statistiques et l'espace admin sont alors indisponibles).

```bash
npm test        # 64 tests : moteur de règles, questionnaire adaptatif, voix, PDF, comptes admin, sécurité et compression du serveur
npm run e2e     # 157 contrôles dans un vrai navigateur (voir « Tests de navigateur » plus bas)
npm run weight  # indicateur d'écoconception (poids de la première visite, ressources externes)
node tools/create-admin.js camille "Un-Mot-De-Passe-Solide-2026"   # créer / remplacer un compte administrateur
```

## Ce que contient le projet

```
handidiag/
├── server.js                  Back-end léger (Node, sans dépendance) : fichiers statiques + compteurs anonymes
├── public/
│   ├── index.html             Application (une seule page, routage par #/info #/quiz #/more #/result #/kit #/settings #/admin)
│   ├── css/style.css          Thèmes clair/sombre, focus visible, impression, texte agrandissable
│   ├── js/engine.js           Moteur de règles explicable (fonction pure, testée)
│   ├── js/pdf.js              Générateur de PDF sans dépendance (téléchargement en un clic)
│   ├── js/voice.js            Choix de la meilleure voix + découpage en phrases (lecture plus naturelle)
│   ├── js/app.js              Interface : questionnaire, restitution, kit, réglages, lecture à voix haute
│   ├── js/admin.js            Espace administrateur (chargé à la demande) : connexion, tableau de bord visuel
│   ├── fonts/                 Atkinson Hyperlegible, Lexend, OpenDyslexic (licence OFL, chargées à la demande)
│   ├── data/questions.json    Questionnaire PARAMÉTRABLE et ADAPTATIF (banque de 51 questions)
│   ├── data/rules.json        Règles du moteur (conditions lisibles, points, points d'attention, pistes)
│   ├── data/resources.json    Liens officiels et interlocuteurs par profil
│   └── i18n/fr.json, en.json  Tous les textes (avec variantes simplifiées « _falc »)
├── tests/                     Tests automatisés (node:test)
├── tests-e2e/                 Tests dans un vrai navigateur (npm run e2e)
├── tools/                     measure-weight.js · seed-demo.js (données fictives) · create-admin.js (comptes)
├── docs/                      Les 8 livrables du projet (voir plus bas)
├── Dockerfile · package.json · .env.example
```

## Correspondance avec le « minimum attendu »

| Attendu | Où c'est fait |
|---|---|
| Application web responsive (ordinateur, tablette, téléphone) | `css/style.css` : mise en page par *container queries*, vérifiée dans Chrome à 375, 768 et 1280 px (captures, aucun débordement) |
| Front-end accessible (HTML sémantique, clavier, contrastes, alternatives textuelles) | `index.html`, `app.js`, `style.css` ; contrastes mesurés dans `docs/06_audit_accessibilite.md` |
| Back-end léger / serverless | `server.js` ; le site fonctionne aussi en hébergement purement statique |
| Questionnaire paramétrable, 8 à 12 questions | `data/questions.json` : **10 à 12 questions essentielles** (dont les deux questions sur le pôle handicap) conformes aux 8–12 du sujet, **puis 17 à 24 questions complémentaires FACULTATIVES et adaptatives** (domaines cochés, projet professionnel) + `i18n/*.json` |
| Moteur de règles explicable, sans décision sensible automatique | `data/rules.json` + `js/engine.js` ; la page résultat affiche chaque règle appliquée |
| Export statistique agrégé + journalisation limitée | `GET /api/export.csv` ; journal sans IP ni User-Agent |
| Documentation d'installation + démo déployable | ce fichier, `Dockerfile`, `docs/09_demonstration.md` |
| Parcours : information → questionnaire → restitution prudente → orientation par profil → kit → tableau de bord | `#/info` → `#/quiz` (→ `#/more`) → `#/result` (points d'attention, pistes, contacts par profil) → `#/kit` → `#/admin` |

**Extras (pistes « se démarquer »)** : mode texte simplifié inspiré du FALC · FR/EN · traitement 100 % local ·
thèmes clair, sombre et **contraste élevé** · **taille du texte de 50 % à 300 %** · **3 polices d'aide à la lecture** · **profils rapides** (dyslexie, TDAH / concentration, malvoyance) ·
repère de lecture · espacement renforcé · **lecture à voix haute plus naturelle** (meilleure voix du navigateur, phrases, vitesse réglable, passage lu mis en évidence) ·
**deux boutons distincts : « Imprimer » et « Télécharger en PDF »** (le PDF est fabriqué dans le navigateur, sans envoi, avec liens cliquables et checklist) + résumé texte · indicateur d'écoconception (`npm run weight` : ≈ 51 Ko réellement transférés à la première visite).

## Confort de lecture et accessibilité visuelle

Ouvrir **Réglages** en haut à droite :

| Réglage | Détail |
|---|---|
| **Profils rapides** | *Dyslexie* : police OpenDyslexic + espacement + texte à 110 %. *TDAH / concentration* : police Lexend + textes simplifiés + espacement + repère de lecture. *Malvoyance* : police Atkinson Hyperlegible + texte à 150 % + contraste élevé. |
| **Police** | Système (par défaut), Atkinson Hyperlegible, OpenDyslexic, Lexend. Téléchargée **seulement si choisie** (≈ 30 à 235 Ko). |
| **Taille du texte** | Curseur de **50 % à 300 %** par pas de 10, boutons A− / A+ / 100 %. La mise en page se réorganise (colonne unique) sans défilement horizontal. |
| **Thème** | Automatique, clair, sombre, **contraste élevé** (noir / blanc / jaune). |
| **Repère de lecture** | Une bande claire suit la souris, le doigt ou la sélection au clavier ; le reste est assombri. |
| **Voix** | Choix de la voix et de la vitesse. Mode « automatique » : meilleure voix disponible. |
| **Langue rapide** | Bouton « English / Français » dans l'en-tête, sans ouvrir les réglages. |
| **Mémoriser** | Facultatif : enregistre **uniquement ces réglages** sur l'appareil (jamais les réponses). |

> **Soyons précis sur les polices.** Aucune police n'a prouvé une efficacité pour tout le monde, y compris pour le TDAH ou la dyslexie : les résultats scientifiques sont partagés. Lexend et Atkinson Hyperlegible sont conçues pour la lisibilité, OpenDyslexic est appréciée par certaines personnes. L'outil les **propose**, la personne garde celle qui lui convient. Pour le TDAH, le plus utile est souvent l'ensemble *textes courts + repère de lecture + une question à la fois*.

**Voix plus naturelle** : le navigateur fournit les voix. Pour une qualité maximale, choisir dans la liste une voix « Natural » (Edge), « Google français » (Chrome) ou une voix « améliorée / premium » (iPhone, Mac). Une voix marquée **« en ligne »** envoie le texte lu à un service du navigateur : pour la lecture du **résultat** (qui reflète les réponses), la voix automatique reste **locale** ; une voix en ligne n'est utilisée que si la personne la choisit.

## Questionnaire adaptatif, points d'attention et pistes

1. **Questions essentielles (8 à 12 selon les réponses).** Elles suivent le sujet : **suivi(e) par le pôle handicap ? (puis souhait de le rejoindre)**, durée des difficultés, domaines concernés, fréquence, besoins, parcours, une question de **contexte étudiant** (examens, stage ou alternance, recherche de stage ou d'emploi), soutien, connaissance de la RQTH, freins, échéance. **Adaptatif** : une personne qui indique *aucune difficulté* ne reçoit pas les questions sur les symptômes, mais « Pour qui vous renseignez-vous ? » (soi, un proche, un collègue, un métier d'accompagnement) et « Anticipez-vous un changement ? ».
2. **Écran de choix.** Après les essentielles : voir son orientation tout de suite, ou répondre à *N* **questions complémentaires** (≈ 25 s chacune), choisies d'après les cases cochées et le projet professionnel : fatigue/douleurs (quand, ce qui devient difficile, besoin de pauses), concentration/lecture (tâches, aides déjà utilisées), vue/audition, mobilité, stress/anxiété (situations, soutien), stabilité des difficultés, impact sur la vie quotidienne ; côté **étudiant** (cursus, aménagements d'examens, stage/alternance, contact avec l'école), **salarié** (manager, poste de travail, médecin du travail, arrêts), **demandeur d'emploi** (obstacles, formation, accompagnement), **agent public** (médecin de prévention, référent, mobilité) ; attentes, préférences de contact, temps disponible, aide autour de soi ; et pour les **proches / professionnels** (objectif, inquiétudes).
3. **Résultat.** Niveau d'orientation (inchangé : seules les questions essentielles comptent), **points d'attention** et **« Pistes pour avancer »** adaptés à ce qui a été coché, avec la mention explicite : *« Ce ne sont que des pistes de réflexion… ni conseils médicaux, ni décisions, ni obligations »*. Les questions complémentaires **n'ajoutent jamais de points** (test automatique).

## Espace administrateur

**Était-il demandé ?** Oui. Le descriptif prévoit une « étape 6 – Tableau de bord administrateur », « uniquement en données agrégées » : *nombre de parcours réalisés, taux de parcours terminés, types d'orientation proposés, langues utilisées, pages documentaires consultées, aucun nom, aucun email, aucune donnée médicale brute*, avec un **export statistique agrégé** et des **seuils minimaux d'affichage**. Il ne dit **rien** sur la forme (portail séparé ou non) ni sur la connexion : il est donc **intégré au site** (`#/admin`) et protégé par un **compte**. « Absence de compte » dans le descriptif concerne les *utilisateurs*, pas l'administrateur.

**Comment il fonctionne**
1. Le navigateur de chaque visiteur envoie des événements **anonymes** : parcours commencé, questions complémentaires choisies, parcours terminé (profil et niveau, **séparément**), lien ou fichier ouvert. Jamais de réponse, de texte libre ni d'identifiant.
2. Le serveur ajoute +1 à des **compteurs** (`var/stats.json`, que des nombres) : pas d'IP, pas de cookie.
3. L'administrateur se connecte (identifiant + mot de passe, haché avec **scrypt**, session de 2 h, 10 échecs / 5 min maximum) et voit : 4 grandes cartes (commencés, terminés, taux, questions complémentaires), des **graphiques avec le nombre de cas pris en compte (n = …)**, l'activité sur 30 jours, un glossaire, et un export CSV.
4. Toute valeur **inférieure à 5** est masquée (« moins de 5 »), avec suppression complémentaire.

**Comment vérifier que ça marche (2 minutes)**
1. `node server.js`, puis ouvrir **deux onglets** : le site, et `http://localhost:3000/#/admin` (connexion `admin` / `HandiDiag-Demo-2026`).
2. Dans le site : commencer un questionnaire, aller jusqu'au résultat, ouvrir un lien du kit, cliquer « Télécharger en PDF ».
3. Dans l'espace admin : « **Actualiser** » (ou attendre 15 s) → « Dernier événement reçu : il y a quelques secondes », +1 sur les compteurs.
4. Vous ne voyez que « moins de 5 » ? **C'est le seuil de confidentialité.** Soit ajouter des données **fictives** : rubrique « Outils de démonstration » en bas du tableau de bord (« Ajouter 120 parcours fictifs ») ; soit relancer avec `$env:MIN_COUNT="1"; node server.js` (PowerShell). **« Remettre les compteurs à zéro »** efface tout avant la vraie utilisation.

**Comptes** : au premier démarrage, un compte `admin` est créé (démonstration). En production (`NODE_ENV=production`), le serveur génère un mot de passe **aléatoire affiché une seule fois** dans la console, ou utilise `ADMIN_USER` / `ADMIN_PASSWORD`. Autre compte : `node tools/create-admin.js <identifiant> <mot-de-passe>`. Mot de passe oublié : supprimer `var/admin.json` et relancer.
**Désactiver** : `DISABLE_STATS=1` supprime statistiques, export et espace administrateur ; le reste fonctionne à l'identique.

## Tests de navigateur (facultatif, recommandé avant la soutenance)

Ils rejouent, dans un **vrai Chrome ou Edge**, ce qui a été vérifié pendant la conception : parcours complet sur téléphone / tablette / ordinateur, absence de débordement, de chevauchement et de texte coupé à **50 % et 300 %**, polices chargées seulement à la demande, profils, bouton retour, **PDF réellement téléchargé**, poids transféré, et **accessibilité automatique axe-core (WCAG 2.2 AA)** sur 13 écrans et thèmes.

```powershell
npm install          # installe puppeteer-core et axe-core (outils de test uniquement)
npm run e2e          # trouve Chrome ou Edge tout seul ; sinon : $env:CHROME_PATH="C:\...\chrome.exe"
$env:E2E_SHOTS="captures"; npm run e2e    # enregistre aussi des captures d'écran
```
Le site lui-même n'a toujours **aucune dépendance** : `npm install` n'est nécessaire que pour ces tests.

## Ce que fait le serveur en plus (performance et sécurité)

Compression **brotli / gzip** des textes, cache par **ETag** (réponses 304), polices en cache longue durée, page **404** soignée, limitation des **tentatives de connexion** au tableau de bord (10 échecs par 5 minutes), en-têtes de sécurité (CSP stricte, `nosniff`, `no-referrer`).

## Changer le questionnaire ou les règles (sans toucher au code)

1. **Ajouter une question** : ajouter un objet dans `public/data/questions.json` (`id`, `type` = `single` ou `multiple`, `options`), puis ses textes dans `i18n/fr.json` et `i18n/en.json` sous `questions.<id>` (`text`, `options.<id>`, optionnel `help` et `text_falc`).
2. **Ajouter une règle** : ajouter un objet dans `public/data/rules.json` avec une condition lisible (`in`, `hasAny`, `countAtLeast`, `all`, `any`, `not`), des `points` et des `flags`, puis son explication sous `rules.<id>` (FR + EN).
3. Lancer `npm test` : les tests vérifient que chaque question, option, règle et drapeau a bien un texte dans les deux langues, et qu'aucun message ne contient de formulation d'éligibilité.

## Déploiement

- **Docker** : `docker build -t handidiag . && docker run -p 3000:3000 -e ADMIN_USER=admin -e ADMIN_PASSWORD=... -v handidiag-data:/app/var handidiag`
- **PaaS Node** (Render, Railway, Fly.io…) : commande de démarrage `npm start`, variables `ADMIN_USER`, `ADMIN_PASSWORD`, `PORT` (et `TRUST_PROXY=1` derrière un reverse-proxy pour compter les tentatives par visiteur et non par proxy). Ajouter un volume sur `var/` si l'on veut conserver les compteurs.
- **Hébergement statique** (GitHub Pages, Netlify…) : publier le dossier `public/`. Tout fonctionne sauf les statistiques et le tableau de bord (ignorés sans erreur visible).
- ⚠️ **Journaux de l'hébergeur** : les plateformes et reverse-proxies enregistrent souvent les adresses IP. Choisir un hébergeur européen et **désactiver ou raccourcir ces journaux** (voir `docs/07_analyse_rgpd_ethique.md`, section 5).

## Limites connues (à connaître avant la démo)

- Les **seuils du moteur de règles sont des heuristiques de travail**, pas des valeurs validées cliniquement. À faire relire par la mission handicap de l'école ou des professionnels avant tout usage réel.
- Le mode « inspiré du FALC » n'est **pas un FALC certifié** (qui exige une relecture par des personnes concernées).
- Les **polices d'aide à la lecture** sont des options de confort, pas des dispositifs prouvés : voir la note plus haut.
- Le test de l'affichage a été fait dans **Chrome (sans interface)** ; à compléter sur de vrais appareils (iPhone/Safari, Android, Firefox) et avec un lecteur d'écran. L'audit automatique (axe-core) ne détecte qu'une partie des problèmes.
- Les **liens officiels** ont été vérifiés le 14/10/2026 ; à re-vérifier avant chaque mise en ligne. Les noms de contacts propres à l'Efrei (mission handicap, santé étudiante) sont génériques : à remplacer par les vrais contacts dans `resources.json`.
- La **lecture à voix haute** utilise les voix du navigateur ; qualité variable selon l'appareil. Une voix « en ligne » envoie le texte lu à un service du navigateur (voir plus haut).
- Les audits (RGAA, lecteurs d'écran) et les tests utilisateurs sont **à réaliser par l'équipe** : `docs/06` et `docs/05` fournissent les protocoles et grilles prêts à remplir.

## Les livrables (`docs/`)

| Fichier | Contenu | État |
|---|---|---|
| `01_etude_contexte.md` | Étude de contexte | Rédigé · chiffres à sourcer |
| `02_benchmark.md` | Benchmark (dont Atouts & Handicap) | Grille prête · observations à remplir |
| `03_personas_et_parcours.md` | Personas et cartographie du parcours | Rédigé (hypothèses à valider en entretien) |
| `04_cahier_des_charges.md` | Cahier des charges | Rédigé |
| `05_prototype_ux_et_tests_utilisateurs.md` | Wireframes, kit Figma, protocole de tests | Rédigé · résultats à remplir |
| `06_audit_accessibilite.md` | Audit RGAA / WCAG | Mesures réalisées · tests manuels à faire |
| `07_analyse_rgpd_ethique.md` | RGPD et éthique | Rédigé · à valider avec le DPO |
| `08_rapport_final.md` | Rapport final | Squelette + résultats techniques réels |
| `09_demonstration.md` | Scénarios de démonstration | Prêt |

Chaque livrable existe aussi en **Word** (`livrables_word/`).

## Équipe et édition « étudiants »

Projet réalisé par Bastien FRANJA, Camille TURA--DURAND, Inès MEHADHEBI, Kiroshan SIVAKUMAR et Maxime CERRUTI (ING3 Bio-informatique, 5e année).

Cette édition s'adresse aux étudiants de l'école qui vont vers le monde du travail :
- 1re question : « Êtes-vous suivi(e) par le pôle handicap ? » Si non : « Souhaitez-vous rejoindre le pôle handicap ? » ; si oui, les sujets traités et les deux contacts (e-mail uniquement) s'affichent. Dans tous les cas, le questionnaire continue vers l'orientation RQTH.
- Chaque question propose « Je préfère ne pas répondre », et le bouton « Valider » reste visible en bas de l'écran.
- Les contacts du pôle se modifient dans `public/data/resources.json` (`contact_defs.pole_social`, `pole_rse`) et `public/i18n/*.json` (`contacts`).
- La question de profil est masquée (valeur fixe « student ») ; les autres profils restent dormants dans les données (`hidden: false` pour les réactiver).
- Les documents (`docs/` en Markdown, `livrables_word/` en Word) et leurs captures décrivent cette édition étudiants.

## Bilingue, accessibilité, éco-conception

- **Tout le site est en français et en anglais** (questionnaire, résultat, kit, PDF, réglages, espace administrateur, pied de page, page 404). Les textes sont dans `public/i18n/fr.json` et `en.json` ; un test vérifie qu'aucune clé ne manque d'un côté.
- **Polices** : OpenDyslexic (dyslexie), Lexend (lecture fluide, TDAH), Atkinson Hyperlegible (malvoyance), taille du texte de 50 % à 300 %, contraste élevé, textes simplifiés, repère de lecture. Les profils de la page Réglages règlent plusieurs options en un clic.
- **Lecture à voix haute en français et en anglais** : questions, résultat, page d'accueil et kit, avec la meilleure voix de l'appareil dans la langue choisie.
- **Téléphone et ordinateur** : mise en page testée de 375 px à 1280 px, texte jusqu'à 300 % sans débordement.
- **Green IT** : moins de 60 Ko compressés à la première visite (`node tools/measure-weight.js`), aucune ressource externe, aucune police chargée sans demande, générateur de PDF et espace admin chargés à la demande, compression brotli/gzip et ETag, thème sombre, aucun traceur ni base de données.
