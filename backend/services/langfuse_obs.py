"""Langfuse observability helper for LeadUp.

Centraliza inicializacion del cliente Langfuse y proporciona un helper
para registrar llamadas Anthropic sin reescribir cada call site.

Modo no-op si LANGFUSE_PUBLIC_KEY no esta seteado (dev local sin obs).
"""
from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_client = None
_enabled = False


def _init() -> None:
    global _client, _enabled
    if _client is not None:
        return
    pk = os.getenv("LANGFUSE_PUBLIC_KEY")
    sk = os.getenv("LANGFUSE_SECRET_KEY")
    host = os.getenv("LANGFUSE_HOST", "http://langfuse-web:3000")
    if not pk or not sk:
        logger.info("Langfuse disabled (missing LANGFUSE_PUBLIC_KEY/SECRET_KEY)")
        _enabled = False
        return
    try:
        from langfuse import Langfuse
        _client = Langfuse(public_key=pk, secret_key=sk, host=host)
        _enabled = True
        logger.info(f"Langfuse enabled, host={host}")
    except Exception as exc:
        logger.warning(f"Langfuse init failed: {exc}")
        _enabled = False


def track_anthropic_call(
    *,
    name: str,
    model: str,
    messages: list[dict[str, Any]],
    response: Any,
    metadata: dict[str, Any] | None = None,
    user_id: str | None = None,
) -> None:
    """Register an Anthropic messages.create call in Langfuse.

    No-op if Langfuse is disabled or fails. Never raises.
    """
    _init()
    if not _enabled or _client is None:
        return
    try:
        usage = getattr(response, "usage", None)
        output_text = ""
        if hasattr(response, "content") and response.content:
            first = response.content[0]
            output_text = getattr(first, "text", "") or str(first)

        trace = _client.trace(name=name, user_id=user_id, metadata=metadata or {})
        trace.generation(
            name=name,
            model=model,
            input=messages,
            output=output_text,
            usage={
                "input": getattr(usage, "input_tokens", 0) if usage else 0,
                "output": getattr(usage, "output_tokens", 0) if usage else 0,
                "unit": "TOKENS",
            },
            metadata=metadata or {},
        )
    except Exception as exc:
        logger.debug(f"Langfuse tracking failed (non-fatal): {exc}")


def flush() -> None:
    """Flush pending events. Call before app shutdown."""
    if _client is not None:
        try:
            _client.flush()
        except Exception:
            pass
