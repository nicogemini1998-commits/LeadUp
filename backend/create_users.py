"""
Bootstrap script: inserts the initial demo users into the database.
Run once: python create_users.py

NOTE: These are DEMO credentials for local development only.
Replace them (or provision from a secure source) before any real deployment.
"""

import asyncio
import aiosqlite
import logging
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database import DB_PATH, init_db
from auth import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Demo users only — do NOT use these credentials in production.
INITIAL_USERS = [
    {"name": "Demo Admin", "email": "admin@example.com", "password": "ChangeMe123", "role": "admin"},
    {"name": "Demo Manager", "email": "manager@example.com", "password": "ChangeMe123", "role": "admin"},
    {"name": "Alice Rep", "email": "alice@example.com", "password": "ChangeMe123", "role": "commercial"},
    {"name": "Bob Rep", "email": "bob@example.com", "password": "ChangeMe123", "role": "commercial"},
    {"name": "Carol Rep", "email": "carol@example.com", "password": "ChangeMe123", "role": "commercial"},
]


async def main() -> None:
    await init_db()

    async with aiosqlite.connect(DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row

        for user in INITIAL_USERS:
            cursor = await conn.execute(
                "SELECT id FROM lu_users WHERE email = ?", (user["email"],)
            )
            existing = await cursor.fetchone()
            if existing:
                logger.info(f"User already exists: {user['email']}")
                continue

            password_hash = hash_password(user["password"])
            await conn.execute(
                """
                INSERT INTO lu_users (name, email, password_hash, role)
                VALUES (?, ?, ?, ?)
                """,
                (user["name"], user["email"], password_hash, user["role"]),
            )
            await conn.commit()
            logger.info(f"User created: {user['email']} ({user['role']})")

    logger.info("User initialization complete.")


if __name__ == "__main__":
    asyncio.run(main())
