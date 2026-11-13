from datetime import UTC, datetime

from fastapi import APIRouter, Cookie, Depends, Request, Response, status

from app.auth import (
    close_session,
    current_admin,
    hash_password,
    login_throttle,
    open_session,
    password_problem,
    verify_password,
)
from app.errors import Problem
from app.models import AdminSession, AdminUser
from app.schemas import AdminOut, LoginIn, PasswordChangeIn

router = APIRouter(prefix="/auth", tags=["authentification"])


@router.post("/login", response_model=AdminOut)
async def login(body: LoginIn, request: Request, response: Response):
    login_throttle.check(request)
    user = await AdminUser.get_or_none(username=body.username.strip().lower())
    if not user or not verify_password(body.password, user.password_hash):
        login_throttle.failed(request)
        raise Problem(401, "login_failed", "Identifiant ou mot de passe incorrect.")
    login_throttle.reset(request)
    user.last_login_at = datetime.now(UTC)
    await user.save(update_fields=["last_login_at"])
    await open_session(response, user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, hd_session: str | None = Cookie(default=None)):
    await close_session(response, hd_session)


@router.get("/me", response_model=AdminOut)
async def me(user: AdminUser = Depends(current_admin)):
    return user


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: PasswordChangeIn,
    request: Request,
    response: Response,
    user: AdminUser = Depends(current_admin),
):
    login_throttle.check(request)
    if not verify_password(body.current, user.password_hash):
        login_throttle.failed(request)
        raise Problem(403, "password_wrong", "Mot de passe actuel incorrect.")
    problem = password_problem(body.new, user.username)
    if problem:
        raise Problem(422, problem[0], problem[1])
    user.password_hash = hash_password(body.new)
    user.must_change_password = False
    await user.save(update_fields=["password_hash", "must_change_password", "updated_at"])
    # Les autres sessions de ce compte sont fermées
    await AdminSession.filter(user=user).delete()
    await open_session(response, user)
