from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from typing import Any

import asyncpg
from config import get_settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    settings = get_settings()
    _pool = await asyncpg.create_pool(
        settings.database_url,
        min_size=2,
        max_size=10,
        command_timeout=60,
    )
    logger.info("PostgreSQL pool created")


async def close_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        logger.info("PostgreSQL pool closed")


class _Row:
    """Wrap asyncpg Record to support row['field'] and row.field access."""
    def __init__(self, record: asyncpg.Record):
        self._record = record

    def __getitem__(self, key):
        return self._record[key]

    def __getattr__(self, key):
        try:
            return self._record[key]
        except KeyError:
            raise AttributeError(key)

    def get(self, key, default=None):
        try:
            return self._record[key]
        except KeyError:
            return default

    def keys(self):
        return self._record.keys()

    def __iter__(self):
        return iter(self._record.keys())

    def __contains__(self, key):
        return key in self._record.keys()


def _wrap(record):
    if record is None:
        return None
    return _Row(record)


def _wrap_all(records):
    return [_Row(r) for r in records]


class _Cursor:
    """Mimics aiosqlite cursor interface for compatibility."""
    def __init__(self):
        self._rows = []
        self.lastrowid = None

    async def fetchall(self):
        return self._rows

    async def fetchone(self):
        return self._rows[0] if self._rows else None


class _Conn:
    """Thin wrapper over asyncpg connection with aiosqlite-compatible interface.
    Translates ? placeholders → $1,$2... and row factory automatically."""

    def __init__(self, conn: asyncpg.Connection):
        self._conn = conn
        self._in_transaction = False

    @staticmethod
    def _translate(sql: str, args: tuple) -> tuple[str, list]:
        """Replace ? with $1, $2, ... for asyncpg."""
        idx = 0
        result = []
        for ch in sql:
            if ch == '?':
                idx += 1
                result.append(f'${idx}')
            else:
                result.append(ch)
        return ''.join(result), list(args)

    async def execute(self, sql: str, args: tuple = ()) -> _Cursor:
        pg_sql, pg_args = self._translate(sql, args)
        cur = _Cursor()

        # DDL / CREATE / ALTER / DROP / PRAGMA — execute directly
        upper = pg_sql.strip().upper()
        if any(upper.startswith(k) for k in ('CREATE', 'ALTER', 'DROP', 'PRAGMA', 'TRUNCATE')):
            if not upper.startswith('PRAGMA'):
                await self._conn.execute(pg_sql, *pg_args)
            return cur

        # UPDATE / DELETE / INSERT without RETURNING
        if any(upper.startswith(k) for k in ('UPDATE', 'DELETE')):
            await self._conn.execute(pg_sql, *pg_args)
            return cur

        # INSERT — use fetchrow to capture lastrowid if RETURNING present
        if upper.startswith('INSERT'):
            if 'RETURNING' in upper:
                row = await self._conn.fetchrow(pg_sql, *pg_args)
                if row:
                    cur.lastrowid = row[0]
                    cur._rows = _wrap_all([row])
            else:
                # Add RETURNING id automatically
                returning_sql = pg_sql.rstrip().rstrip(';') + ' RETURNING id'
                try:
                    row = await self._conn.fetchrow(returning_sql, *pg_args)
                    if row:
                        cur.lastrowid = row[0]
                except Exception:
                    await self._conn.execute(pg_sql, *pg_args)
            return cur

        # SELECT
        rows = await self._conn.fetch(pg_sql, *pg_args)
        cur._rows = _wrap_all(rows)
        return cur

    async def executescript(self, sql: str) -> None:
        await self._conn.execute(sql)

    async def commit(self) -> None:
        pass  # autocommit in asyncpg outside transactions

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        pass


@asynccontextmanager
async def get_conn():
    global _pool
    if _pool is None:
        await init_pool()
    async with _pool.acquire() as conn:
        yield _Conn(conn)


async def init_db() -> None:
    """Schema is managed via your PostgreSQL provider's migrations — nothing to do here."""
    logger.info("Using PostgreSQL — schema managed via migrations")
