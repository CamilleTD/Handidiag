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
(`backend/seed/content.json` : questionnaire, règles, restitution, ressources, pages).

## Architecture

```
backend/    FastAPI + Tortoise ORM (PostgreSQL), migrations Aerich, tests pytest
frontend/   Angular 21 (composants autonomes, signaux), tests Vitest, servi par nginx
docs/       livrables du projet
```

**Modèle de données** (`backend/app/models.py`) : chaque élément stocke ses textes dans les deux
langues (`{"fr": "…", "en": "…"}`), à côté de sa structure.

| Domaine | Tables |
|---|---|
| Questionnaire | `question`, `question_option` (conditions d'affichage et d'arrêt en JSON) |
| Orientation | `rule` (condition, points, niveau imposé, orientation pôle) ↔ `flag`, `suggestion` ; `level` |
| Restitution | `pole_outcome`, `contact`, `profile_contact` |
| Contenus | `content_page` (pages « S'informer » à blocs), `resource` (kit, organismes, associations, lois) |
| Administration | `admin_user`, `admin_session` |
| Statistiques | `stat_counter` (compteurs anonymes journaliers, jamais croisés) |

Les conditions suivent une grammaire unique (`all`, `any`, `not`, `in`, `hasAny`, `countAtLeast`,
`answered`) : validée par le serveur (`backend/app/conditions.py`), évaluée dans le navigateur
(`frontend/src/app/core/engine.ts`). Une question, une réponse, un niveau ou un point d'attention
encore utilisé ne peut pas être supprimé ; les clés techniques ne changent pas après création.

**Administration** : tableau de bord statistique, questions, règles (éditeur visuel de conditions,
ou JSON), restitution (niveaux, points d'attention, pistes, messages du pôle, interlocuteurs),
pages « S'informer », ressources, compte. Les modifications sont en ligne dès l'enregistrement.

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
cd backend && .venv/Scripts/python -m pytest && .venv/Scripts/ruff check .
cd frontend && npm test && npm run format:check
```

## Historique

- `main` : version Angular / FastAPI / PostgreSQL.
- `backup/codex` : tentative précédente (branche conservée pour référence).
- Le prototype JavaScript d'origine reste consultable dans l'historique git (commit `636cd16`).
