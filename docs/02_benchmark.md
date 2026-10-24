# 02 – Benchmark

> Un benchmark est une **observation**, pas une opinion. Les colonnes « Observé » sont à remplir **après avoir réellement utilisé chaque service** (captures d'écran datées en annexe). Les cases marquées « d'après le descriptif » viennent du document de projet et sont à confirmer sur le site.

## 1. Services à comparer

| # | Service | Type | Pourquoi |
|---|---|---|---|
| A | **Autodiagnostic d'Atouts & Handicap** (cité par le descriptif) | Questionnaire en ligne | Référence directe citée dans le sujet : questionnaire confidentiel d'aide à la décision sur la RQTH |
| B | **Mon Parcours Handicap** (portail national, MDPH) | Portail officiel | Source officielle pour le dépôt de la demande : référence de contenu |
| C | **Service-public.fr**, fiche RQTH | Fiche d'information | Référence de clarté et de fiabilité du texte |
| D | **Agefiph / FIPHFP** | Sites d'organismes | Aides et contacts selon le secteur (privé / public) |
| E | Outils d'autodiagnostic ou simulateurs d'aides d'autres organismes **[À COMPLÉTER : en chercher 1 ou 2]** | Divers | Élargir la comparaison |

## 2. Grille d'évaluation (à remplir pour chaque service)

Notation : 0 = absent · 1 = partiel · 2 = satisfaisant · 3 = très bon. Toujours noter **la preuve** (capture, URL, date).

| Critère | A | B | C | D | **HandiDiag** |
|---|---|---|---|---|---|
| **Clarté** : on comprend en moins de 30 s ce que fait l'outil | | | | | 2 (page info structurée ; à valider en test) |
| **Langage simple** : phrases courtes, pas de jargon non expliqué | | | | | 2 (variante simplifiée disponible) |
| **Confidentialité visible** : l'utilisateur sait ce qui est conservé | | | | | 3 (liste explicite, case de refus des statistiques) |
| **Sans compte** | | | | | 3 |
| **Résultat personnalisé** selon la situation | | | | | 2 (pôle handicap, niveau, pistes) |
| **Résultat explicable** : on voit pourquoi | | | | | 3 (règles affichées) |
| **Prudence du ton** : jamais de promesse d'éligibilité | | | | | 3 (test automatisé) |
| **Orientation concrète** : vers qui, avec quel lien | | | | | 2 (génériques à compléter avec contacts Efrei) |
| **Aide à la démarche** : étapes, checklist, formulaires | | | | | 2 |
| **Accessibilité** (clavier, contraste, lecteur d'écran) | | | | | 2 (conçu pour ; audit à finaliser) |
| **Confort de lecture** (police, taille, thème, voix) | | | | | 3 (3 polices, texte 50–300 %, contraste élevé, voix réglable) |
| **Multilingue** | | | | | 2 (FR/EN) |
| **Mobile** | | | | | 3 (testé à 375, 768 et 1280 px) |
| **Ciblage étudiants / jeunes diplômés** | | | | | 2 |
| **Écoconception** (poids, services tiers) | | | | | 3 (≈ 51 Ko transférés, 0 service tiers) |

> Les notes « HandiDiag » sont des **auto-évaluations de conception** ; les remplacer par des notes issues de l'audit (doc 06) et des tests (doc 05).

## 3. Ce que le descriptif indique sur l'autodiagnostic d'Atouts & Handicap

D'après le document de projet : outil de type questionnaire d'aide à la décision, confidentiel, qui informe sur la RQTH et oriente la personne. **[À COMPLÉTER après usage réel : nombre de questions, durée, ce que l'outil restitue, ce qui est stocké, accessibilité observée, langues.]**

## 4. Protocole d'observation (à suivre pour chaque service)

1. Se placer dans la peau d'un persona (doc 03) ; noter l'objectif.
2. Parcourir le service **sans aide**, chronomètre en main ; noter la durée et les blocages.
3. Tester au **clavier seul** (Tab, Maj+Tab, Entrée, Espace) et à **200 % de zoom**.
4. Lancer un test automatique (axe DevTools ou Lighthouse) et noter le score **comme indicateur seulement**.
5. Lire la politique de confidentialité : que collecte-t-on, qui est destinataire ?
6. Capturer l'écran de résultat et noter les formulations (promesse ? ton ?).

## 5. Synthèse attendue (à rédiger après remplissage)

- **Ce qui existe déjà et qu'on ne refait pas** : liens vers les démarches officielles.
- **Ce que l'offre existante couvre mal** (hypothèses à confirmer) : parcours spécifique **étudiants et jeunes diplômés** ; explication visible des raisons du résultat ; mode texte simplifié ; traitement 100 % local ; déploiement possible à l'école.
- **Positionnement d'HandiDiag** : *un outil d'orientation transparent, anonyme et adapté au contexte étudiant, complémentaire des services officiels et non concurrent.*
