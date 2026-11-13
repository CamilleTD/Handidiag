from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "admin_user" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "username" VARCHAR(80) NOT NULL UNIQUE,
    "password_hash" VARCHAR(255) NOT NULL,
    "must_change_password" BOOL NOT NULL,
    "last_login_at" TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS "admin_session" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "token_hash" VARCHAR(64) NOT NULL UNIQUE,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL,
    "user_id" INT NOT NULL REFERENCES "admin_user" ("id") ON DELETE CASCADE
);
COMMENT ON TABLE "admin_session" IS 'Session côté serveur : seul le hachage du jeton est stocké, la déconnexion la révoque.';
CREATE TABLE IF NOT EXISTS "contact" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL UNIQUE,
    "position" INT NOT NULL,
    "icon" VARCHAR(32) NOT NULL,
    "name" JSONB NOT NULL,
    "role" JSONB NOT NULL,
    "email" VARCHAR(254),
    "link_url" VARCHAR(2048),
    "link_label" JSONB,
    "is_confidential" BOOL NOT NULL,
    "pole_group" VARCHAR(16)
);
COMMENT ON COLUMN "contact"."pole_group" IS 'SCHOOL: school\nWORK: work';
CREATE TABLE IF NOT EXISTS "flag" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL UNIQUE,
    "position" INT NOT NULL,
    "text" JSONB NOT NULL
);
COMMENT ON TABLE "flag" IS 'Point d''attention affiché dans la restitution (ordre d''affichage = position).';
CREATE TABLE IF NOT EXISTS "level" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL UNIQUE,
    "position" INT NOT NULL,
    "min_score" INT,
    "icon" VARCHAR(32) NOT NULL,
    "title" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "body_falc" JSONB
);
COMMENT ON TABLE "level" IS 'Niveau d''orientation RQTH. min_score null : niveau atteint uniquement par une règle.';
CREATE TABLE IF NOT EXISTS "pole_outcome" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(16) NOT NULL UNIQUE,
    "title" JSONB NOT NULL,
    "body" JSONB NOT NULL
);
COMMENT ON COLUMN "pole_outcome"."key" IS 'FOLLOWED: followed\nSUGGEST: suggest\nMAYBE: maybe\nNONE: none\nDECLINED: declined';
COMMENT ON TABLE "pole_outcome" IS 'Message de la section « pôle handicap » de la restitution.';
CREATE TABLE IF NOT EXISTS "profile_contact" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "profile" VARCHAR(64) NOT NULL,
    "position" INT NOT NULL,
    "contact_id" INT NOT NULL REFERENCES "contact" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_profile_con_profile_511058" UNIQUE ("profile", "contact_id")
);
COMMENT ON TABLE "profile_contact" IS 'Interlocuteurs proposés pour un profil (clé d''option de la question « profile »).';
CREATE TABLE IF NOT EXISTS "question" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL UNIQUE,
    "kind" VARCHAR(16) NOT NULL,
    "phase" VARCHAR(16) NOT NULL,
    "step" VARCHAR(32),
    "position" INT NOT NULL,
    "required" BOOL NOT NULL,
    "hidden" BOOL NOT NULL,
    "auto_answer" VARCHAR(64),
    "show_if" JSONB,
    "stop_if" JSONB,
    "tracks" JSONB NOT NULL,
    "text" JSONB NOT NULL,
    "text_falc" JSONB,
    "help" JSONB
);
COMMENT ON COLUMN "question"."kind" IS 'SINGLE: single\nMULTIPLE: multiple';
COMMENT ON COLUMN "question"."phase" IS 'CORE: core\nDEEP: deep';
CREATE TABLE IF NOT EXISTS "question_option" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL,
    "position" INT NOT NULL,
    "exclusive" BOOL NOT NULL,
    "label" JSONB NOT NULL,
    "question_id" INT NOT NULL REFERENCES "question" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_question_op_questio_6dd121" UNIQUE ("question_id", "key")
);
CREATE TABLE IF NOT EXISTS "rule" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL UNIQUE,
    "position" INT NOT NULL,
    "condition" JSONB NOT NULL,
    "points" INT NOT NULL,
    "pole_outcome" VARCHAR(16),
    "explanation" JSONB,
    "override_level_id" INT REFERENCES "level" ("id") ON DELETE RESTRICT
);
COMMENT ON COLUMN "rule"."pole_outcome" IS 'FOLLOWED: followed\nSUGGEST: suggest\nMAYBE: maybe\nNONE: none\nDECLINED: declined';
CREATE TABLE IF NOT EXISTS "stat_counter" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "day" DATE NOT NULL,
    "metric" VARCHAR(32) NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "count" INT NOT NULL,
    CONSTRAINT "uid_stat_counte_day_10aa85" UNIQUE ("day", "metric", "key")
);
COMMENT ON TABLE "stat_counter" IS 'Compteur anonyme journalier. Chaque dimension est comptée séparément, jamais croisée.';
CREATE TABLE IF NOT EXISTS "suggestion" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL UNIQUE,
    "position" INT NOT NULL,
    "text" JSONB NOT NULL
);
COMMENT ON TABLE "suggestion" IS 'Piste pour avancer, proposée par une ou plusieurs règles.';
CREATE TABLE IF NOT EXISTS "aerich" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "version" VARCHAR(255) NOT NULL,
    "app" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS "rule_suggestion" (
    "rule_id" INT NOT NULL REFERENCES "rule" ("id") ON DELETE CASCADE,
    "suggestion_id" INT NOT NULL REFERENCES "suggestion" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "uidx_rule_sugges_rule_id_b1213d" ON "rule_suggestion" ("rule_id", "suggestion_id");
CREATE TABLE IF NOT EXISTS "rule_flag" (
    "rule_id" INT NOT NULL REFERENCES "rule" ("id") ON DELETE CASCADE,
    "flag_id" INT NOT NULL REFERENCES "flag" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "uidx_rule_flag_rule_id_ffeb61" ON "rule_flag" ("rule_id", "flag_id");"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """


MODELS_STATE = (
    "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"
    "yWT2/H+dxkmE"
)
