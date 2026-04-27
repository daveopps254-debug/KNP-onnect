from __future__ import annotations

import logging
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from prometheus_client import Counter, Histogram  # type: ignore

    REQUEST_COUNT = Counter(
        "http_requests_total",
        "Total HTTP requests",
        ["method", "path", "status"],
    )
    REQUEST_LATENCY = Histogram(
        "http_request_duration_seconds",
        "HTTP request latency",
        ["method", "path"],
    )
except Exception:  # pragma: no cover
    REQUEST_COUNT = None
    REQUEST_LATENCY = None


logger = logging.getLogger("knp_connect")


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id

        start = time.time()
        try:
            response = await call_next(request)
        finally:
            duration = time.time() - start

            path = request.url.path
            method = request.method
            status = getattr(getattr(response, "status_code", None), "__int__", lambda: 0)()

            if REQUEST_COUNT is not None:
                REQUEST_COUNT.labels(method=method, path=path, status=str(status)).inc()
            if REQUEST_LATENCY is not None:
                REQUEST_LATENCY.labels(method=method, path=path).observe(duration)

        response.headers["X-Request-ID"] = request_id
        return response

