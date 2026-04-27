from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from typing import Any, AsyncIterator

from app.config import get_settings


@dataclass
class _Subscription:
    channel: str
    queue: "asyncio.Queue[str]"


class RealtimeBroker:
    """Publish/subscribe used for WebSocket fanout.

    Uses Redis when configured; otherwise falls back to in-process queues
    (suitable for development only).
    """

    def __init__(self) -> None:
        self._settings = get_settings()
        self._use_redis = bool(self._settings.redis_url)
        self._redis = None
        if self._use_redis:
            try:
                import redis.asyncio as redis_async  # type: ignore

                self._redis = redis_async.Redis.from_url(self._settings.redis_url, decode_responses=True)
            except Exception:
                self._redis = None
                self._use_redis = False

        self._local_subs: dict[str, set[asyncio.Queue[str]]] = {}
        self._lock = asyncio.Lock()

    async def publish(self, channel: str, payload: dict[str, Any]) -> None:
        msg = json.dumps(payload, default=str)
        if self._use_redis and self._redis is not None:
            await self._redis.publish(channel, msg)
            return

        async with self._lock:
            queues = list(self._local_subs.get(channel, set()))
        for q in queues:
            q.put_nowait(msg)

    async def subscribe(self, channel: str) -> AsyncIterator[str]:
        if self._use_redis and self._redis is not None:
            pubsub = self._redis.pubsub()
            await pubsub.subscribe(channel)
            try:
                while True:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                    if message and message.get("data"):
                        yield str(message["data"])
                    await asyncio.sleep(0.01)
            finally:
                await pubsub.unsubscribe(channel)
                await pubsub.close()
            return

        q: asyncio.Queue[str] = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._local_subs.setdefault(channel, set()).add(q)
        try:
            while True:
                yield await q.get()
        finally:
            async with self._lock:
                self._local_subs.get(channel, set()).discard(q)


broker = RealtimeBroker()

