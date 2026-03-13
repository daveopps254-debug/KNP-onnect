from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import User, Post, Group, Department, UserRole, PostType, Notification, NotificationType
from app.schemas import (
    AdminStatsResponse, AdminUserUpdate, UserResponse,
    PostResponse, DepartmentCreate, DepartmentResponse, DepartmentUpdate,
)
from app.auth import get_admin_user, get_head_admin_user
from app.routers.auth import user_to_response
from app.routers.posts import post_to_response
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminStatsResponse)
async def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_posts = db.query(Post).count()
    total_groups = db.query(Group).count()
    total_departments = db.query(Department).count()
    new_users_today = db.query(User).filter(User.created_at >= today).count()
    new_posts_today = db.query(Post).filter(Post.created_at >= today).count()

    # Posts by type
    posts_by_type = {}
    for pt in PostType:
        count = db.query(Post).filter(Post.post_type == pt).count()
        posts_by_type[pt.value] = count

    # Users by role
    users_by_role = {}
    for role in UserRole:
        count = db.query(User).filter(User.role == role).count()
        users_by_role[role.value] = count

    # Registration trend (last 30 days)
    registration_trend = []
    for i in range(30, -1, -1):
        day = today - timedelta(days=i)
        next_day = day + timedelta(days=1)
        count = db.query(User).filter(
            User.created_at >= day,
            User.created_at < next_day,
        ).count()
        registration_trend.append({
            "date": day.strftime("%Y-%m-%d"),
            "count": count,
        })

    # Posts trend (last 30 days)
    posts_trend = []
    for i in range(30, -1, -1):
        day = today - timedelta(days=i)
        next_day = day + timedelta(days=1)
        count = db.query(Post).filter(
            Post.created_at >= day,
            Post.created_at < next_day,
        ).count()
        posts_trend.append({
            "date": day.strftime("%Y-%m-%d"),
            "count": count,
        })

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        total_posts=total_posts,
        total_groups=total_groups,
        total_departments=total_departments,
        new_users_today=new_users_today,
        new_posts_today=new_posts_today,
        posts_by_type=posts_by_type,
        users_by_role=users_by_role,
        registration_trend=registration_trend,
        posts_trend=posts_trend,
    )


@router.get("/users", response_model=list[UserResponse])
async def list_all_users(
    search: str = "",
    role: str = "",
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(User)
    if search:
        query = query.filter(
            (User.username.ilike(f"%{search}%")) |
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    if role:
        query = query.filter(User.role == UserRole(role))
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return [user_to_response(u, db) for u in users]


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: AdminUserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only head admin can promote to admin or head_admin
    if data.role and data.role in [UserRole.ADMIN, UserRole.HEAD_ADMIN]:
        if admin.role != UserRole.HEAD_ADMIN:
            raise HTTPException(status_code=403, detail="Only head admin can assign admin roles")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user_to_response(user, db)


@router.delete("/users/{user_id}")
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.HEAD_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot deactivate head admin")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}


@router.get("/posts", response_model=list[PostResponse])
async def list_all_posts(
    search: str = "",
    post_type: str = "",
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(Post)
    if post_type:
        query = query.filter(Post.post_type == PostType(post_type))
    posts = query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    return [post_to_response(p, db, admin.id) for p in posts]


@router.delete("/posts/{post_id}")
async def admin_delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}


@router.put("/posts/{post_id}/pin")
async def toggle_pin_post(
    post_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.is_pinned = not post.is_pinned
    db.commit()
    return {"message": "Pin toggled", "is_pinned": post.is_pinned}


# ===== Head Admin Only =====

@router.post("/admins/{user_id}")
async def promote_to_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_head_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = UserRole.ADMIN
    db.commit()

    # Notify user
    notif = Notification(
        user_id=user.id,
        sender_id=admin.id,
        notification_type=NotificationType.SYSTEM,
        title="Admin Promotion",
        message="You have been promoted to Admin by the Head Administrator",
    )
    db.add(notif)
    db.commit()
    return {"message": f"{user.full_name} promoted to admin"}


@router.delete("/admins/{user_id}")
async def demote_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_head_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == UserRole.HEAD_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot demote head admin")
    user.role = UserRole.USER
    db.commit()
    return {"message": f"{user.full_name} demoted to user"}


# ===== Departments (Head Admin) =====

@router.post("/departments", response_model=DepartmentResponse)
async def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_head_admin_user),
):
    existing = db.query(Department).filter(Department.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")

    dept = Department(
        name=data.name,
        description=data.description,
        is_approved=True,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)

    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        description=dept.description,
        head=None,
        is_approved=dept.is_approved,
        posts_count=0,
        created_at=dept.created_at,
    )


@router.get("/departments", response_model=list[DepartmentResponse])
async def list_departments(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    depts = db.query(Department).all()
    result = []
    for d in depts:
        head_resp = user_to_response(d.head, db) if d.head else None
        result.append(DepartmentResponse(
            id=d.id,
            name=d.name,
            description=d.description,
            head=head_resp,
            is_approved=d.is_approved,
            posts_count=len(d.posts),
            created_at=d.created_at,
        ))
    return result


@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: int,
    data: DepartmentUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_head_admin_user),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    update_data = data.model_dump(exclude_unset=True)

    if "head_id" in update_data and update_data["head_id"]:
        head_user = db.query(User).filter(User.id == update_data["head_id"]).first()
        if head_user:
            head_user.role = UserRole.DEPARTMENT_HEAD
            # Notify
            notif = Notification(
                user_id=head_user.id,
                sender_id=admin.id,
                notification_type=NotificationType.SYSTEM,
                title="Department Head Appointment",
                message=f"You have been appointed as head of {dept.name}",
            )
            db.add(notif)

    for key, value in update_data.items():
        setattr(dept, key, value)
    db.commit()
    db.refresh(dept)

    head_resp = user_to_response(dept.head, db) if dept.head else None
    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        description=dept.description,
        head=head_resp,
        is_approved=dept.is_approved,
        posts_count=len(dept.posts),
        created_at=dept.created_at,
    )


@router.delete("/departments/{dept_id}")
async def delete_department(
    dept_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_head_admin_user),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()
    return {"message": "Department deleted"}


@router.put("/departments/{dept_id}/approve")
async def approve_department(
    dept_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_head_admin_user),
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    dept.is_approved = True
    db.commit()
    return {"message": "Department approved"}
