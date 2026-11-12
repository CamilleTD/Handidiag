# 08 – Rapport final

> **Mode d'emploi** : les parties techniques ci-dessous sont **renseignées avec des mesures réelles** (tests automatiques, poids). Les parties marquées **[À COMPLÉTER]** dépendent d'un travail de terrain (entretiens, tests utilisateurs, audit manuel, validation par la pôle handicap) qui n'a pas encore été mené : ne pas les remplir avec des valeurs supposées.

**Projet** : HandiDiag – ING3 Efrei · **Équipe** : Bastien FRANJA, Camille TURA--DURAND, Inès MEHADHEBI, Kiroshan SIVAKUMAR, Maxime CERRUTI (ING3 Bio-informatique, 5e année) · **Encadrant** : [À COMPLÉTER] · **Date** : [À COMPLÉTER]

---

## 1. Résumé (≈ 10 lignes)
HandiDiag est une application web accessible et confidentielle qui aide un étudiant de l'école, en route vers un stage, une alternance ou un premier emploi, à savoir si une démarche RQTH peut avoir du sens pour lui et vers qui se tourner. Un questionnaire **adaptatif** démarre par le pôle handicap (« suivi(e) ? » ; si non, une question ciblée sur les situations vécues à l'école indique si le pôle peut aider, avec les contacts par besoin : études ou monde du travail), poursuit par 9 à 12 questions essentielles non médicales, toutes passables (« Je préfère ne pas répondre »), puis des questions complémentaires **facultatives** (choisies d'après les domaines cochés et le projet professionnel) est évalué **localement dans le navigateur** par un moteur de règles explicable ; le résultat est une orientation prudente (« il peut être utile d'en parler à… »), jamais un diagnostic ni une promesse. Un kit documentaire (liens officiels, guide en 6 étapes, checklist) accompagne la suite. Un tableau de bord n'expose que des compteurs agrégés protégés par un seuil. Le site s'adapte à l'ordinateur, à la tablette et au téléphone, propose des réglages pour la dyslexie, le TDAH et la malvoyance (trois polices, texte de 50 % à 300 %, contraste élevé, repère de lecture, voix réglable) et ne transfère qu'environ 52 Ko à la première visite, sans service tiers.

## 2. Contexte et problématique
Voir doc 01. **[Reprendre en 1 page : problème, public cible, enjeu spécifique Efrei, chiffres sourcés.]**

## 3. Démarche
| Phase | Ce qui a été fait | Livrable |
|---|---|---|
| Cadrage | Étude de contexte, benchmark, personas, parcours, cahier des charges | Docs 01–04 |
| Conception | Wireframes, système de design, textes, maquette | Doc 05 |
| Réalisation | Prototype, moteur de règles, kit, tableau de bord, tests | Code |
| Validation | Audit d'accessibilité, tests utilisateurs, analyse RGPD / éthique | Docs 05–07 |

**[À COMPLÉTER : dates réelles, répartition des rôles dans l'équipe, entretiens menés (nombre, qui), difficultés rencontrées.]**

## 4. Solution réalisée

### 4.1 Parcours utilisateur
Information (avec des textes qui dédramatisent la RQTH et le handicap) → question sur le pôle handicap : **si suivi(e) → questions RQTH ; sinon → « voulez-vous voir si le pôle peut vous être utile ? » (oui : questions ciblées sur les situations vécues à l'école, indication « le pôle peut vous aider », contacts ; non : on passe) → dans les deux cas, choix « continuer vers la RQTH ou terminer ici »** (Charlie DUPIC et Stéphanie LIBESKIND pour les études, Jordan SACCASYN au Career Center pour le monde du travail) → questionnaire essentiel RQTH (9 à 12 questions ; toutes passables) → écran de choix → questions complémentaires facultatives et adaptatives → restitution (orientation vers le pôle, 4 niveaux RQTH, points d'attention, **pistes pour avancer** « ce ne sont que des pistes », contacts par besoin) → kit documentaire et **page Ressources** (à l'Efrei, au niveau national, la loi).

### 4.2 Moteur de règles explicable
- 109 règles lisibles dans `rules.json` (26 pour le niveau et les points d'attention de base, 60 pour les pistes des questions complémentaires, 8 pour le pôle handicap et le monde du travail, **15 pour l'accès au pôle handicap et le Career Center**) (conditions `in`, `hasAny`, `countAtLeast`, `all`, `any`, `not`). Les règles « pôle » **n'ajoutent aucun point** : elles produisent une orientation séparée (« peut vous aider » / « cela vaut la peine d'en parler »), jamais une décision.
- Score = somme de points ; niveaux : `explore` (0–2), `talk` (3–5), `talk_soon` (≥ 6) ; niveau `already` si une reconnaissance existe déjà ; niveau `explore` forcé si aucun signal.
- Les **freins** (crainte de l'employeur, du regard, complexité…), l'**urgence**, la **connaissance du dispositif**, le **suivi médical** et les **questions de contexte étudiant** **ne modifient pas le score** : ils personnalisent seulement les messages et l'ordre des contacts. C'est un choix éthique : on n'augmente pas un « niveau » à cause de la peur ou d'un délai.
- Chaque règle déclenchée est **affichée** à la personne avec ses points.
- **Limite assumée** : les seuils sont des **heuristiques de travail**, non validées cliniquement. **[À COMPLÉTER : résultat de la relecture par la pôle handicap / un professionnel.]**

### 4.3 Architecture
Voir doc 04 §7. Navigateur : HTML + CSS + JavaScript natif, aucune dépendance. Serveur Node ≈ 250 lignes, aucune dépendance : fichiers statiques, `POST /api/event` (liste blanche), `GET /api/stats` et `/api/export.csv` (jeton).

### 4.4 Vie privée par conception
Aucune réponse stockée ni envoyée ; compteurs **séparés** (jamais profil × niveau) ; seuil k = 5 avec suppression complémentaire ; journal sans IP ni User-Agent ; Do Not Track et GPC respectés ; aucun cookie ni service tiers. Détail : doc 07.

### 4.5 Fonctionnalités ajoutées pour se démarquer
**Réglages dans une page dédiée** (avec Retour) · **questionnaire adaptatif et pistes personnalisées** · **espace administrateur intégré au site, avec comptes et tableau de bord visuel** · pied de page minimal « © Équipe HandiDiag » · mode texte simplifié inspiré du FALC · FR/EN · thèmes clair, sombre et contraste élevé · **taille du texte de 50 % à 300 %** · **polices Atkinson Hyperlegible, Lexend et OpenDyslexic** (locales, à la demande) · **profils rapides** dyslexie / TDAH / malvoyance · repère de lecture · espacement renforcé · **lecture à voix haute plus naturelle** · mémorisation facultative des réglages · statistiques désactivables · **boutons Imprimer et Télécharger en PDF distincts (PDF généré dans le navigateur)** et résumé texte · contacts tenus au secret médical placés en premier lorsque la crainte d'être identifié est exprimée · indicateur d'écoconception · **lecture à voix haute de l'accueil et du kit** · **espace administrateur et page 404 traduits** · **bouton Valider toujours visible**.

## 5. Résultats

### 5.1 Mesures techniques (réelles)
| Indicateur | Résultat | Source |
|---|---|---|
| Tests automatiques | **71 / 71 réussis** (moteur, questionnaire adaptatif, voix, PDF, contenus FR/EN, comptes admin, sécurité, compression) | `npm test` |
| Tests dans un vrai navigateur | **179 / 179 contrôles réussis** (3 formats d'écran, questionnaire adaptatif et pistes, réglages en page, texte 50 % et 300 %, polices, bouton retour, PDF téléchargé, espace admin : connexion, données fictives, remise à zéro, mot de passe) | `npm run e2e` |
| Audit automatique d'accessibilité (axe-core, WCAG 2.2 AA) | **0 violation sur 20 écrans et thèmes** (dont l'espace administrateur) après correction de 2 défauts | `npm run e2e` |
| Poids de l'application | **≈ 224 Ko bruts ; 58 Ko réellement transférés à la première visite** (brotli, en-têtes compris ; objectif ≤ 60 Ko). Espace admin, seconde langue et polices : **à la demande** | Mesure réseau dans Chrome |
| Ressources externes / services tiers | **0** | `npm run weight` |
| Parcours complet dans **Chrome** : téléphone 375 px, tablette 768 px, ordinateur 1280 px | Réussi, **aucun débordement horizontal**, aucune erreur JavaScript | Test navigateur avec captures |
| Texte à **50 %** et **300 %** (mobile et ordinateur) | Réussi : tailles de base mesurées (8 px / 48 px), aucun débordement | Test navigateur |
| Polices, profils, mémorisation facultative des réglages | Appliqués ; aucune police téléchargée par défaut ; rien de stocké sans coche | Test navigateur |
| Défauts détectés puis corrigés | **12** (dont bordures à 1.73:1 → 4.16:1 ; bouton de langue qui recouvrait le logo ; titres sautant un niveau ; formulaire admin qui se vidait ; limite anti-spam bloquant la démonstration) | Doc 06 §2.1 |

### 5.2 Accessibilité
Contrastes calculés et conformes (doc 06). **[À COMPLÉTER : taux de conformité RGAA après audit manuel, tests NVDA / VoiceOver / TalkBack, écarts restants.]**

### 5.3 Tests utilisateurs
**[À COMPLÉTER : nombre de participants, % de parcours réussis seuls, score SUS, « je sais ce que je ferais ensuite », problèmes trouvés et corrections. Utiliser les grilles du doc 05 §6.]**

### 5.4 Validation par la pôle handicap
**[À COMPLÉTER : date, retours sur le ton, les questions, les seuils, les contacts ; modifications effectuées.]**

## 6. Atteinte des objectifs

| Objectif (doc 04) | Cible | Résultat | Statut |
|---|---|---|---|
| O1 Compréhension | ≥ 4/5 | [À COMPLÉTER] | À mesurer |
| O2 Orientation | ≥ 4/5 savent citer un interlocuteur | [À COMPLÉTER] | À mesurer |
| O3 Utilisabilité (SUS) | ≥ 80 | [À COMPLÉTER] | À mesurer |
| O4 Accessibilité | 0 écart bloquant | [À COMPLÉTER après audit] | À mesurer |
| O5 Vie privée | 0 donnée individuelle stockée | 0 (conception + tests automatiques) | **Atteint** |
| O6 Sobriété | ≤ 60 Ko transférés, 0 tiers | ≈ 58 Ko mesurés, 0 tiers | **Atteint** |
| O7 Accès au pôle handicap | ≥ 4/5 des étudiants non suivis savent si et à qui s'adresser | [À COMPLÉTER] | À mesurer |

## 7. Limites et risques résiduels
1. Seuils du moteur non validés par des professionnels.
2. Contacts de l'école : confirmer par écrit la publication des trois adresses e-mail (Charlie DUPIC, Stéphanie LIBESKIND, Jordan SACCASYN) et les relire avec le pôle.
2 bis. Le message « le pôle peut vous aider » repose sur des règles simples (nombre de situations cochées) : ce sont des **heuristiques de travail**, à faire relire par le pôle ; les chiffres de la fiche du pôle ont été lus sur des graphiques.
2 ter. Les adresses de cinq associations (HyperSupers TDAH France, Autisme France, Unafam, France Assos Santé, LADAPT) n'ont pas pu être ouvertes depuis l'environnement de développement : **à vérifier à la main** (champ `to_check` dans `resources.json`). Les textes de loi sont des repères généraux, pas un conseil juridique.
3. Mode simplifié non certifié FALC.
4. Audit manuel, lecteurs d'écran, appareils réels et tests utilisateurs à réaliser (l'affichage n'a été vérifié que dans Chrome).
4 bis. Les polices d'aide à la lecture sont des options de confort, non prouvées comme efficaces pour tous ; la qualité de la voix dépend du navigateur et de l'appareil.

5. Journaux de l'hébergeur à maîtriser (doc 07 §5).
6. Risque de réidentification dans une petite population : tableau de bord à n'ouvrir que si la volumétrie le justifie.
7. Liens officiels à re-vérifier avant chaque mise en ligne.

## 8. Perspectives
- Relecture et co-construction des textes avec des personnes concernées ; FALC certifié.
- Autres langues (le module est extensible : un fichier `i18n/xx.json`).
- Version « hors ligne » installable (PWA) pour limiter encore les échanges.
- Parcours dédiés (apprentis, alternants, agents des trois fonctions publiques).
- Mise à jour assistée des liens officiels (vérification automatique de leur disponibilité).
- Évaluation d'impact avec la pôle handicap (contacts effectivement pris, sans pistage individuel).

## 8 bis. Prochaines étapes demandées par le pôle handicap
1. Faire relire les nouvelles questions, les messages « le pôle peut vous aider » et les textes rassurants par le pôle.
2. **Contacter des étudiants ayant une RQTH** (via le pôle, volontariat, anonyme) pour tester le projet et recueillir des informations (doc 05 §4.2 bis).
3. **Obtenir un rendez-vous avec une personne de la MDPH** pour relire la partie démarche.
4. **Peaufiner la partie technique avec un mentor** (hébergement, sécurité, maintenance).
5. Confirmer avec le pôle le principe de séparation des identifiants (numéro étudiant du pôle différent de celui transmis aux ministères) et le citer dans la version finale du doc 07.

## 9. Bilan de l'équipe
**[À COMPLÉTER : ce qui a bien fonctionné, ce qui a été difficile, apports personnels, ce qu'on referait autrement.]**

## 10. Annexes
A. Cahier des charges (doc 04) · B. Personas et parcours (doc 03) · C. Wireframes et protocole de test (doc 05) · D. Audit d'accessibilité (doc 06) · E. Analyse RGPD / éthique (doc 07) · F. Scénario de démonstration (doc 09) · G. Code source et README.
