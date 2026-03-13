from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models import UserRole, PostType, NotificationType, ReportStatus


# ===== Auth Schemas =====
class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=100)
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    token: str


class VerifyEmailRequest(BaseModel):
    email: str
    code: str


class ResendVerificationRequest(BaseModel):
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class PasswordResetRequest(BaseModel):
    email: EmailStr


# ===== User Schemas =====
class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    bio: str
    profile_picture: str
    cover_photo: str
    phone: str
    department_name: str
    course: str
    year_of_study: str
    role: UserRole
    is_active: bool
    is_verified: bool
    theme_preference: str
    created_at: datetime
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    department_name: Optional[str] = None
    course: Optional[str] = None
    year_of_study: Optional[str] = None
    theme_preference: Optional[str] = None


class UserProfileResponse(UserResponse):
    is_following: bool = False


# ===== Post Schemas =====
class PostCreate(BaseModel):
    content: str = Field(min_length=1)
    post_type: PostType = PostType.REGULAR
    tags: list[str] = []
    group_id: Optional[int] = None
    department_id: Optional[int] = None


class PostMediaResponse(BaseModel):
    id: int
    file_url: str
    media_type: str

    class Config:
        from_attributes = True


class CommentResponse(BaseModel):
    id: int
    content: str
    author: UserResponse
    parent_id: Optional[int] = None
    created_at: datetime
    replies: list["CommentResponse"] = []

    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    id: int
    content: str
    post_type: PostType
    author: Optional[UserResponse] = None
    department_id: Optional[int] = None
    group_id: Optional[int] = None
    is_pinned: bool
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    tags: list[str] = []
    media: list[PostMediaResponse] = []
    comments_count: int = 0
    likes_count: int = 0
    share_count: int = 0
    is_liked: bool = False
    user_reaction: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)
    parent_id: Optional[int] = None


class PostUpdate(BaseModel):
    content: Optional[str] = None
    tags: Optional[list[str]] = None
    is_pinned: Optional[bool] = None


# ===== Group Schemas =====
class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""
    is_private: bool = False


class GroupMemberResponse(BaseModel):
    id: int
    user: UserResponse
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class GroupResponse(BaseModel):
    id: int
    name: str
    description: str
    cover_image: str
    is_private: bool
    created_by: int
    members_count: int = 0
    is_member: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_private: Optional[bool] = None


class GroupMessageCreate(BaseModel):
    content: str = Field(min_length=1)


class GroupMessageResponse(BaseModel):
    id: int
    sender: UserResponse
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Department Schemas =====
class DepartmentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""


class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: str
    head: Optional[UserResponse] = None
    is_approved: bool
    posts_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    head_id: Optional[int] = None


# ===== Notification Schemas =====
class NotificationResponse(BaseModel):
    id: int
    notification_type: NotificationType
    title: str
    message: str
    is_read: bool
    link: Optional[str] = None
    sender: Optional[UserResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Admin Schemas =====
class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_posts: int
    total_groups: int
    total_departments: int
    new_users_today: int
    new_posts_today: int
    posts_by_type: dict
    users_by_role: dict
    registration_trend: list[dict]
    posts_trend: list[dict]


class AdminUserUpdate(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


# ===== Settings Schemas =====
class UserSettingsUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    push_notifications: Optional[bool] = None
    show_online_status: Optional[bool] = None
    private_profile: Optional[bool] = None
    dashboard_widgets: Optional[list[str]] = None
    sidebar_collapsed: Optional[bool] = None
    language: Optional[str] = None


class UserSettingsResponse(BaseModel):
    email_notifications: bool
    push_notifications: bool
    show_online_status: bool
    private_profile: bool
    dashboard_widgets: Optional[list[str]] = None
    sidebar_collapsed: bool
    language: str

    class Config:
        from_attributes = True


# ===== Message Schemas =====
class MessageCreate(BaseModel):
    receiver_id: int
    content: str = Field(min_length=1)


class MessageResponse(BaseModel):
    id: int
    sender: UserResponse
    receiver: UserResponse
    content: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ===== Story Schemas =====
class StoryCreate(BaseModel):
    image_url: Optional[str] = None
    text_content: Optional[str] = None
    background_color: str = "#1a1a2e"


class StoryResponse(BaseModel):
    id: int
    user_id: int
    image_url: Optional[str] = None
    text_content: Optional[str] = None
    background_color: str
    expires_at: datetime
    created_at: datetime
    author: UserResponse

    class Config:
        from_attributes = True


class StoryGroupResponse(BaseModel):
    user: UserResponse
    stories: list[StoryResponse]


# ===== Report Schemas =====
class ReportCreate(BaseModel):
    reported_entity_type: str = Field(min_length=1)
    reported_entity_id: int
    reason: str = Field(min_length=1)


class ReportResponse(BaseModel):
    id: int
    reporter: UserResponse
    reported_entity_type: str
    reported_entity_id: int
    reason: str
    status: ReportStatus
    admin_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReportUpdate(BaseModel):
    status: Optional[ReportStatus] = None
    admin_notes: Optional[str] = None
