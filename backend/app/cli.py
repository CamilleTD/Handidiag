"""Outils en ligne de commande.

python -m app.cli create-admin <identifiant>   (le mot de passe est demandé au clavier)
"""

import asyncio
import getpass
import sys

from tortoise import Tortoise

from app.auth import hash_password, password_problem
from app.db import TORTOISE_ORM
from app.models import AdminUser


async def create_admin(username: str, password: str) -> None:
    await Tortoise.init(config=TORTOISE_ORM)
    try:
        user, created = await AdminUser.get_or_create(
            username=username.lower(), defaults={"password_hash": hash_password(password)}
        )
        if not created:
            user.password_hash = hash_password(password)
            user.must_change_password = False
            await user.save()
        print(("Compte créé : " if created else "Mot de passe remplacé : ") + user.username)
    finally:
        await Tortoise.close_connections()


def main() -> None:
    if len(sys.argv) != 3 or sys.argv[1] != "create-admin":
        sys.exit(__doc__)
    username = sys.argv[2]
    password = getpass.getpass("Mot de passe : ")
    if problem := password_problem(password, username):
        sys.exit(problem[1])
    asyncio.run(create_admin(username, password))


if __name__ == "__main__":
    main()
