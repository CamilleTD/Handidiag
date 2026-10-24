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
- Le parcours commence par deux questions sur le pôle : « Êtes-vous suivi(e) par le pôle handicap ? » puis, si non, « Souhaitez-vous le rejoindre ? » (sujets et contacts affichés si oui). Quelle que soit la réponse, le questionnaire continue vers l'**orientation RQTH**, pensée pour le stage, l'alternance et le premier emploi.
- Objectif d'« applicabilité » : l'outil doit pouvoir être déployé à l'école (preuve de concept) sans compte ni intégration SI.

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
2. Une douzaine de questions essentielles (10 à 12 selon le parcours) non médicales suffisent à orienter utilement, et des questions complémentaires facultatives apportent des pistes plus précises sans alourdir le parcours de ceux qui n'en veulent pas. **[Valider en tests utilisateurs, doc 05.]**
3. L'anonymat complet est une condition de confiance. **[Vérifier en entretien.]**
