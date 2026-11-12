# 01 – Étude de contexte

> Légende : **[À COMPLÉTER]** = information à rechercher et sourcer par l'équipe. Aucune statistique n'est donnée ici sans source : n'en ajouter que si elle est citée (Agefiph, DARES, DREES, Handicap.gouv.fr, enquêtes de l'école).

## 1. Le sujet en une phrase

Beaucoup d'étudiants dont la santé affecte durablement leurs études, leur stage, leur alternance ou leur entrée dans l'emploi ne font pas la démarche de **reconnaissance de la qualité de travailleur handicapé (RQTH)**, souvent parce qu'elles ne connaissent pas le dispositif, ne savent pas à qui s'adresser, ou redoutent le regard des autres. HandiDiag est un outil d'**orientation** destiné aux **étudiants de l'école qui vont vers le monde du travail** : il informe, aide à se situer sans diagnostic, et indique vers qui se tourner, en commençant par le **pôle handicap de l'école**.

## 2. Qu'est-ce que la RQTH ?

- Décision administrative qui ouvre l'accès à des mesures favorisant l'obtention ou le maintien d'un emploi : aménagements de poste ou d'horaires, aides financières, accompagnement spécialisé.
- Concerne les personnes dont les possibilités d'obtenir ou de conserver un emploi sont réduites par l'altération durable d'une ou plusieurs fonctions physiques, sensorielles, mentales ou psychiques.
- La demande est **personnelle et volontaire**. Elle est déposée auprès de la **MDPH** (Maison départementale des personnes handicapées) du département de résidence ; la décision est prise par la **CDAPH** (commission des droits et de l'autonomie des personnes handicapées).
- Sources officielles retenues dans l'outil : Mon Parcours Handicap, Service-public.fr (voir `public/data/resources.json`).
- Pour un employeur, l'emploi de personnes reconnues travailleurs handicapés entre dans l'**obligation d'emploi de travailleurs handicapés (OETH)**. **[À COMPLÉTER : vérifier le taux et le seuil d'effectif en vigueur sur Service-public.fr avant de le citer.]**

## 3. Problème et opportunité

| Constat (à documenter) | Conséquence | Réponse d'HandiDiag |
|---|---|---|
| Méconnaissance du dispositif | Démarche jamais engagée | Page d'information en langage simple, mode texte simplifié |
| Ne pas savoir à qui s'adresser | Abandon avant le premier contact | Première question sur le pôle handicap ; puis pôle handicap de l'école en premier (e-mail), santé étudiante, scolarité, Agefiph, MDPH |
| Peur du regard / de l'employeur | Évitement | Outil anonyme, sans compte ; message explicite sur le caractère personnel de la démarche ; contacts tenus au secret médical mis en premier si cette crainte est exprimée |
| Dossier perçu comme complexe | Report ou abandon | Kit : liens officiels, checklist, guide pas à pas |
| Démarche engagée trop tard (stage, alternance, début d'emploi) | Rupture de droits ou d'aménagements | Question sur l'échéance + message sur les délais de traitement |

**[À COMPLÉTER]** : ajouter 3 à 5 chiffres sourcés sur le non-recours, les délais MDPH et l'emploi des personnes handicapées (Agefiph / DARES / DREES).

## 4. Contexte spécifique : l'Efrei et les étudiants

- Les étudiants en école d'ingénieurs enchaînent **stages, alternance, examens et premier emploi** : un aménagement manquant à un moment clé peut avoir des conséquences importantes.
- Une reconnaissance officielle obtenue pendant les études peut éviter une **rupture de droits** à l'entrée dans la vie active (le descriptif du projet insiste sur ce point).
- Interlocuteurs internes : le **pôle handicap** (sujets traités : handicap, tiers-temps, social, aides exceptionnelles, aménagements), joignable par e-mail auprès de **Charlie DUPIC** (référente social et handicap, charlie.dupic@efrei.fr) et de **Stéphanie LIBESKIND** (responsable RSE, stephanie.libeskind@efrei.fr), qui ont accepté la publication de leur adresse (aucun lien Teams) ; puis le service de santé étudiante et la scolarité. **[À COMPLÉTER : horaires et lieu du pôle.]**
- **Étape « pôle handicap » (avant les questions RQTH)** : « Êtes-vous suivi(e) par le pôle handicap ? ». **Oui** → on passe directement aux questions RQTH. **Non** → « Souhaitez-vous voir si le pôle handicap pourrait vous être utile ? » : **oui** → questions ciblées sur les situations vécues à l'école, indication « le pôle peut vous aider » et contacts par besoin, puis le choix **continuer vers la RQTH ou terminer ici** ; **non** → directement ce même choix (continuer vers la RQTH ou terminer ici). « Terminer ici » mène à un écran avec les contacts, sans niveau RQTH, et un bouton pour répondre ensuite aux questions RQTH.
- **Monde du travail** : Jordan SACCASYN (référent handicap au Career Center, jordan.saccasyn@efrei.fr) pour la recherche de stage, d'alternance ou d'emploi et les aménagements en entreprise ; **études à l'école** : Charlie DUPIC et Stéphanie LIBESKIND.
- Objectif d'« applicabilité » : l'outil doit pouvoir être déployé à l'école (preuve de concept) sans compte ni intégration SI.

### 4 bis. Ce que le pôle handicap nous a appris (fiche d'information et échanges, novembre 2026)

**Source.** Fiche d'information du pôle handicap de l'Efrei (rapport d'activité handicap 2026, 4 diapositives) et échanges avec le pôle. Les chiffres ci-dessous sont **lus sur la fiche** : à confirmer avec le pôle avant toute publication.

**Engagement de l'école.** Politique pérenne d'égalité des chances et d'inclusion, portée par l'ensemble des services (systèmes d'information, transformation, vie associative, innovation pédagogique, projets transverses, laboratoire de recherche) ; de nombreux collaborateurs formés aux Premiers Secours en Santé Mentale (PSSM). L'inclusion est « une responsabilité partagée par l'ensemble de la communauté éducative ».

**Processus d'accompagnement** : (1) premier entretien (mise en confiance, respect de la vie privée, identification des besoins, explication des règles et des justificatifs) → (2) mise en place des aménagements → (3) échange avec les équipes pédagogiques si besoin → (4) suivi pendant toute la scolarité (jurys si besoin) → (5) aide à l'insertion professionnelle (entreprises partenaires).

**Aménagements les plus fréquents** (ordre décroissant, ordres de grandeur lus sur le graphique) : salle particulière (≈ 290) et temps majoré (≈ 285) loin devant ; puis matériel informatique (≈ 90), temps de pause (≈ 70), matériel technique et autre (≈ 50), logiciel adapté (≈ 30), aide humaine – reformulation, documents adaptés (≈ 15 chacun), épreuves aménagées, placement spécifique, aide à la communication (< 10).

**Situations accompagnées** (deux populations de l'école, notées PGE et PEx sur la fiche) :

| Situation | PGE | PEx |
|---|---|---|
| Langue et parole (troubles « dys ») | 58 | 39 |
| Maladie invalidante | 39 | 33 |
| Non divulgué | 27 | 27 |
| Psychique | 29 | 21 |
| Cognitif | 19 | 13 |
| Moteur | 14 | 14 |
| Trouble du spectre de l'autisme | 14 | 9 |
| Troubles associés | 8 | 4 |
| Auditifs | 7 | 2 |
| Autres troubles | 2 | 5 |
| Visuel | 2 | 1 |

**À retenir** : les « dys » et les maladies invalidantes représentent à elles seules près de la moitié des situations déclarées ; les troubles psychiques sont de plus en plus présents ; **la majorité des situations sont des handicaps invisibles**, qui demandent des réponses individualisées et évolutives. Cela guide le choix des questions (temps, lecture/écriture, concentration, stress et bruit, fatigue et santé, reformulation, sens et mobilité) et le ton rassurant du site.

**Demandes du pôle pour HandiDiag** (et ce que le site fait) :

| Demande | Réponse dans HandiDiag |
|---|---|
| Élargir l'outil sans retirer le côté humain ; aucun diagnostic | Chaque résultat renvoie vers une personne (e-mail) ; « pistes » et jamais « éligible » (test automatique) |
| Partie RQTH complète | Questionnaire RQTH conservé (9 à 12 questions essentielles), questions complémentaires, kit pas à pas |
| Suivi(e) → RQTH ; sinon → pôle handicap | Question 1 « suivi(e) par le pôle ? » ; si non, 1 question ciblée sur les situations vécues, une indication « le pôle peut vous aider », puis les contacts |
| Utiliser le rapport d'activité pour des questions plus détaillées | 7 situations proposées (temps, écriture/lecture, concentration, bruit/stress, santé/fatigue, sens/mobilité, reformulation) et 11 aménagements dans les questions complémentaires |
| Numéro étudiant du pôle différent de celui transmis aux ministères (non-identification) | Aucun numéro étudiant ni identifiant dans HandiDiag ; principe repris dans l'analyse RGPD (doc 07). **À confirmer avec le pôle** |
| Principales associations nationales hors Efrei ; ressources à l'Efrei / nationales / législation | Page « Ressources » en trois parties (12 associations, organismes publics, 7 repères de loi) |
| Dédramatiser la RQTH et le handicap (peur de la stigmatisation) ; pôle anonyme, seules les informations utiles à l'aménagement sont communiquées | Bloc « des mots qui font parfois peur » sur l'accueil ; rappel de confidentialité dans les questions, le résultat et les ressources |
| Jordan SACCASYN, référent handicap au Career Center (pour la recherche d'emploi) ; Charlie DUPIC et Stéphanie LIBESKIND pour l'école | Contacts par besoin : études / monde du travail (e-mail uniquement) |
| Une entreprise a proposé un questionnaire handicap au pôle (autodiagnostic d'Atouts & Handicap) | Étudié dans le benchmark (doc 02) ; HandiDiag s'en distingue par l'étape « pôle handicap » et les ressources de l'école |
| Contacter des étudiants ayant une RQTH pour tester et recueillir des informations | Prévu dans le protocole de tests (doc 05 §4.2 bis) ; **à faire** |
| Partie technique à peaufiner avec un mentor | Prévu au planning (doc 08 §8) ; **à faire** |
| Obtenir un rendez-vous avec une personne de la MDPH | Prévu (doc 08 §8) ; **à faire** |

## 5. Parties prenantes

| Partie prenante | Intérêt | Implication souhaitée |
|---|---|---|
| Utilisateurs : étudiants de l'école, en route vers un stage, une alternance ou un premier emploi | Comprendre, se situer, agir | Tests utilisateurs, entretiens |
| Pôle handicap de l'école | Toucher les étudiants concernés | Relecture des textes et du ton, validation des seuils, contacts |
| Direction / RH de l'école | Politique d'inclusion | Validation du déploiement |
| Médecine de prévention / santé étudiante | Cohérence avec la pratique | Relecture |
| DPO / référent données | Conformité | Validation de l'analyse RGPD (doc 07) |
| MDPH, Agefiph, FIPHFP, Cap emploi, France Travail | Sources officielles | Aucune intégration : liens sortants uniquement |
| Équipe projet et encadrant | Livrer un outil sûr et utile | Revues de sprint |

## 6. Périmètre

**Dans le périmètre** : information, questionnaire d'orientation, restitution prudente, questions sur le pôle handicap, orientation RQTH adaptée au stage, à l'alternance et au premier emploi, contacts du pôle par e-mail, kit documentaire, statistiques agrégées, FR/EN.

**Hors périmètre** (volontairement) : diagnostic médical ; évaluation de l'éligibilité ; création de compte ; stockage de réponses ; dépôt du dossier à la MDPH ; traitement de pièces médicales ; chatbot libre (risque de réponses non maîtrisées sur un sujet sensible).

## 7. Risques majeurs identifiés dès le cadrage

| Risque | Gravité | Parade retenue |
|---|---|---|
| Message perçu comme un diagnostic ou une promesse | Élevée | Formulations prudentes, test automatisé interdisant « éligible » & co, bandeau « ce n'est pas une décision » |
| Collecte involontaire de données de santé | Élevée | Aucune réponse stockée, traitement local, compteurs séparés (pas de croisement) |
| Ton anxiogène ou stigmatisant | Moyenne | Relecture par la pôle handicap, tests utilisateurs, option textes simplifiés |
| Orientation erronée (seuils non validés) | Moyenne | Résultat = « il peut être utile d'en parler », jamais une décision ; validation des règles par des professionnels |
| Outil inaccessible aux personnes qu'il vise | Élevée | RGAA/WCAG dès la conception, audit et tests avec lecteurs d'écran (doc 06) |
| Liens ou informations obsolètes | Moyenne | Date de vérification dans `resources.json`, revue avant mise en ligne |

## 8. Hypothèses à valider
1. Les étudiants de l'Efrei, y compris ceux qui ne sont pas suivis par le pôle handicap, connaissent peu la RQTH et ses effets sur l'entrée dans l'emploi. **[Mesurer par un mini-sondage anonyme.]**
2. Une douzaine de questions essentielles (9 à 12 selon le parcours) non médicales suffisent à orienter utilement, et des questions complémentaires facultatives apportent des pistes plus précises sans alourdir le parcours de ceux qui n'en veulent pas. **[Valider en tests utilisateurs, doc 05.]**
3. L'anonymat complet est une condition de confiance. **[Vérifier en entretien.]**
