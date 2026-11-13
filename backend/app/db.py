from app.config import get_settings

MODELS = ["app.models", "aerich.models"]

TORTOISE_ORM = {
    "connections": {"default": get_settings().database_url},
    "apps": {"models": {"models": MODELS, "default_connection": "default"}},
}
