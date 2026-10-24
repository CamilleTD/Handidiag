# 05 – Prototype UX et tests utilisateurs

> **Ce que ce document contient** : wireframes, système de design (couleurs mesurées), kit pour reconstruire la maquette dans Figma, et protocole complet de tests utilisateurs avec grilles prêtes à remplir.
> **Ce qu'il ne contient pas** : un fichier `.fig` (à produire par l'équipe à partir de la section 3) ni des résultats de tests (aucun test n'a encore été mené : section 6 à remplir).

## 1. Principes de conception

1. **Un écran = une seule tâche** : une question à la fois, gros choix cliquables.
2. **Ton calme et factuel** : pas de point d'exclamation, pas de vocabulaire médical, jamais de promesse.
3. **Transparence** : on montre pourquoi on propose un résultat.
4. **Contrôle** : on peut passer une question, revenir en arrière, tout effacer.
5. **Sobriété** : polices système, aucune image, aucun service tiers.

**Direction visuelle : « le sentier ».** L'orientation est un cheminement : l'accueil montre un chemin en 4 étapes qui monte vers un drapeau sous un soleil levant (illustration vectorielle légère, animée une seule fois, sans animation si la personne a demandé de les réduire) ; le questionnaire montre sa progression en **segments** ; le kit présente les étapes comme une **frise**. Palette : bleu nuit (texte), vert-bleu profond (action), jaune « soleil » (repères et signal d'échéance), fond gris-vert très clair. Aucune connotation médicale (pas de rouge ni de croix). Titres en serif (confiance), texte en sans-serif système, ou la police choisie par la personne.

**Réglages d'accessibilité visuelle** : profils rapides (dyslexie, TDAH / concentration, malvoyance), 3 polices, taille de texte 50–300 %, thème à contraste élevé, repère de lecture, voix réglable. Ils sont accessibles depuis le bouton « Réglages » présent sur chaque écran.

## 2. Wireframes (basse fidélité)

### 2.1 Écran d'information
```
┌──────────────────────────────────────────────────────┐
│ (✓) HandiDiag   Informations  Questionnaire  Kit   [Réglages] │
├──────────────────────────────────────────────────────┤
│  Comprendre la démarche RQTH, à votre rythme                │
│  HandiDiag vous aide à savoir si une démarche …             │
│                                                              │
│  Qu'est-ce que la RQTH ?        (paragraphe court)          │
│  Ce que fait HandiDiag          • … • … • … • …             │
│  Ce que HandiDiag ne fait pas   • … • … • … • …             │
│  Confidentialité                • … • … • … • …             │
│  [x] J'accepte les statistiques anonymes                    │
│                                                              │
│  [ Commencer le questionnaire ]   [ Voir le kit ]           │
└──────────────────────────────────────────────────────┘
```

### 2.2 Question
```
┌──────────────────────────────────────────────────────┐
│  Question 4 sur 12                                          │
│  ▬▬ ▬▬ ▬▬ ▰▰ ▭▭ ▭▭ ▭▭ ▭▭ ▭▭ ▭▭ ▭▭ ▭▭  (segments)        │
│  Dans quels domaines ressentez-vous une gêne … ?            │
│  Choisissez ce qui correspond le mieux.                     │
│  Plusieurs réponses possibles.      [Lire à voix haute]     │
│  ┌────────────────────────────────────────────┐             │
│  │ [ ] Fatigue ou douleurs                    │             │
│  │ [x] Concentration, mémoire, lecture…       │  ← coché    │
│  │ [ ] Vue ou audition                        │             │
│  │ …                                          │             │
│  │ [ ] Je préfère ne pas répondre (exclusif)  │             │
│  └────────────────────────────────────────────┘             │
│  [ ✔  Valider ]   ← grand bouton fixé en bas de l'écran     │
│  [Précédente]        [Je préfère ne pas répondre]           │
│  Quitter et effacer mes réponses                            │
└──────────────────────────────────────────────────────┘
```

### 2.2 bis Premières questions (pôle handicap)
```
  Question 1 sur 12   Êtes-vous suivi(e) par le pôle handicap de l'école ?
     ( ) Oui, je suis suivi(e)      ( ) Non, pas pour l'instant
     [ ✔ Valider ]   [Je préfère ne pas répondre]

  Si « Non » → Question 2 : Souhaitez-vous rejoindre le pôle handicap ?
     (•) Oui  ───►  ┌ Pour rejoindre le pôle handicap ───────────────┐
                    │ Sujets : Handicap · Tiers-temps · Social ·       │
                    │ Aides exceptionnelles · Aménagements             │
                    │ Charlie DUPIC, référente social et handicap      │
                    │   E-mail : charlie.dupic@efrei.fr                │
                    │ Stéphanie LIBESKIND, responsable RSE             │
                    │   E-mail : stephanie.libeskind@efrei.fr          │
                    └──────────────────────────────────────────────────┘
     Dans tous les cas, la suite = orientation RQTH (stage, alternance, premier emploi).
```

### 2.3 Restitution
```
┌──────────────────────────────────────────────────────┐
│  Votre orientation                                          │
│ ┃ Il peut être utile d'en parler à un interlocuteur         │
│ ┃ (texte prudent)                                           │
│  ⚠ Ce résultat est une aide à l'orientation. Ni diagnostic, │
│    ni décision.                                             │
│  Points d'attention pour vous  • … (selon les réponses)     │
│  Pistes pour avancer (ce ne sont que des pistes) • … • …    │
│  Vers qui vous tourner  Pôle handicap (2 e-mails) · santé   │
│                         étudiante · scolarité · Agefiph · MDPH │
│  Ce qui a été pris en compte  • règle … (+2 points) …       │
│  [Ouvrir le kit] [Imprimer] [Télécharger en PDF] [Résumé]   │
└──────────────────────────────────────────────────────┘
```

### 2.4 Kit documentaire
```
  Liens officiels (6 cartes)  →  Guide pas à pas (6 étapes numérotées)
  →  Checklist (8 cases)  →  Points de vigilance  →  [Télécharger en PDF] [Imprimer]
```

### 2.5 Espace administrateur (page du site : `#/admin`)
```
  Connexion (identifiant + mot de passe) ─►  Tableau de bord
  ┌────────────┬────────────┬────────────┬────────────┐
  │ Commencés  │ Terminés   │ Taux  ◔    │ Complémen- │   ← 4 grandes cartes
  │    121     │     93     │   77 %     │ taires 56  │
  └────────────┴────────────┴────────────┴────────────┘
  ┌ Types d'orientation ───────┐ ┌ Langues utilisées ──────┐
  │ n = 93 · base : terminés   │ │ n = 121                 │   ← « n » = nombre de cas
  │ Pour s'informer  ██░ 13·14%│ │ Français     ████ 90·74%│     pris en compte
  │ Échange utile    ████ 49·53%│ │ English      ██░  31·26%│
  └────────────────────────────┘ └─────────────────────────┘
  ┌ Activité sur 30 jours (commencés / terminés, jours < 5 masqués) ┐
  │ ▌▌ ▌▌ ▌▌ ▌▌ ▌▌ …                                              │
  └──────────────────────────────────────────────────────────────────┘
  Comprendre ces chiffres · Comment vérifier que ça marche · Outils de démonstration · Mot de passe
```

### 2.6 Page des réglages (`#/settings`) et écran « questions complémentaires » (`#/more`)
```
  Réglages d'affichage                    [Retour]       Les questions essentielles sont terminées
  Profils rapides : [Dyslexie][TDAH][Malvoyance]         Voir mon orientation maintenant
  Langue · Police · Thème · Taille 50–300 %              ou répondre à 17 à 24 questions complémentaires
  [ ] FALC [ ] Espacement [ ] Repère [ ] Mémoriser       (≈ 6 min) pour des pistes plus précises.
  Voix · Vitesse                          [Retour]       [Répondre…]   [Voir mon orientation]
```

## 3. Kit pour construire la maquette Figma (≈ 2 h)

**Fichier** : « HandiDiag – Maquette v1 ». **Variables de couleur** (mode Clair / Sombre ; le thème « Contraste élevé » utilise noir `#000`, blanc `#FFF`, jaune `#FFD400`) :

| Variable | Clair | Sombre | Usage |
|---|---|---|---|
| `ink` | #12263A | #E9F0F4 | Texte principal |
| `ink-soft` | #3B4F61 | #B4C4D0 | Aide, légendes |
| `paper` | #F2F8F7 | #0D1B24 | Fond de page |
| `surface` | #FFFFFF | #14262F | Cartes, champs |
| `accent` | #0A6A66 | #62D3CA | Boutons, étapes |
| `accent-dark` | #07514E | #8CE3DC | Liens, titres d'accent |
| `accent-soft` | #DFF1EF | #14393A | Sélection, médaillons |
| `sun` | #F2B134 | #F6C25B | Repères, pastilles, soleil |
| `sun-soft` / `sun-ink` | #FDECCB / #5C3B00 | #3A2A08 / #FFE3A3 | Signal d'échéance, « ne fait pas » |
| `control` | #6A7F90 | #7F97A8 | Bordures de composants (≥ 3:1) |
| `notice-bg / notice-ink` | #FFF3D6 / #5C3B00 | #3A2A08 / #FFE3A3 | Bandeau « ni diagnostic ni décision » |
| `error` | #A3171F | #FF9EA4 | Erreurs |

**Styles de texte** : titres *Georgia/Palatino* 700 (H1 44/52, H2 23/29, H3 18/23) ; corps *système sans-serif* 18/30, longueur de ligne ≤ 68 caractères.
**Grille** : colonne unique de 736 px max, marges 20 px, espacement multiple de 8.
**Composants à créer** (avec états *défaut / survol / focus / désactivé / erreur*) : Bouton (principal, secondaire, discret), Choix (radio/case dans une carte), Barre de progression, Carte interlocuteur, Bandeau d'information, Case de checklist, Étape numérotée, Panneau de réglages.
**Cadres (frames)** : Info · Question (radio) · Question (cases + exclusif) · Question propre au profil · Erreur de validation · Résultat (4 niveaux) · Kit · Réglages ouverts · Admin · Version mobile 375 px · Tablette 768 px · Texte à 50 % et à 300 % · Mode sombre · Contraste élevé · Police OpenDyslexic.
**Prototype** : relier Info → Q1 → … → Résultat → Kit pour faire le test papier/maquette avant le test sur le prototype codé.

## 4. Protocole de tests utilisateurs

### 4.1 Objectifs
1. Vérifier que le parcours est **compris** et **terminé sans aide**.
2. Vérifier que le **ton** n'est ni anxiogène, ni stigmatisant, ni perçu comme un diagnostic.
3. Vérifier que la personne **sait quoi faire ensuite** et auprès de qui.
4. Repérer les obstacles d'**accessibilité** vécus.

### 4.2 Participants (5 à 8 personnes)
- 4 à 6 étudiants de l'école (dont, si possible, des personnes concernées qui se portent volontaires), à des moments différents : recherche de stage, alternance en cours, dernière année.
- 1 membre du pôle handicap, pour relire le ton, les pistes et les contacts.
- 1 personne utilisant un **lecteur d'écran** ou la navigation **clavier seule**, et 1 personne avec **dyslexie** si possible.
- Recrutement via le **pôle handicap** ou des volontaires : **ne jamais demander à quelqu'un de justifier ou de révéler sa situation**. On peut jouer un persona (doc 03) à la place de sa propre situation.

### 4.3 Cadre éthique
- Participation volontaire, possibilité d'arrêter à tout moment sans justification.
- Aucun enregistrement vidéo/audio sans accord écrit ; notes **anonymisées** (P1, P2…).
- Pas de collecte de données de santé : le participant peut répondre **comme un persona**.
- Message de début (à lire) : *« On teste l'outil, pas vous. Il n'y a pas de bonne ou de mauvaise réponse. Vous pouvez répondre à votre place ou comme le personnage de la fiche. Vous pouvez arrêter quand vous voulez. »*
- Prévoir un contact (pôle handicap) si le test fait émerger une difficulté personnelle.

### 4.4 Déroulé (30 min)
1. Accueil et consentement (3 min).
2. Questions de contexte : « Que savez-vous de la RQTH ? » (2 min).
3. **Tâches** (15 min), en pensée à voix haute :
   - T1 : « Trouvez ce que fait et ne fait pas l'outil. »
   - T2 : « Répondez au questionnaire comme [persona]. »
   - T3 : « Dites avec vos mots ce que le résultat vous recommande. »
   - T4 : « Trouvez à qui vous pourriez parler en premier. »
   - T5 : « Trouvez la liste des pièces à préparer. »
   - T6 : « Changez la langue, agrandissez le texte, essayez une autre police. »
   - T7 : « Faites lire la question à voix haute. Cette voix vous semble-t-elle naturelle ? »
4. Questionnaire **SUS** (3 min) + 3 questions de confiance (§4.6).
5. Entretien de fin (5 min) : ce qui a plu, ce qui a gêné, ce qui manque.

### 4.5 Grille d'observation (une ligne par tâche et par participant)

| Tâche | Réussie seul (O/N) | Durée | Hésitations / erreurs | Verbatim | Gravité (0–4) |
|---|---|---|---|---|---|
| T1 | | | | | |
| T2 | | | | | |
| T3 | | | | | |
| T4 | | | | | |
| T5 | | | | | |
| T6 | | | | | |
| T7 | | | | | |

Gravité : 0 = aucun problème · 1 = cosmétique · 2 = mineur · 3 = majeur · 4 = bloquant.

### 4.6 Questionnaire SUS (échelle 1 « pas du tout d'accord » à 5 « tout à fait d'accord »)
1. Je pense que j'aimerais utiliser ce système fréquemment.
2. J'ai trouvé ce système inutilement complexe.
3. J'ai trouvé ce système facile à utiliser.
4. Je pense que j'aurais besoin du soutien d'un technicien pour utiliser ce système.
5. J'ai trouvé que les différentes fonctions de ce système étaient bien intégrées.
6. J'ai trouvé qu'il y avait trop d'incohérences dans ce système.
7. Je pense que la plupart des gens apprendraient très vite à utiliser ce système.
8. J'ai trouvé ce système très lourd à utiliser.
9. Je me suis senti(e) très confiant(e) en utilisant ce système.
10. J'ai eu besoin d'apprendre beaucoup de choses avant de pouvoir utiliser ce système.

**Calcul** : pour les questions impaires, score = réponse − 1 ; pour les paires, score = 5 − réponse ; total × 2,5 = note sur 100 (≈ 68 = moyenne usuelle ; objectif du projet ≥ 80).

**Questions complémentaires (1–5)** : « Le ton m'a semblé respectueux. » · « Je me suis senti(e) en confiance pour répondre. » · « Je sais ce que je pourrais faire ensuite. »

### 4.7 Analyse
Regrouper les problèmes par écran, les classer par gravité × fréquence, décider **corriger / reporter / ne pas corriger** (avec justification) et suivre dans un tableau « problème → correction → re-test ».

## 5. Test papier / maquette (avant le code)
Faire parcourir la maquette Figma à 3 personnes (même grille). Corriger **avant** de développer la v2 : coûte dix fois moins cher.

## 6. Résultats (À COMPLÉTER APRÈS LES TESTS)

| Indicateur | Cible | Mesuré |
|---|---|---|
| Participants | 5–8 | |
| Parcours terminé sans aide | ≥ 80 % | |
| Score SUS moyen | ≥ 80 | |
| « Je sais ce que je pourrais faire ensuite » | ≥ 4/5 | |
| Problèmes bloquants restants | 0 | |

| # | Problème observé | Gravité | Correction | Re-testé |
|---|---|---|---|---|
| | | | | |
