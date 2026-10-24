# 06 – Audit d'accessibilité (RGAA 4.1 / WCAG 2.1 AA)

> **État honnête de cet audit** : la conception tient compte du RGAA dès le départ, les **contrastes ont été calculés**, et l'affichage a été **vérifié dans un vrai navigateur** (3 formats d'écran, texte de 50 % à 300 %, polices, profils : voir §2). En revanche, **l'audit manuel complet, les tests avec lecteurs d'écran et la validation par des utilisateurs concernés restent à réaliser par l'équipe** : la section 4 fournit le protocole et la grille. **Aucune conformité n'est déclarée tant que ces tests ne sont pas faits.**

## 1. Périmètre et méthode
- **Pages** : `index.html` (vues Accueil, Réglages, Questionnaire — essentielles puis complémentaires —, écran de choix, Résultat avec pistes, Kit, **Espace administrateur**).
- **Référentiels** : RGAA 4.1 (13 thématiques), WCAG 2.1 niveau AA.
- **Environnements à tester** : Firefox + NVDA, Chrome + NVDA, Safari + VoiceOver (macOS et iOS), Chrome + TalkBack (Android).
- **Outils** : axe DevTools, Lighthouse, WAVE, Colour Contrast Analyser, Accessibility Insights. Un score d'outil est **un indicateur, jamais une preuve de conformité** (les outils ne détectent qu'une partie des problèmes).

## 2. Mesures déjà réalisées

### 2.1 Contrastes (calculés avec la formule WCAG, pas estimés)

| Thème | Élément | Couleurs | Ratio | Exigé | OK |
|---|---|---|---|---|---|
| Clair | Texte principal sur fond de page | `#12263a` sur `#f2f8f7` | 14.33:1 | 4,5:1 | ✔ |
| Clair | Texte principal sur carte | `#12263a` sur `#ffffff` | 15.40:1 | 4,5:1 | ✔ |
| Clair | Texte secondaire (aide) sur fond de page | `#3b4f61` sur `#f2f8f7` | 7.89:1 | 4,5:1 | ✔ |
| Clair | Texte secondaire sur carte | `#3b4f61` sur `#ffffff` | 8.48:1 | 4,5:1 | ✔ |
| Clair | Liens et titres d'accent | `#07514e` sur `#f2f8f7` | 8.51:1 | 4,5:1 | ✔ |
| Clair | Liens sur fond accent doux | `#07514e` sur `#dff1ef` | 7.82:1 | 4,5:1 | ✔ |
| Clair | Texte principal sur fond accent doux (choix sélectionné) | `#12263a` sur `#dff1ef` | 13.17:1 | 4,5:1 | ✔ |
| Clair | Bouton principal | `#ffffff` sur `#0a6a66` | 6.43:1 | 4,5:1 | ✔ |
| Clair | Bouton principal au survol | `#ffffff` sur `#07514e` | 9.15:1 | 4,5:1 | ✔ |
| Clair | Bandeau d'information | `#5c3b00` sur `#fff3d6` | 9.15:1 | 4,5:1 | ✔ |
| Clair | Icône « ne fait pas » sur fond soleil doux | `#5c3b00` sur `#fdeccb` | 8.67:1 | 4,5:1 | ✔ |
| Clair | Numéro d'étape sur pastille soleil | `#12263a` sur `#f2b134` | 8.15:1 | 4,5:1 | ✔ |
| Clair | Message d'erreur | `#a3171f` sur `#f2f8f7` | 7.24:1 | 4,5:1 | ✔ |
| Clair | Bordure de composants sur carte (non-texte) | `#6a7f90` sur `#ffffff` | 4.16:1 | 3,0:1 | ✔ |
| Clair | Bordure de composants sur fond de page (non-texte) | `#6a7f90` sur `#f2f8f7` | 3.87:1 | 3,0:1 | ✔ |
| Clair | Cadre de focus (non-texte) | `#12263a` sur `#f2f8f7` | 14.33:1 | 3,0:1 | ✔ |
| Sombre | Texte principal | `#e9f0f4` sur `#0d1b24` | 15.20:1 | 4,5:1 | ✔ |
| Sombre | Texte principal sur carte | `#e9f0f4` sur `#14262f` | 13.53:1 | 4,5:1 | ✔ |
| Sombre | Texte secondaire sur carte | `#b4c4d0` sur `#14262f` | 8.71:1 | 4,5:1 | ✔ |
| Sombre | Liens et titres d'accent | `#8ce3dc` sur `#0d1b24` | 11.79:1 | 4,5:1 | ✔ |
| Sombre | Bouton principal | `#05211f` sur `#62d3ca` | 9.40:1 | 4,5:1 | ✔ |
| Sombre | Bandeau d'information | `#ffe3a3` sur `#3a2a08` | 11.07:1 | 4,5:1 | ✔ |
| Sombre | Message d'erreur | `#ff9ea4` sur `#0d1b24` | 8.90:1 | 4,5:1 | ✔ |
| Sombre | Bordure de composants sur carte (non-texte) | `#7f97a8` sur `#14262f` | 5.11:1 | 3,0:1 | ✔ |
| Sombre | Cadre de focus (non-texte) | `#ffffff` sur `#0d1b24` | 17.51:1 | 3,0:1 | ✔ |
| Contraste élevé | Texte principal | `#ffffff` sur `#000000` | 21.00:1 | 4,5:1 | ✔ |
| Contraste élevé | Accent (liens, titres de cartes) | `#ffd400` sur `#000000` | 14.67:1 | 4,5:1 | ✔ |
| Contraste élevé | Bouton principal | `#000000` sur `#ffd400` | 14.67:1 | 4,5:1 | ✔ |
| Contraste élevé | Message d'erreur | `#ff9a9a` sur `#000000` | 10.34:1 | 4,5:1 | ✔ |

**Défauts trouvés et corrigés grâce aux mesures, à l'audit automatique et à l'inspection des captures** (liste honnête) :

1. Bordures de champs et de choix à **1.73:1** sur blanc (critère 3:1, WCAG 1.4.11) : couleur dédiée `--control` (4.16:1).
2. Icônes sans taille propre : elles s'étiraient et provoquaient un **débordement horizontal à 300 %** sur ordinateur : taille fixée en `em`.
3. Colonnes de grille qui s'élargissaient avec leur contenu : passées en `minmax(0, 1fr)`.
4. Barre de navigation coupée à 375 px (« nformations ») : libellés raccourcis et passage à la ligne autorisé.
5. Compteur de questions qui changeait en cours de route : le total affiché est estimé dès le départ (12) et reste stable.
6. **axe-core** : les boutons « A− / A+ / 100 % » avaient un nom accessible sans leur texte affiché (WCAG 2.5.3 « étiquette dans le nom ») : noms accessibles réécrits (« A− : réduire le texte »).
7. **Inspection visuelle** (aucun outil ne l'avait signalé) : le nouveau bouton de langue **recouvrait le nom « HandiDiag »** sur téléphone : en-tête réécrit pour passer à la ligne, bouton Réglages réduit à son icône sur petit écran.
8. **Texte à 300 % sur téléphone** : le mot « Questionnaire » dépassait de son onglet : césure autorisée (« Question-naire »).
9. **Impression** : adresses web imprimées en gros caractères gras dans les titres du kit, et numéro d'étape coupé entre deux pages : feuille d'impression corrigée.
10. **axe-core (page des réglages)** : les titres de section sautaient un niveau (titre 1 puis titre 3) : hiérarchie corrigée.
11. **Espace admin, ergonomie** : après un mauvais mot de passe, le formulaire se vidait, **identifiant compris** : l'identifiant est conservé et le curseur va sur le mot de passe.
12. **Données fictives et limite anti-spam** : l'outil de démonstration d'origine envoyait des centaines de requêtes et était bloqué par la limite (60/min par adresse), qui aurait aussi fait perdre des statistiques à l'école (adresse partagée) : limite portée à 600/min et réglable, données fictives créées directement depuis le tableau de bord.
Ce sont exactement les défauts que les outils automatiques voient mal : **à re-vérifier visuellement** sur de vrais appareils.

### 2.2 Tests dans un vrai navigateur (Chrome sans interface, captures d'écran) : `npm run e2e`
Exécutés sur le parcours complet d'un étudiant non suivi par le pôle qui souhaite le rejoindre (12 questions essentielles) :

- **3 formats** : téléphone 375 px, tablette 768 px, ordinateur 1280 px : accueil, question, question à choix multiples, résultat, kit. **Aucun défilement horizontal.**
- **Taille du texte à 50 % et à 300 %** (mobile et ordinateur) : taille de base mesurée (8 px et 48 px), aucun débordement sur l'accueil, le kit, une question et le panneau de réglages.
- **Polices** : Atkinson Hyperlegible, Lexend et OpenDyslexic réellement appliquées ; **aucun fichier de police téléchargé tant qu'aucune n'est choisie**.
- **Profils rapides** (dyslexie, TDAH / concentration, malvoyance) et retour aux réglages d'origine.
- **Mémorisation des réglages** : rien n'est stocké sans coche ; après coche et rechargement la taille est restaurée ; la décoche efface le stockage.
- **Parcours pôle handicap** : première question sur le pôle ; panneau des contacts (sujets, deux e-mails, aucun lien Teams) affiché si l'étudiant veut rejoindre le pôle, masqué sinon ; bouton « Valider » visible sans défilement ; bouton « Je préfère ne pas répondre » présent ; « Question 12 sur 12 » sur tout le parcours.
- **Lecture vocale** testée avec un moteur de voix simulé : la meilleure voix est choisie pour les questions, la lecture se fait phrase par phrase, aucune erreur JavaScript.
*Limites : navigateur unique, aucun lecteur d'écran, aucune voix réelle, aucun appareil tactile réel.*

**Audit automatique axe-core 4.14 (WCAG 2.0 / 2.1 / 2.2 niveaux A et AA + bonnes pratiques) : 0 violation sur 20 états** après correction : accueil, **page des réglages** (clair, sombre, contraste élevé), question à choix unique, à choix multiples, avec message d'erreur, **écran « questions complémentaires »**, **question complémentaire**, **résultat avec pistes**, kit, kit à 300 %, kit avec OpenDyslexic et repère de lecture, **espace admin : connexion, tableau de bord sans données, tableau de bord avec données et tout déplié**. Un seul élément reste « à vérifier » par l'outil : les chiffres décoratifs du dessin d'accueil (masqués aux lecteurs d'écran, contraste réel élevé).

**Contrôles supplémentaires** (157 au total dans le script, dont questionnaire adaptatif, pistes, réglages en page, comptes admin, données fictives et remise à zéro) : aucun chevauchement dans l'en-tête, aucun texte coupé dans les boutons et onglets, bouton retour du navigateur, titres d'onglet uniques, PDF réellement téléchargé et valide, **poids réellement transféré : 51,5 Ko** à la première visite.

*Rappel : un audit automatique ne détecte qu'une partie des problèmes d'accessibilité. Il ne remplace ni les tests avec lecteur d'écran, ni les tests avec des personnes concernées.*

### 2.3 Tests unitaires de contenu (`npm test`)
Aucune formulation d'éligibilité ; textes présents en FR et EN ; variantes simplifiées plus courtes.

## 3. Mesures d'accessibilité implémentées, par thématique RGAA

| # | Thématique | Ce qui est en place | À vérifier à la main |
|---|---|---|---|
| 1 | Images | Aucune image porteuse d'information ; logo SVG décoratif `aria-hidden` ; favicon | Absence d'image non décrite |
| 2 | Cadres | Aucun cadre ni iframe | — |
| 3 | Couleurs | Aucune information portée par la couleur seule (sélection = bordure + fond + case cochée native ; erreurs = texte) ; contrastes mesurés (§2.1) ; mode sombre ; `forced-colors` pris en charge | Rendu en mode contraste élevé Windows |
| 4 | Multimédia | Aucun média ; lecture vocale **à la demande** via le navigateur (voix réglable, mise en évidence du passage lu, arrêt possible) | Bouton « Lire » : opérable au clavier ; qualité de la voix sur plusieurs appareils |
| 5 | Tableaux | Seul le tableau de bord en utilise : `caption`, `th scope`, pas de tableau de mise en page | Annonce par NVDA |
| 6 | Liens | Intitulés explicites ; liens externes avec mention « s'ouvre dans un nouvel onglet » pour lecteurs d'écran ; liens soulignés | Aucun intitulé ambigu hors contexte |
| 7 | Scripts | Le contenu vient de JavaScript : à chaque changement de vue le **focus est placé sur le `h1`**, titre de page mis à jour, erreurs en `role="alert"`, bouton des réglages avec `aria-expanded` | **Annonce réelle** de la question + progression par NVDA/VoiceOver |
| 8 | Éléments obligatoires | `lang` mis à jour selon la langue ; titres de page uniques par vue ; `lang` sur l'option « English » ; liens vers des pages en français signalés « (in French) » en anglais | Changement de langue annoncé |
| 9 | Structuration | Repères `header`, `nav`, `main`, `footer`; un `h1` par vue; titres hiérarchisés; listes sémantiques; étapes en `ol` | Navigation par titres/repères |
| 10 | Présentation | CSS responsive; texte en `rem`, agrandissable (réglage A− A A+ et zoom navigateur); focus visible à double anneau; pas de contenu masqué à tort; respect de `prefers-reduced-motion` ; **taille du texte réglable de 50 % à 300 %** ; mise en page par *container queries* ; trois polices d'aide à la lecture ; thème à contraste élevé ; repère de lecture | **Zoom navigateur 400 % (reflow à 320 px)**, espacement de texte WCAG 1.4.12, rendu sur appareils réels |
| 11 | Formulaires | Chaque champ a une étiquette ; groupes `fieldset` nommés par la question ; aide et consigne reliées par `aria-describedby` ; erreur explicite avec la marche à suivre ; zones cliquables ≥ 44 px ; case de refus des statistiques étiquetée | Association question/choix à l'écoute |
| 12 | Navigation | Lien d'évitement ; navigation cohérente ; hash routing compatible bouton précédent ; ordre de tabulation logique | Parcours **clavier seul** de bout en bout |
| 13 | Consultation | Aucune limite de temps ; aucune ouverture de fenêtre imposée ; pas de contenu clignotant ; réglages (taille, thème, espacement, langue, textes simplifiés) ; export imprimable ; PDF téléchargeable (**non balisé** : à améliorer, voir §6) | Impression : lisible, sans interface |

## 4. Protocole de test manuel (à exécuter, 1/2 journée)

**4.1 Clavier seul** : Tab / Maj+Tab / Entrée / Espace / Échap sur tout le parcours.
☐ lien d'évitement visible au focus · ☐ focus toujours visible · ☐ aucun piège clavier · ☐ ordre logique · ☐ réglages fermables par Échap · ☐ cases et radios opérables à l'Espace.

**4.2 Lecteur d'écran** (NVDA, VoiceOver, TalkBack). Scénario : ouvrir la page → démarrer → répondre aux questions (dont les questions sur le pôle handicap, une multiple avec option exclusive, une passée, une erreur volontaire) → résultat → kit → changer de langue.
☐ chaque question est annoncée avec sa progression · ☐ les options sont lues avec leur état · ☐ l'erreur est annoncée · ☐ le titre du résultat est annoncé · ☐ les liens externes sont identifiés · ☐ le changement de langue est perceptible.

**4.3 Zoom et reflow** : 200 % puis 400 % (ou fenêtre de 320 px) : ☐ aucun défilement horizontal (hors tableau admin) · ☐ rien de tronqué · ☐ boutons toujours cliquables.

**4.4 Espacement de texte** (bookmarklet WCAG 1.4.12) : ☐ aucune perte de contenu.

**4.5 Modes** : ☐ sombre · ☐ contraste élevé Windows · ☐ `prefers-reduced-motion` · ☐ impression / PDF.

**4.6 Automatique** : axe DevTools et Lighthouse sur chaque vue (info, questions, 4 résultats, kit, admin) ; consigner les alertes **et** les justifier.

## 5. Grille de résultats (À COMPLÉTER)

| # | Critère RGAA / WCAG | Vue | Constat | Gravité | Correction | Statut |
|---|---|---|---|---|---|---|
| | | | | | | |

Synthèse attendue : nombre de critères applicables, conformes, non conformes, non applicables → **taux de conformité = conformes ÷ (conformes + non conformes)**. Ne pas arrondir à la hausse.

## 6. Points de vigilance connus (déjà identifiés)
- **`:has()`** sert à surligner le choix sélectionné ; sur un très vieux navigateur le surlignage disparaît mais la case/radio native reste visible (l'information n'est pas perdue).
- **Lecture vocale** : dépend des voix installées ; qualité variable ; hors périmètre RGAA mais à tester. Une voix « en ligne » envoie le texte lu à un service du navigateur : voir doc 07.
- **Polices d'aide à la lecture** : proposées comme options de confort ; aucune n'est prouvée efficace pour tout le monde. À valider avec des personnes concernées (doc 05).
- **PDF généré** : texte réel (sélectionnable, langue déclarée, liens cliquables) mais **non balisé** (pas d'arborescence d'accessibilité avancée). Pour une version pleinement accessible : imprimer depuis le navigateur ou utiliser le résumé texte ; à améliorer si le PDF devient un livrable officiel.
- **Repère de lecture** : assombrit volontairement le reste de la page (contraste réduit hors de la bande) ; désactivé par défaut, activé par la personne.
- **Taille 300 %** : la mise en page passe en colonne unique ; le panneau de réglages devient long : le bouton Fermer reste atteignable au clavier.
- **Mode « inspiré du FALC »** : n'est pas un FALC certifié (relecture par des personnes concernées nécessaire). Ne pas utiliser le logo ni l'appellation sans cette validation.
- **Langue anglaise** : les pages officielles liées sont en français ; c'est signalé.
- **Tableau de bord** : barres décoratives `aria-hidden`; l'information est toujours portée par les chiffres du tableau.

## 7. Déclaration d'accessibilité (modèle, à publier après audit)

> **HandiDiag s'engage à rendre son application accessible, conformément au RGAA 4.1.**
> **État de conformité** : *[non évalué / partiellement conforme / conforme — à renseigner après l'audit]*.
> **Résultats des tests** : *[taux de conformité, outils et environnements testés, date]*.
> **Contenus non accessibles** : *[liste issue de la grille §5, avec justification]*.
> **Établissement de cette déclaration** : *[date]*, par *[équipe projet]*. Technologies : HTML, CSS, JavaScript.
> **Retour d'information et contact** : *[adresse de contact à renseigner]* — si vous n'obtenez pas de réponse satisfaisante, vous pouvez saisir le Défenseur des droits.
