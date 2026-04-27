from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.config import get_settings


def send_verification_email(to_email: str, code: str) -> None:
    settings = get_settings()
    subject = "KNP Connect verification code"
    body = f"Your KNP Connect verification code is: {code}\n\nThis code expires in 24 hours."

    # Development fallback: no SMTP configured.
    if not settings.smtp_host:
        # Intentionally minimal: devs can see the code in logs.
        print(f"[dev-email] to={to_email} code={code}")  # noqa: T201
        return

    if not settings.smtp_from_email:
        raise RuntimeError("SMTP_FROM_EMAIL must be set when SMTP is enabled")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email
    msg.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port or 587) as server:
        server.ehlo()
        if settings.smtp_use_tls:
            server.starttls()
            server.ehlo()
        if settings.smtp_username and settings.smtp_password:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(msg)

