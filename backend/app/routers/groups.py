from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Group, GroupMember, GroupMessage, Post, PostType, Notification, NotificationType
from app.schemas import (
    GroupCreate, GroupResponse, GroupUpdate, GroupMemberResponse,
    GroupMessageCreate, GroupMessageResponse, PostResponse,
)
from app.auth import get_current_active_user
from app.routers.auth import user_to_response
from app.routers.posts import post_to_response
from app.services.media import get_media_storage
from app.realtime import broker

router = APIRouter(prefix="/api/groups", tags=["Groups"])


def group_to_response(group: Group, db: Session, current_user_id: int) -> GroupResponse:
    is_member = db.query(GroupMember).filter(
        GroupMember.group_id == group.id,
        GroupMember.user_id == current_user_id,
    ).first() is not None

    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        cover_image=group.cover_image or "",
        is_private=group.is_private,
        created_by=group.created_by,
        members_count=len(group.members),
        is_member=is_member,
        created_at=group.created_at,
    )


@router.post("/", response_model=GroupResponse)
async def create_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    group = Group(
        name=data.name,
        description=data.description,
        is_private=data.is_private,
        created_by=current_user.id,
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    # Add creator as admin
    member = GroupMember(
        group_id=group.id,
        user_id=current_user.id,
        role="admin",
    )
    db.add(member)
    db.commit()
    db.refresh(group)

    return group_to_response(group, db, current_user.id)


@router.get("/", response_model=list[GroupResponse])
async def list_groups(
    search: str = "",
    my_groups: bool = False,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Group)
    if search:
        query = query.filter(Group.name.ilike(f"%{search}%"))
    if my_groups:
        user_group_ids = [
            gm.group_id for gm in
            db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()
        ]
        query = query.filter(Group.id.in_(user_group_ids))
    groups = query.offset(skip).limit(limit).all()
    return [group_to_response(g, db, current_user.id) for g in groups]


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group_to_response(group, db, current_user.id)


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check if user is group admin
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
        GroupMember.role == "admin",
    ).first()
    if not membership and current_user.role not in ["admin", "head_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(group, key, value)
    db.commit()
    db.refresh(group)
    return group_to_response(group, db, current_user.id)


@router.post("/{group_id}/cover", response_model=GroupResponse)
async def upload_group_cover(
    group_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    storage = get_media_storage()
    group.cover_image = storage.save_upload(file, "groups")
    db.commit()
    db.refresh(group)
    return group_to_response(group, db, current_user.id)


@router.delete("/{group_id}")
async def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group.created_by != current_user.id and current_user.role not in ["admin", "head_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(group)
    db.commit()
    return {"message": "Group deleted"}


@router.post("/{group_id}/join")
async def join_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()

    if existing:
        # Leave group
        db.delete(existing)
        db.commit()
        return {"message": "Left group", "is_member": False}
    else:
        member = GroupMember(
            group_id=group_id,
            user_id=current_user.id,
            role="member",
        )
        db.add(member)
        db.commit()
        return {"message": "Joined group", "is_member": True}


@router.get("/{group_id}/members", response_model=list[GroupMemberResponse])
async def get_group_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    members = db.query(GroupMember).filter(GroupMember.group_id == group_id).all()
    return [
        GroupMemberResponse(
            id=m.id,
            user=user_to_response(m.user, db),
            role=m.role,
            joined_at=m.joined_at,
        )
        for m in members
    ]


@router.get("/{group_id}/posts", response_model=list[PostResponse])
async def get_group_posts(
    group_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    posts = db.query(Post).filter(
        Post.group_id == group_id,
    ).order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return [post_to_response(p, db, current_user.id) for p in posts]


@router.get("/{group_id}/messages", response_model=list[GroupMessageResponse])
async def get_group_messages(
    group_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    messages = db.query(GroupMessage).filter(
        GroupMessage.group_id == group_id,
    ).order_by(GroupMessage.created_at.desc()).offset(skip).limit(limit).all()
    return [
        GroupMessageResponse(
            id=m.id,
            sender=user_to_response(m.sender, db),
            content=m.content,
            created_at=m.created_at,
        )
        for m in reversed(messages)
    ]


@router.post("/{group_id}/messages", response_model=GroupMessageResponse)
async def send_group_message(
    group_id: int,
    data: GroupMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Check membership
    membership = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == current_user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Must be a member to send messages")

    message = GroupMessage(
        group_id=group_id,
        sender_id=current_user.id,
        content=data.content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    await broker.publish(
        f"group:{group_id}",
        {
            "type": "group_message",
            "id": message.id,
            "group_id": group_id,
            "sender_id": current_user.id,
            "content": message.content,
            "created_at": message.created_at,
        },
    )

    return GroupMessageResponse(
        id=message.id,
        sender=user_to_response(message.sender, db),
        content=message.content,
        created_at=message.created_at,
    )
