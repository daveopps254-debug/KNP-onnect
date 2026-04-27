from __future__ import annotations

import time
from dataclasses import dataclass

from app.config import get_settings


@dataclass(frozen=True)
class RateLimit:
    limit: int
    window_seconds: int


class RateLimiter:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._redis = None
        self._memory: dict[str, list[float]] = {}

        if self._settings.redis_url:
            try:
                import redis  # type: ignore

                self._redis = redis.Redis.from_url(self._settings.redis_url, decode_responses=True)
            except Exception:
                self._redis = None

    def hit(self, key: str, rl: RateLimit) -> bool:
        """Return True if allowed, False if rate-limited."""
        now = time.time()
        window_start = now - rl.window_seconds

        if self._redis is not None:
            # Sliding window via ZSET
            zkey = f"rl:{key}"
            pipe = self._redis.pipeline()
            pipe.zremrangebyscore(zkey, 0, window_start)
            pipe.zadd(zkey, {str(now): now})
            pipe.zcard(zkey)
            pipe.expire(zkey, rl.window_seconds + 5)
            _, _, count, _ = pipe.execute()
            return int(count) <= rl.limit

        # Dev fallback (single process)
        bucket = self._memory.setdefault(key, [])
        bucket[:] = [t for t in bucket if t >= window_start]
        bucket.append(now)
        return len(bucket) <= rl.limit


rate_limiter = RateLimiter()

