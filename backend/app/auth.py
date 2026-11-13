"""Comptes administrateurs : mots de passe Argon2, sessions côté serveur dans un cookie HttpOnly."""

import hashlib
import secrets
import time
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Cookie, HTTPException, Request, Response, status

from app.config import get_settings
from app.models import AdminSession, AdminUser

COOKIE = "hd_session"
_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def password_problem(password: str, username: str) -> str | None:
    if len(password) < 12:
        return "Au moins 12 caractères."
    if password.lower() == username.lower():
        return "Le mot de passe ne doit pas être l'identifiant."
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        return "Utilisez des lettres et des chiffres."
    return None


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def open_session(response: Response, user: AdminUser) -> None:
    settings = get_settings()
    token = secrets.token_urlsafe(32)
    lifetime = timedelta(hours=settings.session_hours)
    await AdminSession.filter(expires_at__lt=datetime.now(UTC)).delete()
    await AdminSession.create(
        token_hash=_digest(token), user=user, expires_at=datetime.now(UTC) + lifetime
    )
    response.set_cookie(
        COOKIE,
        token,
        max_age=int(lifetime.total_seconds()),
        httponly=True,
        secure=settings.is_production,
        samesite="strict",
        path="/api",
    )


async def close_session(response: Response, token: str | None) -> None:
    if token:
        await AdminSession.filter(token_hash=_digest(token)).delete()
    response.delete_cookie(COOKIE, path="/api")


async def current_admin(hd_session: str | None = Cookie(default=None)) -> AdminUser:
    if hd_session:
        session = await AdminSession.get_or_none(token_hash=_digest(hd_session)).prefetch_related(
            "user"
        )
        if session and session.expires_at > datetime.now(UTC):
            # Session glissante : chaque action la prolonge
            session.expires_at = datetime.now(UTC) + timedelta(hours=get_settings().session_hours)
            await session.save(update_fields=["expires_at"])
            return session.user
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expirée, reconnectez-vous.")


class LoginThrottle:
    """10 échecs par 5 minutes et par adresse, en mémoire vive uniquement (rien n'est écrit)."""

    def __init__(self, limit: int = 10, window: float = 300) -> None:
        self.limit, self.window = limit, window
        self._failures: dict[str, list[float]] = {}

    def _key(self, request: Request) -> str:
        return request.headers.get("x-real-ip") or (request.client.host if request.client else "")

    def check(self, request: Request) -> None:
        now = time.monotonic()
        recent = [t for t in self._failures.get(self._key(request), []) if now - t < self.window]
        if len(recent) >= self.limit:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS, "Trop de tentatives. Réessayez dans 5 minutes."
            )

    def failed(self, request: Request) -> None:
        if len(self._failures) > 5000:
            self._failures.clear()
        self._failures.setdefault(self._key(request), []).append(time.monotonic())

    def reset(self, request: Request) -> None:
        self._failures.pop(self._key(request), None)


login_throttle = LoginThrottle()
