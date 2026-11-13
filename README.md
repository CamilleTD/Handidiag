# HandiDiag

Application web **accessible et confidentielle** qui aide une personne à savoir si une démarche
**RQTH** (reconnaissance de la qualité de travailleur handicapé) peut avoir du sens pour elle, et vers
qui se tourner. Projet ING3 Efrei.

> HandiDiag **oriente et informe**. Il ne pose aucun diagnostic et ne stocke aucune réponse
> individuelle : le questionnaire est évalué dans le navigateur. Seule la MDPH peut reconnaître une
> situation de handicap.

## Lancer l'application (Docker)

Prérequis : Docker Desktop démarré.

```bash
cp .env.example .env          # facultatif : port, mot de passe admin…
docker compose up -d --build
```

- Site : http://localhost:8080
- Administration : http://localhost:8080/admin
- Premier compte : identifiant `admin`. Si `ADMIN_PASSWORD` n'est pas défini dans `.env`, un mot de
  passe provisoire est généré et affiché par `docker compose logs api` ; il faut le changer à la
  première connexion.
- Arrêt : `docker compose down` (les données restent dans le volume `pgdata`).
- Créer ou réinitialiser un compte : `docker compose exec api python -m app.cli create-admin <identifiant>`

Au premier démarrage, la base est créée par les migrations puis remplie avec le contenu de départ
(`backend/seed/content.json` : questions, règles, messages, questionnaires « pole » et « rqth »,
ressources, pages), et les questionnaires de départ sont publiés.

### Mettre à jour une installation existante

Les migrations ont été regroupées le 13/11/2026 (nouveau modèle à questionnaires multiples).
Une base créée **avant** cette date ne peut pas être migrée : il faut la recréer, ce qui efface
son contenu et le remplace par le contenu de départ.

```bash
docker compose down -v        # -v supprime le volume pgdata
docker compose up -d --build
```

Pour les bases créées après cette date, `docker compose up -d --build` suffit : l'API applique
les nouvelles migrations à chaque démarrage.

## Architecture

```
backend/    FastAPI + Tortoise ORM (PostgreSQL), migrations Aerich, tests pytest
frontend/   Angular 21 (composants autonomes, signaux), tests Vitest, servi par nginx
docs/       livrables du projet
.github/    intégration continue (GitHub Actions)
```

### Principes

- **Bibliothèque partagée.** Questions, règles, points d'attention, pistes et interlocuteurs sont
  rédigés une fois dans la bibliothèque, puis réutilisés par plusieurs questionnaires.
- **Questionnaires.** Chaque questionnaire place des questions de la bibliothèque dans des
  sections, choisit ses règles (avec ses propres points et résultats imposés) et définit ses
  résultats. Un résultat peut proposer de continuer vers un autre questionnaire.
- **Brouillon et versions.** Les modifications portent sur un brouillon. « Publier » fige une copie
  complète et autonome du questionnaire (`questionnaire_version`) : c'est elle que le public
  reçoit, et le brouillon peut changer sans rien casser en ligne. On peut tester le brouillon
  (aperçu), republier une ancienne version ou dépublier.
- **Modifier un élément partagé.** Modifier une question ou une règle de la bibliothèque ne change
  pas les versions en ligne : les questionnaires qui l'utilisent passent en « modifications non
  publiées ». Un bouton les republie tous d'un coup (depuis l'éditeur de l'élément ou la liste des
  questionnaires). C'est tout ou rien : si l'un d'eux n'est pas publiable, aucun n'est republié.
  Le brouillon de chaque questionnaire est publié tel quel, y compris ses autres modifications.
- **Un seul administrateur à la fois par questionnaire.** Ouvrir un questionnaire prend un
  verrou, renouvelé toutes les 30 s et rendu à la fermeture de l'onglet ; sans nouvelles pendant
  2 min, il expire. Les autres administrateurs voient le questionnaire en lecture seule, suivent les
  modifications et retrouvent la main quand il se libère, ou peuvent « prendre la main ». Le
  serveur refuse toute modification venant d'une autre session (`backend/app/locks.py`). La
  republication groupée laisse de côté les questionnaires en cours de modification.
- **Conditions.** Une grammaire unique (`all`, `any`, `not`, `in`, `hasAny`, `countAtLeast`,
  `answered`) est validée par le serveur (`backend/app/conditions.py`) et évaluée dans le
  navigateur (`frontend/src/app/core/engine.ts`). Un élément encore cité (question, réponse,
  résultat, interlocuteur…) ne peut pas être supprimé ; les clés techniques ne changent pas après
  création.
- **Confidentialité.** Les réponses ne quittent jamais le navigateur. Seuls des compteurs anonymes
  journaliers sont envoyés, chacun compté séparément, jamais croisés.
- **Bilingue.** Chaque texte de contenu existe en français et en anglais (`{"fr": "…", "en": "…"}`).
  L'interface publique (`public/i18n/fr.json`, `en.json`) et l'administration
  (`public/i18n/admin.fr.json`, `admin.en.json`) sont traduites ; les erreurs du serveur portent
  un code que l'interface traduit. Un test vérifie que les deux langues ont les mêmes clés.

### Modèle de données (`backend/app/models.py`)

| Domaine | Tables |
|---|---|
| Bibliothèque | `question`, `question_option`, `rule` ↔ `flag`, `suggestion`, `rule_contact` → `contact` |
| Questionnaires | `questionnaire` (dont le verrou), `section`, `section_item` (question placée), `outcome`, `outcome_contact`, `rule_usage` |
| Publication | `questionnaire_version` (copie figée servie au public) |
| Contenus | `content_page` (pages « S'informer » à blocs), `resource` (kit, organismes, associations, lois) |
| Administration | `admin_user`, `admin_session` |
| Statistiques | `stat_counter` |

### API (`backend/app/routers/`)

| Fichier | Rôle |
|---|---|
| `public.py` | contenu public, questionnaires publiés, pages, compteurs anonymes |
| `auth.py` | connexion, déconnexion, mot de passe (sessions côté serveur, cookie HttpOnly) |
| `library.py` | bibliothèque : questions, règles, points d'attention, pistes, interlocuteurs |
| `questionnaires.py` | constructeur : sections, questions placées, résultats, règles, publication, versions, verrou, republication groupée |
| `editorial.py` | pages « S'informer » et ressources |
| `admin.py` | statistiques (consultation, export CSV, données de démonstration) |

Documentation interactive : http://localhost:8000/api/docs (en développement).

### Interface (`frontend/src/app/`)

```
core/      services (contenu, moteur d'évaluation, traduction, préférences, voix, documents)
pages/     écrans publics (accueil, questionnaire, résultat, ressources, réglages…)
shared/    composants réutilisables (icône, pastille, carte d'interlocuteur, lecture à voix haute)
admin/     administration : tableau de bord, questionnaires (constructeur), bibliothèque, contenus
```

Chaque composant a son propre dossier avec trois fichiers : `nom.page.ts` ou `nom.component.ts`,
le gabarit `.html` et les styles `.scss`. Les styles communs sont dans `src/styles.scss` (site) et
`admin/admin-shell/admin-shell.component.scss` (administration). Les outils communs aux tests
sont dans `src/testing/`.

## Développement

```bash
# Base de données seule
docker run -d --name handidiag-dev-db -e POSTGRES_DB=handidiag -e POSTGRES_USER=handidiag \
  -e POSTGRES_PASSWORD=handidiag -p 55432:5432 postgres:17-alpine

# API (http://localhost:8000/api/docs)
cd backend
python -m venv .venv && .venv/Scripts/pip install -r requirements-dev.txt   # Linux/macOS : .venv/bin/
export DATABASE_URL=postgres://handidiag:handidiag@127.0.0.1:55432/handidiag ADMIN_PASSWORD=Mot-De-Passe-2026
.venv/Scripts/aerich upgrade
.venv/Scripts/uvicorn app.main:app --reload

# Interface (http://localhost:4200, /api relayé vers le port 8000)
cd frontend
npm install
npm start
```

Après une modification de `models.py` : `aerich migrate --name description` puis `aerich upgrade`.

### Vérifications

```bash
cd backend && .venv/Scripts/python -m pytest && .venv/Scripts/ruff check . && .venv/Scripts/ruff format --check .
cd frontend && npm test && npm run format:check && node build.mjs
```

`node build.mjs` remplace `ng build`, qui sur ce projet écrit bien `dist/` mais ne rend pas
toujours la main (voir le fichier).

L'intégration continue (`.github/workflows/ci.yml`) lance ces vérifications à chaque push sur
`main` et à chaque pull request. Elle applique aussi les migrations sur un vrai PostgreSQL, démarre
l'API (contenu de départ compris) et construit les images Docker.

## Historique

- `main` : version Angular / FastAPI / PostgreSQL.
- `backup/codex` : tentative précédente (branche conservée pour référence).
- Le prototype JavaScript d'origine reste consultable dans l'historique git (commit `636cd16`).
