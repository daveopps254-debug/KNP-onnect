from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Story
from app.schemas import StoryCreate, StoryResponse, StoryGroupResponse, UserResponse
from app.auth import get_current_active_user
from app.routers.auth import user_to_response
from datetime import datetime, timedelta, timezone
import os
import uuid
import shutil

router = APIRouter(prefix="/api/stories", tags=["Stories"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


def story_to_response(story: Story, db: Session) -> StoryResponse:
    return StoryResponse(
        id=story.id,
        user_id=story.user_id,
        image_url=story.image_url,
        text_content=story.text_content,
        background_color=story.background_color,
        expires_at=story.expires_at,
        created_at=story.created_at,
        author=user_to_response(story.author, db),
    )


@router.post("/", response_model=StoryResponse)
async def create_story(
    data: StoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    story = Story(
        user_id=current_user.id,
        image_url=data.image_url,
        text_content=data.text_content,
        background_color=data.background_color,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return story_to_response(story, db)


@router.post("/upload", response_model=StoryResponse)
async def create_story_with_image(
    text_content: str = "",
    background_color: str = "#1a1a2e",
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    image_url = None
    if file and file.filename:
        ext = file.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, "stories", filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        image_url = f"/uploads/stories/{filename}"

    story = Story(
        user_id=current_user.id,
        image_url=image_url,
        text_content=text_content or None,
        background_color=background_color,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return story_to_response(story, db)


@router.get("/", response_model=list[StoryGroupResponse])
async def get_stories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    now = datetime.now(timezone.utc)
    stories = db.query(Story).filter(
        Story.expires_at > now,
    ).order_by(Story.created_at.desc()).all()

    grouped: dict[int, StoryGroupResponse] = {}
    for s in stories:
        if s.user_id not in grouped:
            grouped[s.user_id] = StoryGroupResponse(
                user=user_to_response(s.author, db),
                stories=[],
            )
        grouped[s.user_id].stories.append(story_to_response(s, db))

    return list(grouped.values())


@router.delete("/{story_id}")
async def delete_story(
    story_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(story)
    db.commit()
    return {"message": "Story deleted"}
