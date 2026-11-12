# 04 – Cahier des charges (version simplifiée)

Projet HandiDiag · ING3 Efrei · Équipe : Bastien FRANJA, Camille TURA--DURAND, Inès MEHADHEBI, Kiroshan SIVAKUMAR, Maxime CERRUTI

## 1. À quoi sert ce document ?

Ce document dit **ce que le site doit faire** et **à quelles conditions on considère qu'il est réussi**. Il ne dit pas comment il est programmé (c'est expliqué dans le rapport final).

Pour chaque point, une colonne **Origine** indique d'où vient l'idée :

| Origine | Signification |
|:--|:--|
| **Sujet** | C'est demandé par le descriptif du projet fourni par l'école. |
| **Équipe** | C'est une demande de l'équipe pendant le projet, ou une demande du pôle handicap relayée par l'équipe. |
| **Ajout** | C'est une proposition en plus, à valider avec l'encadrant. |

La colonne **Priorité** a trois valeurs : **Indispensable** (sans cela le projet n'est pas réussi), **Important** (très utile), **Souhaitable** (un plus).

## 2. Le projet en bref

HandiDiag est un site web gratuit, sans compte, qui aide un étudiant à savoir si une démarche de **RQTH** (reconnaissance de la qualité de travailleur handicapé) peut avoir du sens pour lui, par exemple avant un stage, une alternance ou un premier emploi. Il l'informe, lui pose des questions non médicales, lui donne une orientation prudente et lui indique **à qui parler** en premier, en commençant par le pôle handicap de l'école.

**Ce que le site ne fait jamais** : poser un diagnostic médical, dire « vous êtes éligible », remplacer un médecin, la MDPH ou le pôle handicap, enregistrer les réponses de la personne, ou prévenir son école ou son employeur.

## 3. Pour qui ?

- **Les étudiants de l'école** qui vont vers le monde du travail (stage, alternance, premier emploi). Deux situations : ils sont déjà suivis par le pôle handicap (on va directement vers la RQTH), ou non (on les aide d'abord à savoir si le pôle peut les aider). *(Origine : Équipe. Le sujet prévoit aussi des salariés, des demandeurs d'emploi et des agents publics, et autorise « une version adaptée aux étudiants et jeunes diplômés ». Les autres publics existent encore dans le site mais sont désactivés.)*
- **La personne qui administre le site** (par exemple la référente du pôle handicap ou l'équipe projet) : elle ne voit que des chiffres globaux.

## 4. Objectifs et comment on les mesure

| N° | Objectif | Comment on le mesure | Cible | Origine |
|:---|:----------------------|:----------------------|:-------------|:----------|
| O1 | Aider à comprendre la démarche | On demande à chaque testeur d'expliquer la RQTH avec ses mots | Au moins 4 testeurs sur 5 y arrivent | Ajout |
| O2 | Aider à savoir à qui parler | Après le parcours, on demande de citer un interlocuteur | Au moins 4 sur 5 | Ajout |
| O3 | Être facile à utiliser | Questionnaire de satisfaction « SUS », noté sur 100 (68 = moyenne habituelle) | 80 ou plus (ambitieux) | Ajout |
| O4 | Être accessible | Audit d'accessibilité (RGAA / WCAG) | Aucun défaut bloquant | Sujet |
| O5 | Protéger la vie privée | Nombre de données individuelles stockées | Zéro | Sujet |
| O6 | Être léger (écoconception) | Poids transféré à la première visite | Moins de 60 Ko, aucun service extérieur | Sujet + Ajout (le chiffre) |
| O7 | Aider les étudiants non suivis à savoir s'ils peuvent s'adresser au pôle handicap, et à qui | Après le parcours, on demande : « Pensez-vous pouvoir contacter le pôle ? Qui contacteriez-vous ? » | Au moins 4 testeurs sur 5 | Équipe (demande du pôle) + Ajout (la cible) |

## 5. Ce que le site doit faire

### 5.1 Le parcours de la personne

| Ce que le site doit faire | Origine | Priorité | Comment on le vérifie |
|:----------------------------------------|:---------|:-------------|:-------------------|
| Afficher une page d'accueil qui explique : ce qu'est la RQTH, ce que le site fait et ne fait pas, la confidentialité, l'absence de diagnostic et de transmission à l'employeur | Sujet | Indispensable | Les quatre blocs sont présents et lisibles |
| Poser en premier : « Êtes-vous suivi(e) par le pôle handicap ? ». **Si oui**, aller directement vers l'orientation RQTH | Équipe | Indispensable | Test du parcours dans un navigateur |
| **Si non**, poser une question ciblée sur les situations vécues à l'école (manque de temps aux examens, lecture ou écriture difficiles, concentration, bruit ou stress, santé ou fatigue, voir/entendre/se déplacer, consignes à reformuler), puis dire si le pôle handicap **peut aider** (« peut vous aider », « cela vaut la peine d'en parler » ou « rien n'indique un besoin pour l'instant »). Ce n'est jamais une décision ni un « éligible » : seul le pôle décide, après un entretien confidentiel | Équipe | Indispensable | Tests automatiques : nombre de situations cochées → message ; mots interdits |
| Si non suivi : demander « Souhaitez-vous voir si le pôle pourrait vous être utile ? » ; si oui, poser les questions ciblées puis afficher les sujets traités et les contacts **par besoin** : études (Charlie DUPIC, Stéphanie LIBESKIND) et monde du travail (Jordan SACCASYN, Career Center), par e-mail. Dans tous les cas, proposer ensuite de **continuer vers les questions RQTH ou de terminer ici** | Équipe | Indispensable | Test du parcours ; aucun lien Teams |
| Construire ces questions à partir des situations et des aménagements réellement accompagnés à l'école (fiche d'information du pôle), sans poser de question médicale précise | Équipe | Important | Relecture avec le pôle handicap |
| Poser un questionnaire court de **8 à 12 questions** non médicales (ici 9 à 12, après l'étape pôle de 1 à 4 questions), sur les difficultés, les besoins d'aménagement, le stage ou l'emploi, l'accompagnement existant et l'urgence | Sujet | Indispensable | Test automatique du nombre de questions |
| Adapter les questions aux réponses : si la personne n'a aucune difficulté, on ne pose pas de questions sur les symptômes | Équipe | Important | Test automatique |
| Proposer, après les questions essentielles, des **questions complémentaires facultatives** (stage, alternance, tests en ligne, entretiens, justificatifs utiles, freins à contacter le pôle, onze types d'aménagements d'examens…) qui n'ajoutent aucun point | Équipe | Important | Test automatique |
| Permettre de répondre **« Je préfère ne pas répondre »** à chaque question, sans exception | Équipe | Important | Aucune question n'est obligatoire |
| Poser des questions qui parlent de stage, d'alternance et de premier emploi | Équipe | Indispensable | Relecture avec le pôle handicap |
| Garder un grand bouton **« Valider »** toujours visible en bas de l'écran, avec un bouton « Question précédente » | Équipe | Important | Test sur téléphone et ordinateur |
| Permettre de modifier les questions et les règles sans toucher au programme | Sujet | Indispensable | Ajout d'une question par simple modification d'un fichier de contenu |

### 5.2 Le résultat

| Ce que le site doit faire | Origine | Priorité | Comment on le vérifie |
|:----------------------------------------|:---------|:-------------|:-------------------|
| Calculer le résultat avec des **règles simples et visibles** (pas d'intelligence artificielle opaque) et montrer à la personne quelles règles ont joué | Sujet | Indispensable | Chaque règle déclenchée est affichée |
| Formuler le résultat avec prudence, sur quatre niveaux, avec un bandeau « ce n'est ni un diagnostic ni une décision ». Jamais « éligible », jamais de promesse | Sujet | Indispensable | Un test automatique interdit ces mots |
| Ajouter des **points d'attention** et des **pistes pour avancer** adaptés aux réponses, toujours présentés comme « seulement des pistes » | Équipe | Indispensable | Relecture avec le pôle handicap |
| Si la personne craint que son école ou son employeur soit au courant, mettre en premier les contacts tenus au secret médical | Ajout | Important | Test d'affichage |
| Pour un étudiant non suivi, afficher l'orientation vers le pôle **avant** le niveau RQTH ; si le projet est un stage, une alternance ou un emploi, proposer le Career Center en premier | Équipe | Important | Test navigateur |
| **Dédramatiser** la RQTH et le handicap : textes simples sur l'accueil (beaucoup d'étudiants concernés, handicaps le plus souvent invisibles, demander un aménagement n'est pas une faveur, se renseigner n'engage à rien, liberté d'en parler ou non), et rappel que le pôle est confidentiel et ne communique que ce qui sert à l'aménagement | Équipe | Important | Relecture avec le pôle handicap |

### 5.3 Les contacts et le kit documentaire

| Ce que le site doit faire | Origine | Priorité | Comment on le vérifie |
|:----------------------------------------|:---------|:-------------|:-------------------|
| Indiquer les bons interlocuteurs : **pôle handicap** (Charlie DUPIC et Stéphanie LIBESKIND pour les études ; **Jordan SACCASYN**, référent handicap au Career Center, pour le monde du travail ; adresses e-mail uniquement), santé étudiante, scolarité, Agefiph, MDPH | Sujet + Équipe | Indispensable | Les adresses sont cliquables ; aucun lien Teams |
| Proposer une page **« Ressources »** en trois parties : **à l'Efrei** (contacts, étapes de l'accompagnement, aménagements et situations les plus fréquents), **au niveau national** (organismes publics et principales associations hors Efrei) et **la loi** (repères simples avec références) | Équipe | Indispensable | Les trois parties existent en français et en anglais ; liens vérifiés |
| Proposer un **kit** : liens officiels, guide pas à pas (6 étapes), liste de contrôle (8 points), points de vigilance | Sujet | Indispensable | Tous les éléments sont présents |
| Proposer deux boutons distincts, **Imprimer** et **Télécharger en PDF**, plus un résumé texte. Ces fichiers ne contiennent jamais les réponses détaillées | Équipe | Important | Le PDF est réellement téléchargé et ouvert |

### 5.4 L'espace administrateur

| Ce que le site doit faire | Origine | Priorité | Comment on le vérifie |
|:----------------------------------------|:---------|:-------------|:-------------------|
| Offrir un espace réservé, **intégré au site**, avec un compte : parcours commencés et terminés, taux de parcours terminés, types d'orientation, langues, pages consultées, avec le nombre de cas pris en compte sous chaque graphique | Sujet + Équipe | Indispensable | Les chiffres bougent après un vrai parcours |
| Ne montrer que des chiffres globaux : aucun nom, aucun e-mail, aucune donnée médicale. Si moins de 5 personnes sont concernées, afficher « moins de 5 » | Sujet | Indispensable | Test automatique |
| Permettre d'exporter les chiffres (fichier CSV, ouvrable dans un tableur) avec le même masquage | Sujet | Indispensable | Test automatique |
| Protéger le compte : mot de passe chiffré, déconnexion automatique après 2 heures, blocage après 10 essais ratés | Ajout | Important | Tests automatiques |
| Garder un journal technique **limité**, sans adresse IP | Sujet | Indispensable | Relecture du journal |
| Offrir des outils de démonstration (données fictives signalées, remise à zéro) | Ajout | Souhaitable | Bandeau « données fictives » |
| Permettre à la personne de refuser les statistiques, et à l'école de les désactiver | Ajout | Souhaitable | Test automatique |

### 5.5 Accessibilité et confort de lecture

| Ce que le site doit faire | Origine | Priorité | Comment on le vérifie |
|:----------------------------------------|:---------|:-------------|:-------------------|
| Respecter les règles d'accessibilité **RGAA / WCAG niveau AA** : utilisation au clavier, contrastes, lecteur d'écran | Sujet | Indispensable | Audit automatique + audit manuel |
| Fonctionner sur **ordinateur, tablette et téléphone** | Sujet | Indispensable | Test à 375, 768 et 1280 pixels |
| Proposer trois polices : OpenDyslexic (dyslexie), Lexend (lecture fluide, TDAH), Atkinson Hyperlegible (malvoyance) | Équipe | Important | Police réellement appliquée |
| Permettre de réduire le texte jusqu'à 50 % et de l'agrandir jusqu'à 300 %, sans défilement horizontal | Équipe | Indispensable | Test à 50 % et 300 % |
| Proposer des thèmes clair, sombre et contraste élevé, un repère de lecture et un espacement renforcé | Équipe | Important | Contrastes mesurés |
| Proposer des **profils rapides** (dyslexie, TDAH, malvoyance) qui règlent plusieurs options en un clic | Équipe | Souhaitable | Test navigateur |
| Placer les réglages sur une **page à part**, avec un bouton Retour | Équipe | Important | Test navigateur |
| Proposer un mode de **textes simplifiés** (facile à lire et à comprendre) | Sujet | Important | Variantes présentes |

### 5.6 Langues et lecture à voix haute

| Ce que le site doit faire | Origine | Priorité | Comment on le vérifie |
|:----------------------------------------|:---------|:-------------|:-------------------|
| Être **entièrement en français et en anglais**, y compris l'espace administrateur et la page d'erreur | Sujet + Équipe | Indispensable | Test de parité des textes et relecture de chaque page en anglais |
| Lire à voix haute, **en français et en anglais**, les questions, le résultat, l'accueil et le kit, avec la voix la plus naturelle disponible et une vitesse réglable | Équipe | Important | Test avec une voix simulée ; à essayer sur vos appareils |
| Permettre de changer de langue en un clic depuis l'en-tête | Ajout | Souhaitable | Test navigateur |

### 5.7 Vie privée et sobriété

| Ce que le site doit faire | Origine | Priorité | Comment on le vérifie |
|:----------------------------------------|:---------|:-------------|:-------------------|
| Ne demander **aucun compte** et ne **stocker ni envoyer aucune réponse** : tout se calcule dans le navigateur de la personne | Sujet | Indispensable | Le serveur ne reçoit que des compteurs anonymes |
| Ne demander **aucun numéro étudiant ni identifiant** (le pôle utilise déjà un numéro différent de celui transmis aux ministères pour que les étudiants ne soient pas identifiables) | Équipe | Indispensable | Aucun champ d'identité dans le site |
| N'utiliser aucun cookie ni service extérieur | Sujet | Indispensable | Contrôle des ressources chargées |
| Ne mémoriser les réglages d'affichage que si la personne le demande | Équipe | Souhaitable | Test navigateur |
| Rester **léger** : moins de 60 Ko à la première visite ; charger les polices, le générateur de PDF et l'espace admin seulement si besoin | Sujet + Ajout | Important | Mesure du poids |
| Fournir une documentation d'installation, un démarrage en une commande et un démonstrateur | Sujet | Indispensable | Un autre ordinateur lance le site |

### 5.8 Tests et validation (demandes du pôle)

| Ce qui doit être fait | Origine | Priorité | Comment on le vérifie |
|:----------------------------|:---------|:-------------|:-------------------|
| Tester avec des **étudiants ayant une RQTH**, volontaires et anonymes, recrutés via le pôle, pour recueillir des informations | Équipe | Important | Compte rendu agrégé dans le rapport |
| Demander un **rendez-vous avec une personne de la MDPH** pour relire la partie démarche | Équipe | Important | Retours notés et pris en compte |
| Faire **peaufiner la partie technique avec un mentor** | Équipe | Important | Compte rendu de revue |
| Faire relire par le pôle handicap les questions, les messages « le pôle peut vous aider », les textes rassurants et les contacts | Équipe | Indispensable | Date et retours notés dans le rapport |

## 6. Qualités attendues, en clair

- **Sécurité** : mots de passe jamais lisibles, limitation des essais de connexion, le site n'accepte que les informations prévues.
- **Vie privée** : aucune donnée personnelle collectée ; hébergement dans l'Union européenne à choisir au moment de la mise en ligne.
- **Fiabilité des informations** : seules des sources officielles sont citées ; la date de vérification des liens est notée.
- **Facilité de maintenance** : le contenu (questions, règles, textes, contacts) est séparé du programme et modifiable.

## 7. Limites assumées

- Pas de diagnostic médical, pas d'évaluation d'éligibilité (ni à la RQTH, ni au pôle handicap : « peut vous aider » n'est pas une décision), pas de dépôt de dossier à la MDPH.
- L'outil **élargit** l'accompagnement sans remplacer le côté humain : chaque résultat renvoie vers une personne.
- Pas de questions médicales précises, aucune pièce médicale manipulée.
- Pas de chatbot libre : il pourrait donner des conseils non maîtrisés sur un sujet sensible. Le sujet recommande d'ailleurs des règles transparentes.
- Les seuils du questionnaire sont des **repères de travail**, pas des seuils validés par des professionnels de santé.

## 8. Comment ça fonctionne (schéma simple)

```
 La personne                              Le serveur
 ┌─────────────────────────────┐          ┌────────────────────────────┐
 │ Répond aux questions         │          │ Fournit les pages          │
 │ Le résultat est calculé ICI, │─ seuls ─▶│ Compte des événements      │
 │ dans son navigateur          │ compteurs│ anonymes (« parcours       │
 │ Rien n'est enregistré        │ anonymes │ terminé », « PDF »)        │
 └─────────────────────────────┘          │ Affiche les chiffres au    │
                                           │ compte administrateur      │
                                           └────────────────────────────┘
```

## 9. Planning proposé (origine : Ajout)

Le sujet indique 4 à 5 mois et environ 500 heures. Proposition en 4 étapes :

| Étape | Semaines | Contenu | Livrables |
|:--|:--|:----------------|:--------|
| 1. Cadrage | 1 à 4 | Contexte, comparaison avec l'existant, personas, parcours, ce document | Documents 01 à 04 |
| 2. Conception | 5 à 8 | Schémas des écrans, maquette, textes, relecture avec le pôle handicap | Document 05 |
| 3. Réalisation | 9 à 13 | Site, règles, kit, tableau de bord, tests, audit d'accessibilité | Le site, document 06 |
| 4. Validation | 14 à 16 | Tests avec des utilisateurs (dont des étudiants ayant une RQTH), rendez-vous MDPH, revue avec un mentor, relecture par le pôle, corrections, RGPD, rapport, démonstration | Documents 07 à 09 |

## 10. Quand le projet est-il réussi ?

Les objectifs O1 à O7 sont atteints ; les tests automatiques passent ; l'audit ne laisse aucun défaut bloquant ; le pôle handicap a relu les textes et les contacts ; la démonstration déroule sans accroc un parcours de personne et la vue administrateur.

## 11. Points à valider avec l'encadrant

1. **Public** : le sujet cite quatre profils ; cette version se concentre sur les étudiants (autorisé par le sujet) et les autres profils restent réactivables. Est-ce accepté ?
2. **Contacts** : les deux personnes du pôle ont donné leur accord pour la publication de leur e-mail ; une confirmation écrite est conseillée.
3. **Relecture** : les questions, les pistes et les seuils doivent être relus par le pôle handicap.
4. **Cibles** : O1 à O3 et O7 sont des propositions, à confirmer.
5. **Hébergement** : à choisir (Union européenne) pour la mise en ligne.
6. **Jordan SACCASYN** : confirmation écrite de la publication de son adresse e-mail.
7. **Numéros étudiants** : confirmer avec le pôle le principe de séparation des identifiants avant de le citer.
8. **Associations** : les adresses de cinq associations n'ont pas pu être ouvertes depuis l'environnement de développement ; elles sont à vérifier à la main.
9. **Chiffres de la fiche du pôle** : lus sur des graphiques, à confirmer avec le pôle.

## 12. Petit glossaire

| Mot | Sens |
|:----------|:-------------------------------------------------|
| **RQTH** | Reconnaissance de la qualité de travailleur handicapé : décision administrative qui peut donner accès à des aménagements et des aides pour le travail. La demande est personnelle et volontaire. |
| **MDPH** | Maison départementale des personnes handicapées : elle reçoit la demande ; la décision est prise par une commission. |
| **Agefiph** | Organisme qui informe et aide financièrement pour l'emploi des personnes handicapées dans le secteur privé. |
| **RGAA / WCAG** | Règles d'accessibilité numérique (française et internationale) ; « niveau AA » est le niveau visé. |
| **RGPD** | Règlement européen sur la protection des données personnelles. Les données sur le handicap sont des données sensibles. |
| **Moteur de règles** | Programme qui applique des règles écrites en clair (« si… alors… ») ; on peut les lire et les expliquer, contrairement à une IA opaque. |
| **Seuil d'affichage** | Si moins de 5 personnes sont dans une catégorie, on affiche « moins de 5 » pour qu'on ne puisse pas reconnaître quelqu'un. |
| **SUS** | Questionnaire de 10 questions qui note la facilité d'utilisation d'un site sur 100. |
| **Texte simplifié (FALC)** | « Facile à lire et à comprendre » : phrases courtes, mots simples. |
| **Career Center** | Service de l'école qui aide à chercher un stage, une alternance ou un emploi ; il compte un référent handicap. |
| **Tiers-temps** | Temps supplémentaire pendant les épreuves, jusqu'à un tiers du temps total, accordé après une demande d'aménagement. |
| **Handicap invisible** | Situation qui ne se voit pas (troubles « dys », maladies invalidantes, troubles psychiques…). C'est la majorité des situations accompagnées à l'école. |
| **Responsive** | Qui s'adapte à la taille de l'écran. |
| **CSV** | Fichier de tableau simple, ouvrable dans Excel. |
| **Écoconception** | Concevoir un site léger pour limiter la consommation d'énergie et de données. |
