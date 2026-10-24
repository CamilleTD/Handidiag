# 07 – Analyse RGPD et éthique

> Ce document est une **analyse de conception**, pas un avis juridique. Elle doit être **relue et validée par le DPO / référent données de l'école** avant toute mise en production. Les points marqués **[À VALIDER]** demandent une décision de leur part.

## 1. Principe directeur : ne pas collecter
Les réponses au questionnaire révèlent des informations sur la **santé**, une catégorie particulière de données (art. 9 RGPD) qui exige des garanties renforcées. La meilleure protection est de **ne pas les collecter du tout** : HandiDiag évalue les réponses **localement dans le navigateur** et ne les envoie nulle part.

## 2. Inventaire des données

| Donnée | Où elle existe | Durée | Envoyée au serveur ? | Commentaire |
|---|---|---|---|---|
| Réponses au questionnaire | Mémoire de la page (variable JavaScript) | Jusqu'au rechargement / fermeture | **Non** | **Jamais** dans un cookie, `localStorage`, `sessionStorage` ou IndexedDB |
| Résultat (niveau, règles) | Mémoire de la page | Idem | **Non** | Le résumé téléchargeable ne contient pas les réponses |
| Cases cochées de la checklist | Mémoire de la page | Idem | **Non** | |
| Réglages d'affichage (langue, taille, thème, police, options, voix, vitesse) | Mémoire de la page ; **si la personne coche « Mémoriser ces réglages »** : `localStorage` de l'appareil (clé `hd-prefs`) | Jusqu'à la décoche ou l'effacement du navigateur | **Non** | Opt-in explicite ; la décoche efface ; **jamais de réponses** ; stockage déclenché par un choix explicite de la personne, pour son seul confort d'affichage ; analyse de l'obligation éventuelle d'information **[À VALIDER par le DPO]** |
| Événement « questions complémentaires choisies » | Serveur, **compteur** global | Illimitée (nombre seul) | Oui, si non refusé | `{t}` seulement ; aucune information sur les réponses |
| Événement « questionnaire commencé » | Serveur, **compteur** par jour | Illimitée (nombre seul) | Oui, si non refusé | `{t, lang}` |
| Événement « terminé » | Serveur, **compteurs séparés** profil / niveau + compteur du jour | Idem | Oui, si non refusé | `{profile, level, lang}` (profil toujours « student » dans cette édition) ; **le couple profil × niveau n'est jamais stocké**. **Les réponses à « suivi(e) par le pôle handicap ? » et « souhaitez-vous rejoindre le pôle ? » ne quittent jamais le navigateur et ne sont comptées nulle part** |
| PDF et résumé texte téléchargés | Fabriqués **dans le navigateur** (`Blob`), enregistrés sur l'appareil de la personne | À la main de la personne | **Non** | Ne contiennent pas les réponses détaillées (orientation, contacts, checklist). Seul le compteur `pdf_download` / `summary_download` peut être envoyé. Rappeler : le fichier enregistré sur un appareil partagé révèle l'orientation |
| Événement « lien/ressource ouvert » | Serveur, compteur par ressource | Idem | Oui, si non refusé | Liste blanche |
| Journal technique | `var/app.log` | Tronqué à 1 Mo | — | Date, méthode, chemin, code. **Sans IP, sans User-Agent, sans paramètres** |
| Limitation de débit | Mémoire du serveur | 60 s | — | Empreinte salée d'IP, jamais écrite sur disque |

Aucun identifiant n'est attribué aux **visiteurs** : pas de session, pas de cookie, pas de jeton utilisateur. Seul l'**administrateur** a un compte (voir ci-dessous).

### Comptes administrateur (données de l'équipe, pas des visiteurs)

| Donnée | Où | Protection |
|---|---|---|
| Identifiant et **empreinte** du mot de passe (scrypt + sel) | `var/admin.json` (droits 0600) | Mot de passe **jamais** stocké en clair (test automatique) ; comparaison en temps constant |
| Session administrateur | **Mémoire du serveur** (2 h, renouvelée à l'usage) + `sessionStorage` de l'onglet | Jeton aléatoire de 256 bits ; supprimé à la déconnexion, à la fermeture de l'onglet et au changement de mot de passe (autres sessions fermées) |
| Tentatives de connexion | Mémoire du serveur (empreinte salée de l'adresse) | 10 échecs / 5 min → blocage (429) ; jamais écrit sur disque |
| Compte de **démonstration** `admin` / `HandiDiag-Demo-2026` | Créé au premier démarrage hors production | **Connu publiquement (README)** : bandeau d'alerte tant qu'il n'est pas changé ; **en production** (`NODE_ENV=production`), mot de passe aléatoire affiché une seule fois ou `ADMIN_PASSWORD` |

**[À VALIDER par le DPO]** : durée de conservation des comptes, liste des personnes habilitées, procédure de départ d'un administrateur.

## 3. Analyse RGPD

**3.1 Qualification** : les compteurs ne permettent pas de remonter à une personne : agrégation, absence d'identifiant, absence de croisement, seuil d'affichage. Ils sont donc conçus pour sortir du champ des données à caractère personnel. **[À VALIDER par le DPO]** : l'évaluation du risque de réidentification dans une petite population (voir §4, risque R5).

**3.2 Transparence** : la page d'information expose ce qui est conservé et ce qui ne l'est pas, avec une **case de refus** des statistiques. Les signaux **Do Not Track** et **Global Privacy Control** sont respectés (aucun événement envoyé). À ajouter avant production : **mentions légales et politique de confidentialité** (responsable du traitement, contact, hébergeur) **[À COMPLÉTER]**.

**3.3 Minimisation** : seules les valeurs d'une **liste blanche** sont acceptées par le serveur ; tout texte libre est refusé (test automatique avec une adresse e-mail en entrée : rejetée).

**3.4 Cookies et traceurs** : aucun cookie, aucun traceur, aucun script ou police tiers (les polices d'aide à la lecture sont **hébergées localement** et chargées à la demande) (vérifiable avec `npm run weight` : « ressources externes : aucune »). Il n'y a donc pas de bandeau de consentement à afficher.

**3.5 Droits des personnes** : n'étant pas identifiables dans les données conservées, l'accès et l'effacement s'exercent par nature : rien n'est stocké à leur sujet. À préciser dans la politique de confidentialité.

**3.6 AIPD (analyse d'impact)** : le sujet touche une **population potentiellement vulnérable** et la santé. Même si aucune donnée de santé n'est conservée, **[À VALIDER]** : documenter avec le DPO soit une AIPD, soit la justification de son absence, en s'appuyant sur ce document.

**3.7 Sécurité** : CSP stricte, `nosniff`, `Referrer-Policy: no-referrer`, liste blanche, limite de taille, limitation de débit, jeton d'administration comparé en temps constant, jeton jamais stocké côté navigateur, HTTPS à imposer à l'hébergement.

## 4. Registre des risques

| # | Risque | Prob. | Impact | Parade en place | Reste à faire |
|---|---|---|---|---|---|
| R1 | Un message est lu comme un diagnostic ou une promesse | Moy. | Élevé | Formulations prudentes ; test automatique interdisant les termes d'éligibilité ; bandeau permanent | Relecture pôle handicap, tests utilisateurs |
| R2 | Collecte involontaire de données de santé | Faible | Élevé | Traitement local ; liste blanche ; aucune réponse stockée | Revue de code avant chaque version |
| R3 | **Journaux de l'hébergeur** enregistrant les IP | **Élevée** | Moyen | Le code ne les enregistre pas | **Choisir un hébergeur UE, réduire/désactiver les journaux d'accès, documenter** (§5) |
| R4 | Ton anxiogène ou stigmatisant | Moy. | Élevé | Langage simple, aucune notion de « gravité », choix « je préfère ne pas répondre », option de passer | Relecture + tests |
| R5 | **Réidentification** dans une petite population (ex. un seul étudiant ayant terminé un jour donné) | Moy. | Moyen | Seuil k = 5, suppression complémentaire, pas de croisement | Évaluer k selon la volumétrie réelle ; ne publier le tableau de bord que si l'effectif le justifie |
| R6 | Règles et seuils **non validés** → orientation inadaptée | Moy. | Moyen | Le résultat n'est jamais une décision ; règles visibles ; tests | **Faire valider les règles par des professionnels** (pôle handicap, médecine préventive) |
| R7 | Liens officiels périmés | Moy. | Moyen | Date de vérification dans `resources.json` | Revue avant chaque mise en ligne |
| R8 | Outil inaccessible aux personnes visées | Moy. | Élevé | Conception RGAA ; contrastes mesurés | Audit manuel + lecteurs d'écran (doc 06) |
| R9 | Fuite ou devinette du mot de passe administrateur (dont le **compte de démonstration, public**) | Faible | Moyen | Variable d'environnement ; comparaison en temps constant ; non stocké ; **blocage après 10 échecs en 5 minutes** (429) | Jeton long et aléatoire ; rotation ; HTTPS |
| R10 | Usage détourné (pression d'une entreprise ou d'une école pour imposer l'outil à un étudiant ou un salarié) | Faible | Élevé | Aucune donnée individuelle n'existe ; pas de lien partageable de résultat | Interdire dans les conditions d'usage d'imposer l'outil |
| R11 | Lecture vocale par une voix « en ligne » du navigateur (le texte lu est envoyé à un service du navigateur) | Moy. | Moyen | Pour les **questions** : texte neutre, voix naturelle autorisée. Pour le **résultat** (qui reflète les réponses) : **voix locale par défaut** ; une voix en ligne n'est utilisée que si la personne la choisit, et elle est signalée « en ligne » | Mentionner dans la politique de confidentialité ; tester sur plusieurs navigateurs |
| R13 | **Données fictives de démonstration** prises pour de vraies | Moy. | Moyen | Bandeau « données FICTIVES » tant qu'elles sont présentes ; bouton « Remettre les compteurs à zéro » avec confirmation ; indicateur `contains_demo_data` dans le CSV ; ajout de données fictives **interdit en production** | Remise à zéro avant la vraie utilisation (checklist du doc 09) |
| R14 | **Pistes** perçues comme des conseils médicaux ou des obligations | Moy. | Élevé | Formulations prudentes (« peut », « peuvent être discutés »), test automatique contre les injonctions, mention explicite « ce ne sont que des pistes » ; **3114** cité seulement pour le soutien psychique manquant | Relecture par la pôle handicap et un professionnel de santé |
| R12 | Réglages mémorisés révélant indirectement un besoin (ex. police dyslexie) sur un appareil partagé | Faible | Faible | Mémorisation **désactivée par défaut**, explicite, effaçable ; aucun lien avec les réponses | Rappeler dans l'aide : ne pas mémoriser sur un appareil partagé |

## 5. Hébergement et exploitation (R3, à traiter impérativement)
- Hébergeur **dans l'Union européenne**, contrat de sous-traitance si nécessaire.
- **Désactiver ou limiter** les journaux d'accès du reverse-proxy / de la plateforme (IP) ; sinon, les mentionner et fixer une durée de conservation courte.
- **HTTPS obligatoire**.
- Sauvegarde de `var/stats.json` : elle ne contient que des nombres.
- Avant la mise en ligne : supprimer `var/stats.json` si `npm run seed` a été utilisé (données fictives de démonstration).

## 6. Charte éthique du projet

1. **Ne pas nuire** : aucun message ne doit pousser à se médicaliser ni à se déclarer ; on informe, on n'incite pas.
2. **Ne jamais décider** : pas de diagnostic, pas de promesse d'éligibilité, pas de note de « gravité ».
3. **Rester transparent** : règles lisibles par tout le monde, affichées avec le résultat ; aucune intelligence artificielle opaque.
4. **Respecter l'autonomie** : la démarche reste personnelle et volontaire ; on rappelle qu'on n'a pas à en informer son employeur ; on peut passer, revenir, tout effacer.
5. **Protéger** : aucune donnée individuelle ; pas de pistage ; pas de service tiers.
6. **Inclure** : accessibilité réelle, langage simple, plusieurs langues, personnes concernées associées aux tests.
7. **S'en tenir aux sources officielles** pour toute orientation ; dater et vérifier.
8. **Humain dans la boucle** : l'outil renvoie toujours vers un interlocuteur humain et vers la MDPH.
9. **Ne pas se substituer aux professionnels** : mention visible, partout.
10. **Rendre des comptes** : la présente analyse, les tests et l'audit sont publics dans le rapport.

## 7. Conditions d'usage recommandées (à intégrer aux mentions légales)
- L'outil est proposé **à titre d'information et d'orientation**.
- Il **ne doit pas être imposé** à une personne par un employeur, une école ou un organisme, ni servir à évaluer un individu.
- Aucun résultat individuel n'étant conservé, aucune preuve de passage n'existe, et c'est voulu.


## Ajout : adresses e-mail du pôle handicap et question sur le pôle
- Les deux adresses publiées (charlie.dupic@efrei.fr, stephanie.libeskind@efrei.fr) sont des **adresses professionnelles de personnes ayant accepté la publication**. Elles sont affichées sans lien Teams ; le site n'envoie aucun message à leur place (lien `mailto:` seulement). **[À CONFIRMER par écrit avec les deux personnes et le DPO.]**
- « Êtes-vous suivi(e) par le pôle handicap ? » est une information sensible : elle est **facultative** (« Je préfère ne pas répondre » existe sur chaque question), reste dans la mémoire de la page et disparaît au rechargement ; elle n'apparaît ni dans le PDF, ni dans le résumé texte, ni dans les statistiques.
