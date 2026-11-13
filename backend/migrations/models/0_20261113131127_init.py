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
    "group" VARCHAR(16)
);
COMMENT ON COLUMN "contact"."group" IS 'SCHOOL: school\nWORK: work\nOTHER: other';
CREATE TABLE IF NOT EXISTS "content_page" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "slug" VARCHAR(80) NOT NULL UNIQUE,
    "position" INT NOT NULL,
    "title" JSONB NOT NULL,
    "intro" JSONB,
    "blocks" JSONB NOT NULL,
    "is_published" BOOL NOT NULL
);
COMMENT ON TABLE "content_page" IS 'Page « S''informer » : introduction puis blocs (texte, section dépliable, lien, PDF).';
CREATE TABLE IF NOT EXISTS "flag" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL UNIQUE,
    "position" INT NOT NULL,
    "text" JSONB NOT NULL,
    "highlight_confidential" BOOL NOT NULL
);
COMMENT ON TABLE "flag" IS 'Point d''attention affiché dans la restitution (ordre d''affichage = position).';
CREATE TABLE IF NOT EXISTS "question" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL UNIQUE,
    "kind" VARCHAR(16) NOT NULL,
    "text" JSONB NOT NULL,
    "text_falc" JSONB,
    "help" JSONB
);
COMMENT ON COLUMN "question"."kind" IS 'SINGLE: single\nMULTIPLE: multiple';
CREATE TABLE IF NOT EXISTS "question_option" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL,
    "position" INT NOT NULL,
    "exclusive" BOOL NOT NULL,
    "label" JSONB NOT NULL,
    "question_id" INT NOT NULL REFERENCES "question" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_question_op_questio_6dd121" UNIQUE ("question_id", "key")
);
CREATE TABLE IF NOT EXISTS "questionnaire" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL UNIQUE,
    "position" INT NOT NULL,
    "title" JSONB NOT NULL,
    "description" JSONB,
    "featured" BOOL NOT NULL,
    "published_number" INT
);
CREATE TABLE IF NOT EXISTS "outcome" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL,
    "position" INT NOT NULL,
    "min_score" INT,
    "icon" VARCHAR(32) NOT NULL,
    "title" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "body_falc" JSONB,
    "next_questionnaire_id" INT REFERENCES "questionnaire" ("id") ON DELETE SET NULL,
    "questionnaire_id" INT NOT NULL REFERENCES "questionnaire" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_outcome_questio_472d41" UNIQUE ("questionnaire_id", "key")
);
COMMENT ON TABLE "outcome" IS 'Résultat possible d''un questionnaire. min_score null : imposé uniquement par une règle.';
CREATE TABLE IF NOT EXISTS "outcome_contact" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "position" INT NOT NULL,
    "contact_id" INT NOT NULL REFERENCES "contact" ("id") ON DELETE RESTRICT,
    "outcome_id" INT NOT NULL REFERENCES "outcome" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_outcome_con_outcome_493673" UNIQUE ("outcome_id", "contact_id")
);
CREATE TABLE IF NOT EXISTS "questionnaire_version" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "number" INT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ NOT NULL,
    "published_by" VARCHAR(80),
    "questionnaire_id" INT NOT NULL REFERENCES "questionnaire" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_questionnai_questio_146eff" UNIQUE ("questionnaire_id", "number")
);
COMMENT ON TABLE "questionnaire_version" IS 'Version publiée et figée d''un questionnaire, servie telle quelle au public.';
CREATE TABLE IF NOT EXISTS "resource" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "section" VARCHAR(16) NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "position" INT NOT NULL,
    "url" VARCHAR(2048),
    "title" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "reference" JSONB,
    "is_published" BOOL NOT NULL,
    CONSTRAINT "uid_resource_section_61f9ae" UNIQUE ("section", "key")
);
COMMENT ON COLUMN "resource"."section" IS 'OFFICIAL: official\nPUBLIC: public\nASSOCIATION: association\nLAW: law';
CREATE TABLE IF NOT EXISTS "rule" (
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "id" SERIAL NOT NULL PRIMARY KEY,
    "key" VARCHAR(64) NOT NULL UNIQUE,
    "condition" JSONB NOT NULL,
    "explanation" JSONB
);
COMMENT ON TABLE "rule" IS 'Partie partagée d''une règle : quand elle se déclenche et ce qu''elle ajoute.';
CREATE TABLE IF NOT EXISTS "rule_contact" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "position" INT NOT NULL,
    "contact_id" INT NOT NULL REFERENCES "contact" ("id") ON DELETE RESTRICT,
    "rule_id" INT NOT NULL REFERENCES "rule" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_rule_contac_rule_id_b48c31" UNIQUE ("rule_id", "contact_id")
);
COMMENT ON TABLE "rule_contact" IS 'Interlocuteurs proposés par une règle, dans l''ordre.';
CREATE TABLE IF NOT EXISTS "rule_usage" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "position" INT NOT NULL,
    "points" INT NOT NULL,
    "override_outcome_id" INT REFERENCES "outcome" ("id") ON DELETE RESTRICT,
    "questionnaire_id" INT NOT NULL REFERENCES "questionnaire" ("id") ON DELETE CASCADE,
    "rule_id" INT NOT NULL REFERENCES "rule" ("id") ON DELETE RESTRICT,
    CONSTRAINT "uid_rule_usage_questio_bbe713" UNIQUE ("questionnaire_id", "rule_id")
);
COMMENT ON TABLE "rule_usage" IS 'Règle utilisée par un questionnaire : ordre, points et résultat imposé y sont propres.';
CREATE TABLE IF NOT EXISTS "section" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "position" INT NOT NULL,
    "title" JSONB NOT NULL,
    "intro" JSONB,
    "optional" BOOL NOT NULL,
    "questionnaire_id" INT NOT NULL REFERENCES "questionnaire" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "section_item" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "position" INT NOT NULL,
    "required" BOOL NOT NULL,
    "show_if" JSONB,
    "auto_answer" VARCHAR(64),
    "question_id" INT NOT NULL REFERENCES "question" ("id") ON DELETE RESTRICT,
    "section_id" INT NOT NULL REFERENCES "section" ("id") ON DELETE CASCADE
);
COMMENT ON TABLE "section_item" IS 'Question de la banque placée dans une section, avec ses réglages propres.';
CREATE TABLE IF NOT EXISTS "stat_counter" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "day" DATE NOT NULL,
    "questionnaire" VARCHAR(64) NOT NULL,
    "metric" VARCHAR(32) NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "count" INT NOT NULL,
    CONSTRAINT "uid_stat_counte_day_90c0a9" UNIQUE ("day", "questionnaire", "metric", "key")
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
CREATE TABLE IF NOT EXISTS "rule_flag" (
    "rule_id" INT NOT NULL REFERENCES "rule" ("id") ON DELETE CASCADE,
    "flag_id" INT NOT NULL REFERENCES "flag" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "uidx_rule_flag_rule_id_ffeb61" ON "rule_flag" ("rule_id", "flag_id");
CREATE TABLE IF NOT EXISTS "rule_suggestion" (
    "rule_id" INT NOT NULL REFERENCES "rule" ("id") ON DELETE CASCADE,
    "suggestion_id" INT NOT NULL REFERENCES "suggestion" ("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "uidx_rule_sugges_rule_id_b1213d" ON "rule_suggestion" ("rule_id", "suggestion_id");"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """


MODELS_STATE = (
    "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"
    "/B97TA/i"
)
