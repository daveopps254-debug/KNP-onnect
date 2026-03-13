from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Report, ReportStatus
from app.schemas import ReportCreate, ReportResponse, ReportUpdate
from app.auth import get_current_active_user, get_admin_user
from app.routers.auth import user_to_response
from datetime import datetime, timezone

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def report_to_response(report: Report, db: Session) -> ReportResponse:
    return ReportResponse(
        id=report.id,
        reporter=user_to_response(report.reporter, db),
        reported_entity_type=report.reported_entity_type,
        reported_entity_id=report.reported_entity_id,
        reason=report.reason,
        status=report.status,
        admin_notes=report.admin_notes,
        resolved_at=report.resolved_at,
        created_at=report.created_at,
    )


@router.post("/", response_model=ReportResponse)
async def create_report(
    data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    report = Report(
        reporter_id=current_user.id,
        reported_entity_type=data.reported_entity_type,
        reported_entity_id=data.reported_entity_id,
        reason=data.reason,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report_to_response(report, db)


@router.get("/", response_model=list[ReportResponse])
async def list_reports(
    status: str = "",
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    query = db.query(Report)
    if status:
        query = query.filter(Report.status == ReportStatus(status))
    reports = query.order_by(Report.created_at.desc()).offset(skip).limit(limit).all()
    return [report_to_response(r, db) for r in reports]


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: int,
    data: ReportUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] in [ReportStatus.RESOLVED, ReportStatus.DISMISSED]:
        report.resolved_at = datetime.now(timezone.utc)
    for key, value in update_data.items():
        setattr(report, key, value)
    db.commit()
    db.refresh(report)
    return report_to_response(report, db)


@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"message": "Report deleted"}
