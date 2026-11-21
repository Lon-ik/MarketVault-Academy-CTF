import os

import asyncpg

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://marketvault:marketvault@postgres:5432/marketvault",
)
DB_SCHEMA = os.environ.get("DB_SCHEMA", "auth")

_pool = None


async def init_pool():
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=DATABASE_URL,
        min_size=1,
        max_size=int(os.environ.get("DB_POOL_MAX", "10")),
        server_settings={"search_path": f"{DB_SCHEMA},public"},
    )


async def close_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def pool():
    if _pool is None:
        raise RuntimeError("database pool is not initialized")
    return _pool


async def fetchrow(query, *args):
    async with pool().acquire() as connection:
        return await connection.fetchrow(query, *args)


async def fetchval(query, *args):
    async with pool().acquire() as connection:
        return await connection.fetchval(query, *args)


async def execute(query, *args):
    async with pool().acquire() as connection:
        return await connection.execute(query, *args)


async def get_flag(slug, fallback):
    row = await fetchrow(
        "SELECT flag FROM academy.challenges WHERE slug = $1", slug
    )
    return row["flag"] if row else fallback