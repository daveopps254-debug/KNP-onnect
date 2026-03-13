from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Post, PostMedia, Comment, Like, PostType, Notification, NotificationType
from app.schemas import (
    PostCreate, PostResponse, PostUpdate, PostMediaResponse,
    CommentCreate, CommentResponse, UserResponse,
)
from app.auth import get_current_active_user
from app.routers.auth import user_to_response
from typing import Optional
import os
import uuid
import shutil

router = APIRouter(prefix="/api/posts", tags=["Posts"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


def post_to_response(post: Post, db: Session, current_user_id: int) -> PostResponse:
    like = db.query(Like).filter(
        Like.post_id == post.id,
        Like.user_id == current_user_id,
    ).first()
    is_liked = like is not None
    user_reaction = like.reaction if like else None

    author_resp = None
    if post.post_type != PostType.ANONYMOUS:
        author_resp = user_to_response(post.author, db)

    return PostResponse(
        id=post.id,
        content=post.content,
        post_type=post.post_type,
        author=author_resp,
        department_id=post.department_id,
        group_id=post.group_id,
        is_pinned=post.is_pinned,
        image_url=post.image_url,
        video_url=post.video_url,
        tags=post.tags or [],
        media=[PostMediaResponse(id=m.id, file_url=m.file_url, media_type=m.media_type) for m in post.media],
        comments_count=len(post.comments),
        likes_count=len(post.likes),
        share_count=post.share_count,
        is_liked=is_liked,
        user_reaction=user_reaction,
        created_at=post.created_at,
    )


@router.post("/", response_model=PostResponse)
async def create_post(
    content: str = Form(...),
    post_type: str = Form("regular"),
    tags: str = Form(""),
    group_id: Optional[int] = Form(None),
    department_id: Optional[int] = Form(None),
    files: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    post = Post(
        content=content,
        post_type=PostType(post_type),
        author_id=current_user.id,
        group_id=group_id,
        department_id=department_id,
        tags=tag_list,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # Handle media uploads
    for file in files:
        if file.filename:
            ext = file.filename.split(".")[-1]
            filename = f"{uuid.uuid4()}.{ext}"
            media_type = "video" if file.content_type and file.content_type.startswith("video/") else "image"
            filepath = os.path.join(UPLOAD_DIR, "posts", filename)
            os.makedirs(os.path.dirname(filepath), exist_ok=True)

            with open(filepath, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            media = PostMedia(
                post_id=post.id,
                file_url=f"/uploads/posts/{filename}",
                media_type=media_type,
            )
            db.add(media)

    db.commit()
    db.refresh(post)
    return post_to_response(post, db, current_user.id)


@router.get("/", response_model=list[PostResponse])
async def get_feed(
    skip: int = 0,
    limit: int = 20,
    post_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(Post).filter(Post.group_id == None, Post.is_approved == True)
    if post_type:
        query = query.filter(Post.post_type == PostType(post_type))
    posts = query.order_by(Post.is_pinned.desc(), Post.created_at.desc()).offset(skip).limit(limit).all()
    return [post_to_response(p, db, current_user.id) for p in posts]


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post_to_response(post, db, current_user.id)


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id and current_user.role not in ["admin", "head_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(post, key, value)
    db.commit()
    db.refresh(post)
    return post_to_response(post, db, current_user.id)


@router.delete("/{post_id}")
async def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id and current_user.role not in ["admin", "head_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}


@router.post("/{post_id}/like")
async def toggle_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(Like).filter(
        Like.post_id == post_id,
        Like.user_id == current_user.id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Unliked", "is_liked": False, "likes_count": len(post.likes)}
    else:
        like = Like(post_id=post_id, user_id=current_user.id)
        db.add(like)

        # Create notification
        if post.author_id != current_user.id:
            notif = Notification(
                user_id=post.author_id,
                sender_id=current_user.id,
                notification_type=NotificationType.LIKE,
                title="New Like",
                message=f"{current_user.full_name} liked your post",
                link=f"/posts/{post_id}",
            )
            db.add(notif)

        db.commit()
        return {"message": "Liked", "is_liked": True, "likes_count": len(post.likes)}


@router.post("/{post_id}/comments", response_model=CommentResponse)
async def add_comment(
    post_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = Comment(
        content=data.content,
        post_id=post_id,
        author_id=current_user.id,
        parent_id=data.parent_id,
    )
    db.add(comment)

    # Create notification
    if post.author_id != current_user.id:
        notif = Notification(
            user_id=post.author_id,
            sender_id=current_user.id,
            notification_type=NotificationType.COMMENT,
            title="New Comment",
            message=f"{current_user.full_name} commented on your post",
            link=f"/posts/{post_id}",
        )
        db.add(notif)

    db.commit()
    db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        content=comment.content,
        author=user_to_response(comment.author, db),
        parent_id=comment.parent_id,
        created_at=comment.created_at,
        replies=[],
    )


@router.get("/{post_id}/comments", response_model=list[CommentResponse])
async def get_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    comments = db.query(Comment).filter(
        Comment.post_id == post_id,
        Comment.parent_id == None,
    ).order_by(Comment.created_at.desc()).all()

    result = []
    for c in comments:
        replies = [
            CommentResponse(
                id=r.id,
                content=r.content,
                author=user_to_response(r.author, db),
                parent_id=r.parent_id,
                created_at=r.created_at,
                replies=[],
            )
            for r in c.replies
        ]
        result.append(CommentResponse(
            id=c.id,
            content=c.content,
            author=user_to_response(c.author, db),
            parent_id=c.parent_id,
            created_at=c.created_at,
            replies=replies,
        ))
    return result


@router.post("/{post_id}/share")
async def share_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.share_count = (post.share_count or 0) + 1
    db.commit()
    return {"message": "Post shared", "share_count": post.share_count}


@router.get("/reels", response_model=list[PostResponse])
async def get_reels(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    posts = db.query(Post).filter(
        Post.post_type == PostType.REEL,
        Post.is_approved == True,
    ).order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return [post_to_response(p, db, current_user.id) for p in posts]


@router.get("/user/{user_id}", response_model=list[PostResponse])
async def get_user_posts(
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    posts = db.query(Post).filter(
        Post.author_id == user_id,
        Post.post_type != PostType.ANONYMOUS,
    ).order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return [post_to_response(p, db, current_user.id) for p in posts]
