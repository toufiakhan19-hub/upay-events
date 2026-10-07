"""UpayEvents AI service (docs/API_CONTRACT.md v1.0).

Stateless: no database, no personal data, server-to-server only.

    uvicorn app.main:app --app-dir ai --port 8000
"""

import json
import logging
import secrets
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .forecast import (
    Predictor,
    UpliftEstimator,
    XGBoostPredictor,
    XGBoostUplift,
    as_utc,
    build_forecast,
    iso_utc,
    load_model_info,
    registration_reasons,
    risk_band,
    score,
)
from .schemas import PROHIBITED_FIELDS, AttendanceRequest, ForecastRequest

SERVICE_VERSION = "1.0.0"
CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

logger = logging.getLogger("upay-ai")
monitor = logging.getLogger("upay-ai.monitor")
if not monitor.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(message)s"))
    monitor.addHandler(_handler)
    monitor.setLevel(logging.INFO)
    monitor.propagate = False

app = FastAPI(title="UpayEvents AI service", version=SERVICE_VERSION)

STARTED_AT = time.monotonic()
_predictor: Predictor | None = None
_uplift: UpliftEstimator | None = None


def _load() -> None:
    global _predictor, _uplift
    try:
        _predictor = XGBoostPredictor()
    except Exception as error:  # noqa: BLE001 - any load failure means "not ready"
        _predictor = None
        logger.error("model failed to load: %s", error)
    try:
        _uplift = XGBoostUplift()
    except Exception as error:  # noqa: BLE001 - forecasts still work without uplift
        _uplift = None
        logger.warning("uplift model failed to load: %s", error)


_load()


def set_predictor(predictor: Predictor | None) -> None:
    """Swap the model, used by tests to stub probabilities."""
    global _predictor
    _predictor = predictor


def set_uplift(uplift: UpliftEstimator | None) -> None:
    global _uplift
    _uplift = uplift


def log_prediction(endpoint: str, started: float, probabilities: list[float], **extra: Any) -> None:
    """One JSON line per prediction: aggregate statistics only, never row data.

    These lines are the input to drift and accuracy monitoring (README §12).
    """
    n = len(probabilities)
    record: dict[str, Any] = {
        "event": "prediction",
        "endpoint": endpoint,
        "model_version": _predictor.model_version if _predictor else None,
        "rows": n,
        "mean_probability": round(sum(probabilities) / n, 4) if n else None,
        "high_risk_share": round(sum(1 for p in probabilities if risk_band(p) == "high") / n, 4) if n else None,
        "latency_ms": round((time.perf_counter() - started) * 1000, 1),
        "time": iso_utc(_now()),
    }
    record.update(extra)
    monitor.info(json.dumps(record))


def new_request_id() -> str:
    value = (int(time.time() * 1000) << 80) | secrets.randbits(80)
    return "".join(CROCKFORD[(value >> shift) & 31] for shift in range(125, -1, -5))


def error_response(
    status: int, code: str, message: str, details: list[dict[str, str]] | None = None
) -> JSONResponse:
    request_id = new_request_id()
    if status >= 500:
        logger.warning("ai error %s %s request_id=%s", status, code, request_id)
    return JSONResponse(
        status_code=status,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details,
                "request_id": request_id,
            }
        },
    )


def _field_path(location: tuple[Any, ...]) -> str:
    path = ""
    for part in location:
        if part == "body":
            continue
        if isinstance(part, int):
            path += f"[{part}]"
        else:
            path += f".{part}" if path else str(part)
    return path or "body"


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    details = []
    for error in exc.errors():
        field = _field_path(tuple(error.get("loc", ())))
        name = field.rsplit(".", 1)[-1]
        if error.get("type") == "extra_forbidden" and name in PROHIBITED_FIELDS:
            issue = "Prohibited field: personal or financial data is not accepted."
        elif error.get("type") == "extra_forbidden":
            issue = "Unknown field."
        else:
            issue = str(error.get("msg", "Invalid value."))
        details.append({"field": field, "issue": issue})
    return error_response(422, "VALIDATION_ERROR", "Request failed schema validation.", details)


@app.exception_handler(StarletteHTTPException)
async def http_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    if exc.status_code == 404:
        return error_response(404, "NOT_FOUND", "Unknown route.")
    if exc.status_code == 405:
        return error_response(404, "NOT_FOUND", "Method not allowed on this route.")
    return error_response(500, "INTERNAL_ERROR", "Unexpected error.")


@app.exception_handler(Exception)
async def unhandled_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled error", exc_info=exc)
    return error_response(500, "INTERNAL_ERROR", "The AI service hit an unexpected error.")


def _model_not_ready() -> JSONResponse:
    return error_response(
        503,
        "MODEL_NOT_READY",
        "No-show model artifact failed to load. The service is running but cannot serve predictions.",
        [{"field": "model_artifact", "issue": "Expected serialized model at ai/artifacts/model.json"}],
    )


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


@app.get("/health")
def health() -> JSONResponse:
    loaded = _predictor is not None
    body = {
        "status": "ok" if loaded else "degraded",
        "model_loaded": loaded,
        "model_version": _predictor.model_version if _predictor else None,
        "service_version": SERVICE_VERSION,
        "uptime_seconds": int(time.monotonic() - STARTED_AT),
        "time": iso_utc(_now()),
    }
    return JSONResponse(status_code=200 if loaded else 503, content=body)


@app.get("/model-info")
def model_info() -> JSONResponse:
    if _predictor is None:
        return _model_not_ready()
    try:
        return JSONResponse(content=load_model_info())
    except (OSError, ValueError, KeyError):
        return _model_not_ready()


@app.post("/predict/attendance")
def predict_attendance(request: AttendanceRequest) -> JSONResponse:
    if _predictor is None:
        return _model_not_ready()

    started = time.perf_counter()
    as_of = as_utc(request.as_of)
    scored = score(_predictor, request.registrations)
    predictions = [
        {
            "registration_id": item.row.registration_id,
            "attendance_probability": item.p,
            "no_show_risk": risk_band(item.p),
            "top_reasons": registration_reasons(item.row, item.p),
        }
        for item in scored
    ]
    log_prediction("/predict/attendance", started, [item.p for item in scored])
    return JSONResponse(
        content={
            "model_version": _predictor.model_version,
            "generated_at": iso_utc(_now()),
            "as_of": iso_utc(as_of),
            "synthetic_data_only": True,
            "count": len(predictions),
            "predictions": predictions,
        }
    )


@app.post("/predict/forecast")
def predict_forecast(request: ForecastRequest) -> JSONResponse:
    mismatched = [
        {
            "field": f"registrations[{index}].event_id",
            "issue": "Must equal the top-level event_id.",
        }
        for index, row in enumerate(request.registrations)
        if row.event_id != request.event_id
    ]
    if mismatched:
        return error_response(422, "VALIDATION_ERROR", "Request failed schema validation.", mismatched)

    if _predictor is None:
        return _model_not_ready()

    started = time.perf_counter()
    forecast, probabilities = build_forecast(request, _predictor, uplift=_uplift)
    log_prediction(
        "/predict/forecast",
        started,
        probabilities,
        event_id=request.event_id,
        paid_registrations=forecast["paid_registrations"],
        predicted_attendance=forecast["predicted_attendance"],
        no_show_rate=forecast["no_show_rate"],
        action_type=forecast["recommendation"]["action_type"],
    )
    return JSONResponse(content=forecast)
