from __future__ import annotations
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def send_low_leads_alert(
    *,
    commercial_name: str,
    pending_count: int,
    admin_emails: list[str],
    smtp_host: str,
    smtp_port: int,
    smtp_user: str,
    smtp_password: str,
    smtp_from: str,
) -> None:
    """Envía email a los admins cuando un comercial está a punto de quedarse sin leads."""
    if not smtp_user or not smtp_password:
        logger.warning("SMTP no configurado — notificación de pocos leads omitida")
        return
    if not admin_emails:
        logger.warning("Sin admins con email — notificación omitida")
        return

    subject = f"⚠️ LeadUp — {commercial_name} se queda sin leads"
    body = f"""
<html><body style="font-family:sans-serif;color:#1e293b;padding:24px">
  <h2 style="color:#7c3aed">LeadUp · Alerta de leads bajos</h2>
  <p>El comercial <strong>{commercial_name}</strong> tiene solo
  <strong style="color:#dc2626">{pending_count} lead(s) pendiente(s)</strong>.</p>
  <p>Por favor, entra a LeadUp y asigna un nuevo lote desde
  <strong>Admin → Asignar leads</strong>.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
  <p style="font-size:12px;color:#94a3b8">Este mensaje fue generado automáticamente por LeadUp.</p>
</body></html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_from
    msg["To"] = ", ".join(admin_emails)
    msg.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, admin_emails, msg.as_string())
        logger.info(f"Alerta leads bajos enviada para {commercial_name} → {admin_emails}")
    except Exception as exc:
        logger.error(f"Error enviando alerta de leads bajos: {exc}")
