from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, followers_table
from app.schemas import UserResponse, UserUpdate, UserProfileResponse
from app.auth import get_current_active_user
from app.routers.auth import user_to_response
from app.services.media import get_media_storage

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/", response_model=list[UserResponse])
async def list_users(
    search: str = "",
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    query = db.query(User).filter(User.is_active == True)
    if search:
        query = query.filter(
            (User.username.ilike(f"%{search}%")) |
            (User.full_name.ilike(f"%{search}%"))
        )
    users = query.offset(skip).limit(limit).all()
    return [user_to_response(u, db) for u in users]


@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    resp = user_to_response(user, db)
    is_following = db.query(followers_table).filter(
        followers_table.c.follower_id == current_user.id,
        followers_table.c.followed_id == user_id,
    ).first() is not None

    return UserProfileResponse(**resp.model_dump(), is_following=is_following)


@router.put("/me", response_model=UserResponse)
async def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    db.commit()
    db.refresh(current_user)
    return user_to_response(current_user, db)


@router.post("/me/profile-picture", response_model=UserResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    storage = get_media_storage()
    current_user.profile_picture = storage.save_upload(file, "profiles")
    db.commit()
    db.refresh(current_user)
    return user_to_response(current_user, db)


@router.post("/me/cover-photo", response_model=UserResponse)
async def upload_cover_photo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    storage = get_media_storage()
    current_user.cover_photo = storage.save_upload(file, "covers")
    db.commit()
    db.refresh(current_user)
    return user_to_response(current_user, db)


@router.post("/{user_id}/follow")
async def follow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(followers_table).filter(
        followers_table.c.follower_id == current_user.id,
        followers_table.c.followed_id == user_id,
    ).first()

    if existing:
        # Unfollow
        db.execute(
            followers_table.delete().where(
                (followers_table.c.follower_id == current_user.id) &
                (followers_table.c.followed_id == user_id)
            )
        )
        db.commit()
        return {"message": "Unfollowed", "is_following": False}
    else:
        db.execute(
            followers_table.insert().values(
                follower_id=current_user.id,
                followed_id=user_id,
            )
        )
        db.commit()
        return {"message": "Followed", "is_following": True}


@router.get("/{user_id}/followers", response_model=list[UserResponse])
async def get_followers(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return [user_to_response(f, db) for f in user.followers]


@router.get("/{user_id}/following", response_model=list[UserResponse])
async def get_following(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return [user_to_response(f, db) for f in user.following]
