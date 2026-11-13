from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
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
COMMENT ON TABLE "content_page" IS 'Page thématique « S''informer » : introduction puis blocs (texte, section dépliable, lien, PDF).';
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
COMMENT ON COLUMN "resource"."section" IS 'OFFICIAL: official\nPUBLIC: public\nASSOCIATION: association\nLAW: law';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "resource";
        DROP TABLE IF EXISTS "content_page";"""


MODELS_STATE = (
    "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"
    "9ahkQ0XWnSXqgivZXaeiuCwezl/2yANbQ="
)
