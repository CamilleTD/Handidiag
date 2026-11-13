from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str = "postgres://handidiag:handidiag@localhost:5432/handidiag"
    session_hours: int = 2
    # Compte créé au premier démarrage si aucun administrateur n'existe
    admin_username: str = "admin"
    admin_password: str = ""
    # Seuil d'affichage des statistiques (valeurs plus petites masquées)
    stats_min_count: int = 5
    disable_stats: bool = False

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
