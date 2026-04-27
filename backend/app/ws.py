from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.realtime import broker


router = APIRouter(tags=["WebSockets"])


def _chat_channel(a: int, b: int) -> str:
    x, y = (a, b) if a < b else (b, a)
    return f"chat:{x}:{y}"


@router.websocket("/ws/chat/{user_id}")
async def ws_chat(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    # Manual token extraction for websockets
    await websocket.accept()
    try:
        auth = websocket.headers.get("authorization", "")
        token = auth.split(" ", 1)[1] if auth.lower().startswith("bearer ") else None
        if not token:
            await websocket.close(code=4401)
            return

        # Reuse get_current_user by faking a request-style dependency is awkward; decode directly.
        from jose import jwt
        from app.config import get_settings

        settings = get_settings()
        payload = jwt.decode(token, settings.require_secret_key(), algorithms=["HS256"])
        current_user_id = int(payload.get("sub"))

        channel = _chat_channel(current_user_id, user_id)
        async for msg in broker.subscribe(channel):
            await websocket.send_text(msg)
    except WebSocketDisconnect:
        return


@router.websocket("/ws/groups/{group_id}")
async def ws_group(websocket: WebSocket, group_id: int):
    await websocket.accept()
    try:
        channel = f"group:{group_id}"
        async for msg in broker.subscribe(channel):
            await websocket.send_text(msg)
    except WebSocketDisconnect:
        return


@router.websocket("/ws/notifications")
async def ws_notifications(websocket: WebSocket):
    await websocket.accept()
    try:
        auth = websocket.headers.get("authorization", "")
        token = auth.split(" ", 1)[1] if auth.lower().startswith("bearer ") else None
        if not token:
            await websocket.close(code=4401)
            return

        from jose import jwt
        from app.config import get_settings

        settings = get_settings()
        payload = jwt.decode(token, settings.require_secret_key(), algorithms=["HS256"])
        current_user_id = int(payload.get("sub"))

        channel = f"notif:{current_user_id}"
        async for msg in broker.subscribe(channel):
            await websocket.send_text(msg)
    except WebSocketDisconnect:
        return

