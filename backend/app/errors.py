"""Erreurs renvoyées à l'administration.

Chaque erreur porte un code stable et ses paramètres, en plus d'un message en français :
l'interface traduit le code dans la langue choisie (voir frontend/public/i18n/admin.*.json).
"""

from typing import Any

from fastapi import HTTPException, status


class Problem(HTTPException):
    def __init__(self, status_code: int, code: str, message: str, **params: Any) -> None:
        super().__init__(status_code, {"code": code, "message": message, "params": params})


def not_found(message: str = "Élément introuvable") -> Problem:
    return Problem(status.HTTP_404_NOT_FOUND, "not_found", message)


def conflict(code: str, message: str, **params: Any) -> Problem:
    return Problem(status.HTTP_409_CONFLICT, code, message, **params)


def invalid(code: str, message: str, **params: Any) -> Problem:
    return Problem(status.HTTP_422_UNPROCESSABLE_CONTENT, code, message, **params)
