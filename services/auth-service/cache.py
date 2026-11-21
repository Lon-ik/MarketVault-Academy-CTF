import os

import redis.asyncio as redis

_client = None


async def init_cache():
    global _client
    _client = redis.from_url(
        os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
        decode_responses=True,
    )
    await _client.ping()


async def close_cache():
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def cache():
    if _client is None:
        raise RuntimeError("redis client is not initialized")
    return _client