# 04 – Cahier des charges

Version 1.0 · Projet HandiDiag · ING3 Efrei

## 1. Objet
Concevoir et réaliser **HandiDiag**, une application web accessible et confidentielle d'orientation vers la démarche RQTH, destinée aux **étudiants de l'Efrei qui vont vers le monde du travail** (stage, alternance, premier emploi), avec un parcours qui commence par le pôle handicap de l'école.

## 2. Objectifs mesurables

| # | Objectif | Indicateur | Cible |
|---|---|---|---|
| O1 | Aider à comprendre la démarche | Compréhension en test utilisateur (question « expliquez avec vos mots ») | ≥ 4 participants sur 5 |
| O2 | Faciliter l'orientation | Participants qui savent citer au moins un interlocuteur après le parcours | ≥ 4 sur 5 |
| O3 | Être utilisable | Score SUS (voir doc 05) | ≥ 80 |
| O4 | Être accessible | Écarts RGAA bloquants restants | 0 |
| O5 | Protéger la vie privée | Données individuelles stockées | 0 |
| O6 | Être sobre | Poids du parcours par défaut (hors polices choisies par la personne) | ≤ 60 Ko transférés, 0 service tiers (**mesuré sur le réseau : ≈ 51,5 Ko** à la première visite, brotli, en-têtes compris) |

## 3. Utilisateurs
Un seul public : l'étudiant(e) de l'école, en route vers un stage, une alternance ou un premier emploi (la question de profil est masquée, valeur fixe « étudiant » ; les autres profils restent dormants dans les données). Deux situations : déjà suivi(e) par le pôle handicap, ou non. Administrateur : référente du pôle handicap / équipe projet. Personas : doc 03.

## 4. Exigences fonctionnelles
Priorité MoSCoW : **M** = indispensable · **S** = important · **C** = souhaitable.

| ID | Exigence | Prio | Critère d'acceptation | Fichiers |
|---|---|---|---|---|
| EF-01 | Page d'information : ce qu'est la RQTH, ce que fait / ne fait pas l'outil, confidentialité | M | Les 4 blocs sont présents et lisibles sans JavaScript de traitement | `app.js` (renderInfo), `fr.json` |
| EF-02 | Questionnaire paramétrable et **adaptatif** : **questions essentielles (10 à 12 selon le parcours, dont les deux questions sur le pôle handicap)**, puis **questions complémentaires facultatives** (17 à 24 posées selon les réponses, 27 en banque) | M | Les essentielles font entre 8 et 12 par parcours (test automatique, 4 durées de difficultés) ; ajout d'une question par JSON seul (`phase`, `showIf`) | `questions.json`, `app.js`, tests |
| EF-03 | **« Je préfère ne pas répondre » sur chaque question**, sans exception | S | Bouton visible sous le bouton Valider ; aucune question obligatoire (test automatique) ; le moteur fonctionne avec réponses manquantes | `app.js`, test « questionnaire entièrement sauté » |
| EF-04 | Moteur de règles explicable | M | Chaque règle déclenchée est affichée ; résultat déterministe ; aucune décision sensible automatique | `engine.js`, `rules.json`, tests |
| EF-05 | Restitution prudente en 4 niveaux | M | Aucun message ne contient « éligible » ni promesse (test automatique) ; bandeau « ni diagnostic ni décision » | `fr.json`, `en.json`, test |
| EF-06 | Orientation des étudiants | M | Contacts : pôle handicap (deux adresses e-mail, aucun lien Teams), santé étudiante, scolarité, Agefiph, MDPH ; liens officiels cliquables | `resources.json`, `app.js` |
| EF-07 | Tenir compte des craintes (employeur, regard des autres) | S | Si exprimées : contacts tenus au secret médical placés en premier + message dédié | `app.js` (orderedContacts) |
| EF-08 | Kit documentaire | M | Liens officiels, guide en 6 étapes, checklist de 8 points, points de vigilance | `app.js` (renderKit) |
| EF-09 | Deux boutons distincts : **Imprimer** et **Télécharger en PDF** (fichier fabriqué dans le navigateur) ; résumé texte | S | Mise en page d'impression sans interface ; PDF A4 multi-pages avec accents, liens cliquables, checklist et pied de page ; **ni le PDF ni le résumé ne contiennent les réponses détaillées** ; téléchargement vérifié dans Chrome | `pdf.js`, `style.css`, `app.js`, tests |
| EF-10 | **Espace administrateur intégré au site** (`#/admin`), données agrégées uniquement : parcours commencés/terminés, taux, types d'orientation, langues, pages consultées | M | Connexion par compte ; tableau de bord visuel (cartes, graphiques, courbe 30 jours) avec le **nombre de cas pris en compte (n)** ; valeurs sous le seuil k masquées ; aucun croisement | `server.js`, `admin.js`, tests |
| EF-11 | Export statistique CSV | M | Même masquage que le tableau de bord | `server.js`, test |
| EF-12 | Journalisation technique limitée | M | Journal sans IP ni User-Agent, rotation à 1 Mo | `server.js` |
| EF-13 | Mode texte simplifié inspiré du FALC | S | Variantes `_falc` pour info, questions, résultats | `i18n/*.json` |
| EF-14 | Multilingue FR/EN **sur tout le site, espace administrateur et page 404 compris** | S | Tous les textes présents dans les 2 langues (test de parité des clés) ; audit des pages en anglais sans texte français | `i18n/*.json`, test |
| EF-15 | Confort de lecture : taille du texte, thèmes clair/sombre, espacement renforcé | S | Réglages sans perte de contenu à 200 % | `style.css`, `app.js` |
| EF-16 | Lecture à voix haute en français et en anglais des questions, du résultat, **de la page d'accueil et du kit**, plus naturelle | S | Meilleure voix disponible, lecture phrase par phrase avec pauses, vitesse réglable, passage lu mis en évidence ; voix locale par défaut pour le résultat | `voice.js`, `app.js`, tests |
| EF-17 | Choix de refuser les statistiques anonymes | S | Case à cocher ; respect de Do Not Track et Global Privacy Control | `app.js` |
| EF-18 | Profils rapides : dyslexie, TDAH / concentration, malvoyance | S | Un clic règle police, taille, espacement, thème, repère ; retour aux réglages d'origine | `app.js`, `style.css` |
| EF-19 | Choix de police : Atkinson Hyperlegible, OpenDyslexic, Lexend | S | Police appliquée ; fichiers téléchargés **seulement** si choisis ; licences incluses | `style.css`, `fonts/`, test |
| EF-20 | Taille du texte de **50 % à 300 %** | M | Curseur + boutons ; aucun défilement horizontal à 50 % et 300 % (mobile et ordinateur) | `style.css`, `app.js` |
| EF-21 | Thème à contraste élevé et repère de lecture | S | Contrastes mesurés ; bande de lecture suivant souris, doigt et focus | `style.css`, `app.js` |
| EF-22 | Mémorisation **facultative** des réglages d'affichage | C | Rien n'est stocké sans coche ; la décoche efface ; jamais de réponses | `app.js` |
| EF-23 | Statistiques et tableau de bord **désactivables** | C | `DISABLE_STATS=1` : événements ignorés, export et page admin introuvables | `server.js`, test |
| EF-28 | **Réglages = page dédiée** (`#/settings`) avec bouton Retour | S | S'ouvre comme une nouvelle page ; « Retour » ramène à l'écran d'origine (questionnaire conservé) | `index.html`, `app.js` |
| EF-29 | Pied de page minimal et centré : « © Équipe HandiDiag » et lien « Espace administrateur » | S | Rien d'autre dans le pied de page (la mention « ni diagnostic, ni décision » figure sur la page d'information et sur chaque résultat) | `index.html`, `style.css` |
| EF-30 | Écran « questions complémentaires » après les essentielles | S | Annonce le nombre de questions et la durée ; on peut passer directement au résultat, ou y revenir depuis le résultat | `app.js` |
| EF-31 | Questions complémentaires **adaptées aux domaines cochés et au projet professionnel** (stage, alternance, premier emploi, recrutement) ; parcours plus court et orienté « accompagnement » si aucune difficulté | S | Aucune question hors domaine coché (tests automatiques) ; **aucun point ajouté** | `questions.json`, `rules.json`, tests |
| EF-32 | **Points d'attention** et **pistes pour avancer** adaptés aux cases cochées, avec mention « ce ne sont que des pistes » | M | Pistes liées aux réponses ; formulation prudente testée ; aucune injonction ni promesse | `rules.json`, `fr.json`, `app.js`, tests |
| EF-33 | **Comptes administrateur** : mot de passe haché, session 2 h, changement de mot de passe, blocage après 10 échecs | M | Mot de passe jamais en clair ; compte de démonstration signalé ; mode production = mot de passe aléatoire | `server.js`, `create-admin.js`, tests |
| EF-34 | **Outils de démonstration** : données fictives, remise à zéro, « dernier événement reçu », actualisation automatique | C | Les chiffres bougent après un parcours réel ; bandeau « données fictives » ; confirmation avant remise à zéro | `server.js`, `admin.js` |
| EF-25 | Navigation par l'historique du navigateur dans le questionnaire | S | Chaque question a son adresse (`#/quiz/N`) : le bouton retour (téléphone, navigateur) revient à la question précédente avec la réponse conservée ; impossible de sauter au-delà de la question atteinte | `app.js`, test navigateur |
| EF-26 | Titre d'onglet unique à chaque écran (« Question n sur 12 – … ») | S | WCAG 2.4.2 ; vérifié en test navigateur | `app.js` |
| EF-27 | Bascule rapide de langue dans l'en-tête | C | Bouton « English / Français » ; l'attribut `lang` du bouton suit | `index.html`, `app.js` |
| EF-24 | Question propre au contexte étudiant : « Sur le chemin du monde du travail, qu'est-ce qui est le plus concerné ? » (examens, stage ou alternance, recherche de stage ou d'emploi…) | S | N'affecte pas le score | `questions.json`, `rules.json` |
| EF-35 | **Parcours pôle handicap** : 1re question « suivi(e) par le pôle ? » ; si non, « souhaitez-vous le rejoindre ? » avec sujets et contacts par e-mail si oui ; dans tous les cas, suite vers l'orientation RQTH | M | Tests automatiques (questions visibles selon les réponses) et navigateur (panneau des contacts, e-mails cliquables, aucun lien Teams) | `questions.json`, `app.js`, `resources.json` |
| EF-36 | **Bouton « Valider » toujours visible** (grand, fixé en bas de l'écran) puis Retour et « Je préfère ne pas répondre » | S | Visible sans défilement sur téléphone et ordinateur (test navigateur) | `app.js`, `style.css` |
| EF-37 | **Questions et pistes pour le monde du travail** : stage, alternance, premier emploi, tests en ligne, entretiens, CV, délais d'une RQTH | M | 6 nouvelles pistes testées ; questions « après l'école » et « recrutement » | `questions.json`, `rules.json`, `fr.json` |
| EF-38 | **Éco-conception** : < 60 Ko à la première visite, PDF et espace admin chargés à la demande, carte d'information sur l'accueil | S | `npm run weight` ; aucune ressource externe | `app.js`, `tools/measure-weight.js` |

## 5. Exigences non fonctionnelles

| Domaine | Exigence |
|---|---|
| **Adaptabilité** | Ordinateur, tablette et téléphone ; mise en page par *container queries* en `em`, donc qui suit aussi la taille du texte ; vérifiée à 375, 768 et 1280 px, texte à 50 % et 300 %. |
| **Accessibilité** | Conformité visée : RGAA 4.1 niveau AA / WCAG 2.1 AA. HTML sémantique, navigation clavier complète, focus visible, contrastes ≥ 4,5:1 (texte) et ≥ 3:1 (composants), gestion du focus à chaque changement d'écran, annonces via `aria-live`, étiquettes explicites, alternatives textuelles, `lang` à jour, zoom 200 % sans perte. |
| **RGPD / vie privée** | Aucune donnée personnelle collectée ; traitement local ; pas de cookie ; pas de service tiers ; seuil d'affichage ; hébergement UE ; voir doc 07. |
| **Performance réseau** | Compression brotli / gzip des fichiers texte, ETag et réponses 304, polices en cache d'un an (`immutable`), cache mémoire côté serveur. |
| **Sécurité** | **Comptes administrateur (mots de passe hachés scrypt, sessions de 2 h en mémoire), limitation des tentatives de connexion (10 échecs / 5 min), limite d'événements réglable (600/min par défaut : à l'école tous partagent une adresse).** CSP stricte (`default-src 'self'`), `nosniff`, `Referrer-Policy: no-referrer`, liste blanche des événements, taille de requête limitée, limitation de débit en mémoire, jeton comparé en temps constant, protection contre la traversée de répertoire. |
| **Performance et sobriété** | ≤ 60 Ko gzip pour le parcours par défaut ; aucune bibliothèque externe ; polices d'aide à la lecture **locales et chargées à la demande**. |
| **Compatibilité** | Navigateurs récents (Chrome, Firefox, Safari, Edge) ; mobile à partir de 320 px. |
| **Maintenabilité** | Aucune dépendance ; contenu séparé du code (JSON) ; tests automatisés ; documentation. |
| **Exploitabilité** | Démarrage en une commande ; Dockerfile ; fonctionne aussi en hébergement statique. |

## 6. Contraintes
- Aucune question médicale précise ; aucune pièce médicale manipulée.
- Aucun diagnostic, aucune évaluation d'éligibilité.
- Les orientations s'appuient uniquement sur des **sources officielles**.
- Stack : HTML, CSS, JavaScript natif ; Node.js léger côté serveur.

## 7. Architecture

```
Navigateur (HTML + CSS + JS)                         Serveur Node (sans dépendance)
┌──────────────────────────────────────┐             ┌──────────────────────────────────┐
│ questions.json  rules.json  i18n/*.json │──fichiers──▶│ sert public/                     │
│ engine.js évalue les réponses LOCALEMENT │             │                                  │
│ réponses = mémoire de la page seulement  │──compteurs─▶│ POST /api/event (liste blanche)  │
└──────────────────────────────────────┘  anonymes    │ var/stats.json (nombres seuls)   │
                                                         │ GET /api/stats|export.csv (compte)│
                                                         └──────────────────────────────────┘
```
Les réponses ne quittent jamais le navigateur. Le serveur ne reçoit que des événements du type `{t:"complete", profile (toujours « student »), level, lang}` ou `{t:"doc", doc}` et les stocke dans des **compteurs séparés**.

## 8. Livrables
Les neuf livrables sont dans `docs/` et le code dans `public/`, `server.js`, `tests/`, `tools/`. Voir le README pour l'état de chacun.

## 9. Planning proposé (16 semaines, 4 sprints)

| Sprint | Semaines | Contenu | Livrables clés |
|---|---|---|---|
| 1 – Cadrage | 1–4 | Contexte, benchmark, personas, parcours, cahier des charges, entretiens | Docs 01–04 |
| 2 – Conception | 5–8 | Wireframes, maquette Figma, rédaction des textes, relecture pôle handicap, test papier | Doc 05 (v1) |
| 3 – Réalisation | 9–13 | Prototype, moteur, kit, tableau de bord, tests automatiques, audit accessibilité | Code, doc 06 |
| 4 – Validation | 14–16 | Tests utilisateurs, corrections, RGPD, rapport, démonstration | Docs 07–09 |

## 10. Critères de réussite
Les objectifs O1 à O6 sont atteints ; les tests automatiques passent ; l'audit ne laisse aucun écart bloquant ; la pôle handicap a relu les textes ; la démonstration déroule les deux parcours (utilisateur et administrateur) sans accroc.

## 11. Risques et parades
Voir doc 01 (§7) et doc 07 (registre des risques).
