from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app.models import User, Message, Notification, NotificationType
from app.schemas import MessageCreate, MessageResponse
from app.auth import get_current_active_user
from app.routers.auth import user_to_response
from app.realtime import broker

router = APIRouter(prefix="/api/messages", tags=["Messages"])


@router.get("/conversations")
async def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get list of users the current user has conversations with"""
    # Get all unique user IDs from messages
    sent = db.query(Message.receiver_id).filter(Message.sender_id == current_user.id).distinct().all()
    received = db.query(Message.sender_id).filter(Message.receiver_id == current_user.id).distinct().all()

    user_ids = set([r[0] for r in sent] + [r[0] for r in received])
    conversations = []

    for uid in user_ids:
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            continue

        # Get last message
        last_msg = db.query(Message).filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == uid),
                and_(Message.sender_id == uid, Message.receiver_id == current_user.id),
            )
        ).order_by(Message.created_at.desc()).first()

        unread = db.query(Message).filter(
            Message.sender_id == uid,
            Message.receiver_id == current_user.id,
            Message.is_read == False,
        ).count()

        conversations.append({
            "user": user_to_response(user, db).model_dump(),
            "last_message": last_msg.content if last_msg else "",
            "last_message_time": last_msg.created_at.isoformat() if last_msg else None,
            "unread_count": unread,
        })

    # Sort by last message time
    conversations.sort(key=lambda x: x["last_message_time"] or "", reverse=True)
    return conversations


@router.get("/{user_id}", response_model=list[MessageResponse])
async def get_messages(
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == current_user.id, Message.receiver_id == user_id),
            and_(Message.sender_id == user_id, Message.receiver_id == current_user.id),
        )
    ).order_by(Message.created_at.desc()).offset(skip).limit(limit).all()

    # Mark received messages as read
    db.query(Message).filter(
        Message.sender_id == user_id,
        Message.receiver_id == current_user.id,
        Message.is_read == False,
    ).update({"is_read": True})
    db.commit()

    result = []
    for m in reversed(messages):
        result.append(MessageResponse(
            id=m.id,
            sender=user_to_response(m.sender, db),
            receiver=user_to_response(m.receiver, db),
            content=m.content,
            is_read=m.is_read,
            created_at=m.created_at,
        ))
    return result


@router.post("/", response_model=MessageResponse)
async def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    receiver = db.query(User).filter(User.id == data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    message = Message(
        sender_id=current_user.id,
        receiver_id=data.receiver_id,
        content=data.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    await broker.publish(
        f"chat:{min(current_user.id, data.receiver_id)}:{max(current_user.id, data.receiver_id)}",
        {
            "type": "message",
            "id": message.id,
            "sender_id": current_user.id,
            "receiver_id": data.receiver_id,
            "content": message.content,
            "created_at": message.created_at,
        },
    )

    return MessageResponse(
        id=message.id,
        sender=user_to_response(message.sender, db),
        receiver=user_to_response(message.receiver, db),
        content=message.content,
        is_read=message.is_read,
        created_at=message.created_at,
    )
