from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRole, UserSettings
from app.schemas import (
    UserRegister, UserLogin, TokenResponse, UserResponse,
    VerifyEmailRequest, ResendVerificationRequest, GoogleAuthRequest, RefreshRequest,
)
from app.auth import (
    get_password_hash, verify_password, create_access_token,
    generate_verification_code, get_current_user,
    create_refresh_token, rotate_refresh_token, revoke_refresh_token,
)
from datetime import datetime, timedelta, timezone
from app.services.rate_limit import rate_limiter, RateLimit
from app.services.email import send_verification_email

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def _validate_password(password: str) -> None:
    if len(password) < 10:
        raise HTTPException(status_code=400, detail="Password must be at least 10 characters")
    has_lower = any(c.islower() for c in password)
    has_upper = any(c.isupper() for c in password)
    has_digit = any(c.isdigit() for c in password)
    if not (has_lower and has_upper and has_digit):
        raise HTTPException(status_code=400, detail="Password must include upper, lower, and a digit")


def user_to_response(user: User, db: Session) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        bio=user.bio or "",
        profile_picture=user.profile_picture or "",
        cover_photo=user.cover_photo or "",
        phone=user.phone or "",
        department_name=user.department_name or "",
        course=user.course or "",
        year_of_study=user.year_of_study or "",
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        theme_preference=user.theme_preference or "light",
        created_at=user.created_at,
        followers_count=len(user.followers) if user.followers else 0,
        following_count=len(user.following) if user.following else 0,
        posts_count=len(user.posts) if user.posts else 0,
    )


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: Session = Depends(get_db)):
    if not rate_limiter.hit(f"register:{data.email.lower()}", RateLimit(limit=5, window_seconds=60)):
        raise HTTPException(status_code=429, detail="Too many attempts, try again later")
    _validate_password(data.password)
    # Check existing email
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    # Check existing username
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    verification_code = generate_verification_code()

    user = User(
        email=data.email,
        username=data.username,
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        email_verification_code=verification_code,
        email_verification_expiry=datetime.now(timezone.utc) + timedelta(hours=24),
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create default settings
    settings = UserSettings(user_id=user.id)
    db.add(settings)
    db.commit()

    # Create first head admin if this is the first user
    user_count = db.query(User).count()
    if user_count == 1:
        user.role = UserRole.HEAD_ADMIN
        user.is_verified = True
        db.commit()
        db.refresh(user)

    # Send verification email (no-op in dev if SMTP not configured)
    if user.role != UserRole.HEAD_ADMIN:
        send_verification_email(user.email, verification_code)

    token = create_access_token(data={"sub": user.id})
    refresh = create_refresh_token(db, user.id)
    return TokenResponse(
        access_token=token,
        refresh_token=refresh,
        user=user_to_response(user, db),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: Session = Depends(get_db)):
    if not rate_limiter.hit(f"login:{data.email.lower()}", RateLimit(limit=10, window_seconds=60)):
        raise HTTPException(status_code=429, detail="Too many attempts, try again later")
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(data={"sub": user.id})
    refresh = create_refresh_token(db, user.id)
    return TokenResponse(
        access_token=token,
        refresh_token=refresh,
        user=user_to_response(user, db),
    )


@router.post("/verify-email")
async def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        return {"message": "Email already verified"}
    if user.email_verification_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    if user.email_verification_expiry and user.email_verification_expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code expired")

    user.is_verified = True
    user.email_verification_code = None
    user.email_verification_expiry = None
    db.commit()
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
async def resend_verification(data: ResendVerificationRequest, db: Session = Depends(get_db)):
    if not rate_limiter.hit(f"resend_verification:{data.email.lower()}", RateLimit(limit=3, window_seconds=300)):
        raise HTTPException(status_code=429, detail="Too many attempts, try again later")
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        return {"message": "Email already verified"}

    code = generate_verification_code()
    user.email_verification_code = code
    user.email_verification_expiry = datetime.now(timezone.utc) + timedelta(hours=24)
    db.commit()
    # Phase 4 will send email; for now do not leak code in responses.
    send_verification_email(user.email, code)
    return {"message": "Verification code resent"}


@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Handle Google OAuth by verifying the provided ID token."""
    from app.config import get_settings

    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured")

    try:
        from google.oauth2 import id_token  # type: ignore
        from google.auth.transport import requests  # type: ignore
    except Exception as e:
        raise HTTPException(status_code=500, detail="google-auth dependency not available") from e

    try:
        info = id_token.verify_oauth2_token(data.token, requests.Request(), settings.google_client_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    google_id = str(info.get("sub") or "")
    email = str(info.get("email") or "")
    name = str(info.get("name") or "")
    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Google token missing required claims")

    # Check if user exists by google_id
    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        # Check by email
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.google_id = google_id
            db.commit()
        else:
            # Create new user
            username = email.split("@")[0]
            base_username = username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1

            user = User(
                email=email,
                username=username,
                full_name=name or email.split("@")[0],
                google_id=google_id,
                is_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            settings = UserSettings(user_id=user.id)
            db.add(settings)
            db.commit()

    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": user.id})
    refresh = create_refresh_token(db, user.id)
    return TokenResponse(
        access_token=token,
        refresh_token=refresh,
        user=user_to_response(user, db),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_to_response(current_user, db)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(data: RefreshRequest, db: Session = Depends(get_db)):
    new_refresh, user_id = rotate_refresh_token(db, data.refresh_token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    access = create_access_token(data={"sub": user.id})
    return TokenResponse(
        access_token=access,
        refresh_token=new_refresh,
        user=user_to_response(user, db),
    )


@router.post("/logout")
async def logout(data: RefreshRequest, db: Session = Depends(get_db)):
    revoke_refresh_token(db, data.refresh_token)
    return {"message": "Logged out"}
