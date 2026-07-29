import logging

import httpx

from app.core.config import settings


logger = logging.getLogger(__name__)


def send_n8n_event(
    event: str,
    employee_email: str,
    employee_name: str,
    document_name: str,
    reason: str | None = None
) -> bool:

    webhook_url = settings.n8n_document_webhook_url

    if not webhook_url:
        logger.warning("n8n webhook URL is not configured")
        return False

    payload = {
        "event": event,
        "employee_email": employee_email,
        "employee_name": employee_name,
        "document_name": document_name,
        "reason": reason
    }

    try:
        response = httpx.post(
            webhook_url,
            json=payload,
            timeout=5.0
        )

        response.raise_for_status()

        logger.info(
            "n8n event sent successfully: %s",
            event
        )

        return True

    except httpx.HTTPError as exc:
        logger.error(
            "Failed to send n8n event: %s",
            exc
        )

        return False