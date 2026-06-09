"""Database initialization entry point.

Schema is managed via your PostgreSQL provider's migrations (see README).
This script seeds demo users and demo leads for local development by
delegating to the dedicated bootstrap scripts.
"""

import asyncio
import logging

from database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def initialize_db() -> None:
    """Initialize the database and load demo data for local development."""
    await init_db()

    # Seed demo users and demo leads via the dedicated scripts.
    from create_users import main as create_users_main
    from seed_test_leads import main as seed_main

    await create_users_main()
    await seed_main()
    logger.info("Demo database initialized.")


if __name__ == "__main__":
    asyncio.run(initialize_db())
