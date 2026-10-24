# 09 – Scénario de démonstration (≈ 10 minutes)

## Avant la démo (5 min, la veille et 10 min avant)
1. `node server.js` dans un terminal. La console affiche le **compte de démonstration** : identifiant `admin`, mot de passe `HandiDiag-Demo-2026`.
2. Ouvrir deux onglets : le site (`http://localhost:3000`) et l'espace admin (`http://localhost:3000/#/admin`). Se connecter ; en bas du tableau de bord, rubrique « Outils de démonstration » : **Ajouter 120 parcours fictifs** (à annoncer comme tels).
3. Vérifier : `npm test` (64 tests), `npm run weight` et, si Chrome est installé, `npm run e2e` (157 contrôles).
4. Plan B sans réseau ni Node : `python3 -m http.server -d public 8080` suffit pour le parcours utilisateur (pas d'espace admin).
5. Avoir ouverts : `docs/06_audit_accessibilite.md` (contrastes, axe-core) et `docs/07_analyse_rgpd_ethique.md` (inventaire des données, comptes).
6. **Après la démo** : dans l'espace admin, **« Remettre les compteurs à zéro »**, puis **changer le mot de passe** de démonstration.

## Fil rouge (discours)
> « HandiDiag aide à savoir si une démarche RQTH peut avoir du sens, et à qui parler. Trois choses le distinguent : il ne garde **aucune réponse**, il **explique** son résultat, et il ne **promet jamais** rien. »

## Scénario 1 – Hugo, étudiant en recherche de premier emploi, qui veut rejoindre le pôle (4 min)
| # | Action | À montrer / dire | Résultat attendu |
|---|---|---|---|
| 1 | Page d'accueil | Le sentier en 4 étapes, « ce que fait / ne fait pas l'outil », confidentialité, carte éco-conception, bouton **Lire cette page à voix haute** | Page lisible, illustration animée une fois |
| 2 | Cliquer **Commencer** | Un écran = une question ; segments de progression ; **grand bouton Valider fixé en bas**, « Je préfère ne pas répondre » en dessous | « Question 1 sur 12 » : « Êtes-vous suivi(e) par le pôle handicap de l'école ? » |
| 3 | Cliquer **Valider** sans répondre | Message d'erreur clair | « Choisissez une réponse, ou « Je préfère ne pas répondre ». » |
| 4 | Répondre **Non**, Valider | Question 2 : « Souhaitez-vous rejoindre le pôle handicap ? » | |
| 5 | Choisir **Oui** | Le panneau s'ouvre : sujets (handicap, tiers-temps, social, aides exceptionnelles, aménagements) et **deux adresses e-mail** cliquables, sans Teams | Panneau visible ; il disparaît si on repasse sur « Non » |
| 6 | Valider : durée *6 mois ou plus*, domaines *Stress, anxiété…* puis *Je préfère ne pas répondre* | Choix exclusif : la première case se décoche | Seule « préfère ne pas répondre » reste cochée |
| 7 | Fréquence : *Souvent*. Besoins : *horaires, pauses, télétravail*. Parcours : *ma recherche de stage, d'alternance ou d'emploi* | | |
| 8 | **Question de contexte étudiant** : « Sur le chemin du monde du travail… » → *La recherche de stage, d'alternance ou d'emploi (tests, entretiens)* | Les questions parlent de stage, d'alternance et de premier emploi | |
| 9 | Suivi : *Non*. Soutien : *rien pour l'instant* | | |
| 10 | **Je préfère ne pas répondre** sur la connaissance de la RQTH | Toutes les questions sont facultatives | |
| 11 | Freins : *crainte que mon école ou mon futur employeur soit au courant*. Échéance : *dans les mois à venir* | | « Question 12 sur 12 » |
| 11bis | **Écran de choix** : « Les questions essentielles sont terminées » | On peut voir l'orientation tout de suite ou répondre aux questions complémentaires (après l'école, recrutement, tests en ligne…) | Nombre annoncé, durée estimée |
| 12 | Choisir **Voir mon orientation maintenant** | Niveau « Un échange rapide… est conseillé » ; bandeau « ni diagnostic, ni décision » | Niveau *talk_soon* |
| 13 | Descendre | **Le pôle handicap est en premier** avec ses deux e-mails ; messages : « vous n'avez pas à en informer votre employeur ou votre école » | Contacts du pôle en tête |
| 13bis | Section **« Pistes pour avancer »** | Piste « vous souhaitez rejoindre le pôle… », piste sur ce que peut apporter une RQTH dans le monde du travail, tests et entretiens ; mention **« ce ne sont que des pistes »** | Pistes courtes et prudentes |
| 14 | Section « Ce qui a été pris en compte » | Règles et points affichés : **pas de boîte noire**. Les questions de contexte **n'ajoutent aucun point** | Règles et total affichés |
| 15 | **Écouter ce résultat** | Lecture phrase par phrase, passage lu surligné ; voix **locale** par défaut pour le résultat ; fonctionne aussi en anglais | Voix claire, pauses naturelles |
| 16 | Bouton **Imprimer** | Mise en page d'impression sans interface | Aperçu d'impression propre |
| 17 | Bouton **Télécharger en PDF** | Un fichier PDF est créé **dans le navigateur** (le générateur ne se charge qu'à ce moment) ; adresses e-mail du pôle incluses ; sans les réponses détaillées | Fichier `handidiag-orientation.pdf` |

## Scénario 2 – Yanis, étudiant en alternance : confort de lecture et adaptation (4 min)
1. Cliquer **Réglages** : une **nouvelle page** s'ouvre (bouton **Retour**). Cliquer le profil **Dyslexie** : la police OpenDyslexic, l'espacement et le texte à 110 % s'appliquent d'un coup. Puis **TDAH / concentration** : police Lexend, textes simplifiés, **repère de lecture** (la bande claire suit la souris) ; puis **Malvoyance** : texte à 150 %, **contraste élevé** noir/jaune.
2. Montrer le **curseur de taille** : descendre à **50 %**, puis monter à **300 %** : la page se réorganise en une colonne, sans défilement horizontal. Revenir à 100 % avec le bouton.
3. Changer **librement la police** dans la liste (Atkinson Hyperlegible, OpenDyslexic, Lexend). Dire honnêtement : *« aucune police n'est prouvée efficace pour tout le monde : on propose, la personne choisit ».*
4. Refaire le parcours : *suivi par le pôle : oui*, durée *je ne sais pas*, domaine *concentration, lecture…*, besoin *plus de temps*, parcours *un stage ou une alternance*. **Question de contexte** : « Sur le chemin du monde du travail, qu'est-ce qui est le plus concerné ? » → *les examens*. (Comme il est déjà suivi, la question « avez-vous contacté le pôle ? » n'est pas posée.)
5. À l'écran de choix, **Répondre aux questions complémentaires** : les questions **suivent les cases cochées** (fatigue → quand, ce qui devient difficile ; lecture → tâches, aides utilisées ; étudiant → examens, stage, projet après l'école, recrutement). Au résultat : niveau « Il peut être utile d'en parler » (*talk*) **inchangé** (les complémentaires n'ajoutent aucun point), **points d'attention** et **pistes** (aménagements d'examens à demander tôt, étude de poste, etc.) ; contacts : pôle handicap, santé étudiante, scolarité, Agefiph, MDPH.
5bis. **Sans difficulté** : refaire le début avec *aucune difficulté* : le questionnaire change (« Pour qui vous renseignez-vous ? »), 10 à 11 questions seulement.
6. Cliquer **Lire la question à voix haute** (dans Edge, choisir une voix « Natural » dans les réglages pour montrer la différence). Montrer le réglage de **vitesse**.
7. Changer la langue en **English** : toute la page change, y compris les questions ; les liens vers des pages en français sont signalés.
8. Montrer le **Kit** : liens officiels, frise en 6 étapes, checklist à cocher (compteur).
9. Au clavier uniquement : `Tab` pour montrer le **focus visible**, le lien d'évitement, `Échap` pour fermer les réglages.
10. Sur **téléphone** (ou en réduisant la fenêtre à 375 px) : navigation en 3 onglets, boutons larges, aucune barre de défilement horizontale.

## Scénario 3 – Karim, référent handicap : espace administrateur (3 min)
1. Pied de page → **« Espace administrateur »** : il fait partie du site (`#/admin`). Saisir un **mauvais mot de passe** → message d'erreur, **l'identifiant reste rempli**. Se connecter avec le compte.
2. Montrer l'alerte **« mot de passe de démonstration : à changer »** et la rubrique **« Changer le mot de passe »**.
3. Lire le tableau de bord comme le descriptif le demande : **parcours commencés / terminés**, **taux de parcours terminés**, **types d'orientation proposés**, **langues utilisées**, **pages documentaires consultées**. Souligner le **« n = … »** sous chaque graphique (nombre de cas pris en compte) et la courbe des 30 jours.
4. **Preuve que ça marche en direct** : dans l'autre onglet, faire un parcours jusqu'au résultat et cliquer « Télécharger en PDF » ; revenir au tableau de bord → **Actualiser** : « Dernier événement reçu : il y a quelques secondes », +1 sur les compteurs.
5. Expliquer le **seuil k = 5** : tout nombre inférieur est masqué (« moins de 5 ») pour qu'on ne reconnaisse personne ; **Exporter (CSV)** applique le même masquage.
6. Insister : « Aucun nom, aucun e-mail, aucune donnée médicale brute, aucun croisement : on ne peut pas savoir *qui* est dans quelle case. » Puis **Remettre les compteurs à zéro** (confirmation) pour la suite.

## Questions probables du jury et éléments de réponse
| Question | Réponse courte |
|---|---|
| Pourquoi ne pas stocker les réponses ? | Ce sont des données de santé. Ne pas les collecter est la meilleure protection (doc 07). |
| Qui a décidé des seuils ? | Ce sont des heuristiques de travail, affichées et modifiables dans `rules.json`. Elles doivent être validées par des professionnels. |
| Pourquoi pas d'IA / de chatbot ? | Sujet sensible : on veut un résultat explicable et maîtrisé. Les règles sont visibles par la personne. |
| Que se passe-t-il si quelqu'un refuse les statistiques ? | Aucun événement n'est envoyé ; l'outil fonctionne identiquement. |
| Peut-on réidentifier quelqu'un ? | Pas d'identifiant, pas de croisement, seuil k ; risque résiduel dans une très petite population (doc 07, R5). |
| Est-ce accessible ? | Conçu RGAA, contrastes mesurés, parcours clavier ; **audit manuel et lecteurs d'écran à finaliser** (doc 06). |
| FALC ? | Mode *inspiré du FALC*, **non certifié** : une relecture par des personnes concernées serait nécessaire. |
| Ça marche sans serveur ? | Oui : en hébergement statique, tout fonctionne sauf statistiques et tableau de bord. |
| Poids ? | ≈ 51 Ko réellement transférés à la première visite (mesuré) ; les polices d'aide à la lecture ne se téléchargent que si on les choisit ; aucun service tiers. |
| Le portail administrateur était-il demandé ? | Oui : « étape 6 – tableau de bord administrateur, uniquement en données agrégées », avec export statistique et seuils d'affichage. Le descriptif n'impose ni portail séparé ni mode de connexion : il est donc **intégré au site** et protégé par un compte. Il est désactivable (`DISABLE_STATS=1`). |
| Comment sont protégés les comptes ? | Mots de passe hachés (scrypt) jamais en clair, session de 2 h, blocage après 10 échecs, mot de passe de démonstration signalé, mot de passe aléatoire en production. |
| Pourquoi des questions complémentaires facultatives ? | Le sujet impose 8 à 12 questions : les essentielles (10 à 12) le respectent. Les complémentaires (adaptées aux cases cochées) donnent des pistes plus précises, sans imposer une charge à ceux qui n'en veulent pas, et sans modifier le niveau d'orientation. |
| Les pistes sont-elles des conseils médicaux ? | Non : formulation prudente, mention explicite « ce ne sont que des pistes », aucune décision ; un professionnel les précise. |
| Une police « TDAH » existe-t-elle ? | Aucune n'est prouvée spécifiquement. On propose Lexend et Atkinson Hyperlegible (conçues pour la lisibilité), OpenDyslexic, et surtout *textes courts + repère de lecture + une question à la fois*. |
| La voix est-elle naturelle ? | Elle utilise la meilleure voix du navigateur (Natural sur Edge, Google sur Chrome, premium sur Apple), réglable. Une voix « en ligne » envoie le texte lu au navigateur : pour le résultat, la voix reste locale par défaut. |
| Et si on appuie sur « Retour » pendant le questionnaire ? | On revient à la question précédente avec la réponse conservée (chaque question a son adresse) ; le titre de l'onglet indique « Question n sur 12 ». |
| Jusqu'où peut-on agrandir le texte ? | De 50 % à 300 %, sans défilement horizontal (vérifié sur mobile et ordinateur). |
| Et si les liens officiels changent ? | Date de vérification dans `resources.json` ; revue avant chaque mise en ligne. |

## Check-list finale « avant de lancer la démo »
☐ Les 64 tests passent ☐ Données de démo injectées ☐ Identifiants admin notés ☐ Zoom navigateur à 100 % ☐ Mode sombre prêt à être montré ☐ Plan B (serveur Python) testé ☐ Après la démo : compteurs remis à zéro et mot de passe changé
