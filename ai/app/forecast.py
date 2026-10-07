"""Scoring, event aggregation and the single recommended action.

The numbers follow docs/API_CONTRACT.md §2.2 exactly; the risk bands follow §2.3.
Reasons are generated from the actual feature values of the rows being scored,
in plain language, and never name a raw feature (§4.3.1, §4.4.1).
"""

import json
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path
from typing import Any, Protocol

import numpy as np

from .features import FEATURE_COLUMNS, encode, encode_uplift
from .schemas import AttendanceInput, ForecastRequest

ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"
MODEL_PATH = ARTIFACTS / "model.json"
FEATURE_COLUMNS_PATH = ARTIFACTS / "feature_columns.json"
METRICS_PATH = ARTIFACTS / "metrics.json"
UPLIFT_TREATED_PATH = ARTIFACTS / "uplift_treated.json"
UPLIFT_CONTROL_PATH = ARTIFACTS / "uplift_control.json"
UPLIFT_METRICS_PATH = ARTIFACTS / "uplift_metrics.json"

PERSUADABLE_UPLIFT = 0.15

DHAKA = timezone(timedelta(hours=6))
REMINDER_HOUR_DHAKA = 20

DISCLAIMER = (
    "Model trained and validated exclusively on synthetic data generated for the "
    "UpayEvents hackathon demo. Predictions require controlled validation on real, "
    "governed, anonymized event data before any production use."
)
LIMITATIONS = [
    "No real-world validation has been performed.",
    "Performance may differ on real registration and payment behaviour.",
    "Predictions are advisory and must not be used to deny a registration.",
]


class Predictor(Protocol):
    model_version: str

    def predict(self, rows: list[AttendanceInput]) -> list[float]: ...


class ModelNotReady(Exception):
    """The model artifact is missing or failed to load."""


class XGBoostPredictor:
    """Loads `artifacts/model.json` with the native XGBoost Booster."""

    def __init__(self, model_path: Path = MODEL_PATH, metrics_path: Path = METRICS_PATH):
        import xgboost as xgb

        self._xgb = xgb
        columns = json.loads(FEATURE_COLUMNS_PATH.read_text())
        if tuple(columns) != FEATURE_COLUMNS:
            raise ModelNotReady("Feature columns do not match the encoder.")

        self._booster = xgb.Booster()
        self._booster.load_model(model_path)
        self.model_version: str = json.loads(metrics_path.read_text())["model_version"]

    def predict(self, rows: list[AttendanceInput]) -> list[float]:
        if not rows:
            return []
        matrix = self._xgb.DMatrix(
            encode(row.model_dump() for row in rows), missing=np.nan
        )
        return [float(p) for p in self._booster.predict(matrix)]


class UpliftEstimator(Protocol):
    def predict(self, rows: list[AttendanceInput]) -> list[float]: ...


class XGBoostUplift:
    """Two-model T-learner: P(attend | reminded) - P(attend | not reminded)."""

    def __init__(self, treated_path: Path = UPLIFT_TREATED_PATH, control_path: Path = UPLIFT_CONTROL_PATH):
        import xgboost as xgb

        self._xgb = xgb
        self._treated = xgb.Booster()
        self._treated.load_model(treated_path)
        self._control = xgb.Booster()
        self._control.load_model(control_path)

    def predict(self, rows: list[AttendanceInput]) -> list[float]:
        if not rows:
            return []
        matrix = self._xgb.DMatrix(
            encode_uplift(row.model_dump() for row in rows), missing=np.nan
        )
        treated = self._treated.predict(matrix)
        control = self._control.predict(matrix)
        return [float(t - c) for t, c in zip(treated, control)]


def load_model_info() -> dict[str, Any]:
    info = json.loads(METRICS_PATH.read_text())
    info.update(
        {
            "fallback_model_available": False,
            "fallback_model_type": None,
            "data_source": "synthetic",
            "disclaimer": DISCLAIMER,
            "limitations": LIMITATIONS,
        }
    )
    if UPLIFT_METRICS_PATH.exists():
        info["uplift_model"] = json.loads(UPLIFT_METRICS_PATH.read_text())
    return info


# --------------------------------------------------------------------------
# Rounding (§2.2)
# --------------------------------------------------------------------------


def round_half_up(value: float, places: int) -> float:
    quantum = Decimal(1).scaleb(-places)
    return float(Decimal(repr(value)).quantize(quantum, rounding=ROUND_HALF_UP))


def probability(value: float) -> float:
    return round_half_up(min(1.0, max(0.0, value)), 4)


def risk_band(p: float) -> str:
    if p >= 0.70:
        return "low"
    if p >= 0.40:
        return "medium"
    return "high"


def iso_utc(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")


def as_utc(moment: datetime | None, default_tz: timezone = timezone.utc) -> datetime:
    if moment is None:
        return datetime.now(timezone.utc).replace(microsecond=0)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=default_tz)
    return moment.astimezone(timezone.utc)


# --------------------------------------------------------------------------
# Per-registration reasons
# --------------------------------------------------------------------------


def _hours(value: float) -> str:
    if value < 1:
        minutes = round(value * 60)
        return f"{minutes} minute{'s' if minutes != 1 else ''}"
    rounded = round(value, 1)
    text = f"{rounded:g}"
    return f"{text} hour{'s' if rounded != 1 else ''}"


def registration_reasons(row: AttendanceInput, p: float) -> list[str]:
    """2–5 reasons, those pushing in the predicted direction first."""
    candidates: list[tuple[int, str]] = []  # (+1 attends, -1 no-show, text)

    days = row.days_before_event_registered
    if days == 0:
        candidates.append((-1, "Registered on the event day itself"))
    elif days > 14:
        candidates.append((-1, f"Registered {days} days early; very early registrants often forget to attend"))
    else:
        candidates.append((1, f"Registered {days} day{'s' if days != 1 else ''} before the event, a reliable window"))

    delay = row.payment_delay_hours
    if delay is None:
        candidates.append((-1, "Payment has not been completed yet"))
    elif delay > 24:
        candidates.append((-1, f"Payment took {_hours(delay)} to complete after registering"))
    elif delay == 0:
        candidates.append((1, "Paid immediately at registration"))
    else:
        candidates.append((1, f"Payment completed {_hours(delay)} after registering"))

    reminder = {
        "none": (-1, "No confirmation reminder has been sent"),
        "sent": (-1, "A reminder was sent but has not been opened"),
        "opened": (1, "The reminder was opened, though attendance is not yet confirmed"),
        "confirmed": (1, "Confirmed attendance after the reminder"),
    }[row.reminder_status]
    candidates.append(reminder)

    prior = row.prior_attendance_count
    if prior == 0:
        candidates.append((-1, "No prior attendance history (synthetic) for this registrant"))
    elif prior >= 5:
        candidates.append((1, f"Attended {prior} previous events (synthetic history)"))
    else:
        candidates.append((1, f"Attended {prior} previous event{'s' if prior != 1 else ''} (synthetic history)"))

    if row.location_type == "online":
        candidates.append((-1, "Online events see more drop-off than in-person events"))
    if row.ticket_price_taka == 0:
        candidates.append((-1, "Free ticket, so there is no payment commitment"))
    if row.event_day_of_week in (5, 6):
        candidates.append((1, "Event falls on the Friday-Saturday weekend"))
    if row.is_cancelled:
        candidates.insert(0, (-1, "The registration was cancelled"))

    direction = 1 if p >= 0.5 else -1
    ordered = [text for sign, text in candidates if sign == direction] + [
        text for sign, text in candidates if sign != direction
    ]
    return ordered[:3]


# --------------------------------------------------------------------------
# Event forecast
# --------------------------------------------------------------------------


@dataclass
class Scored:
    row: AttendanceInput
    p: float


@dataclass
class ReminderLift:
    extra_attendees: float
    persuadable: int


def score(predictor: Predictor, rows: list[AttendanceInput]) -> list[Scored]:
    return [Scored(row, probability(p)) for row, p in zip(rows, predictor.predict(rows))]


def _percent(ratio: float) -> str:
    return f"{round_half_up(ratio * 100, 1):g}%"


def _next_reminder_time(as_of: datetime, event_start: datetime) -> datetime:
    local = as_of.astimezone(DHAKA)
    candidate = local.replace(hour=REMINDER_HOUR_DHAKA, minute=0, second=0, microsecond=0)
    if candidate <= local:
        candidate += timedelta(days=1)
    latest = event_start - timedelta(hours=2)
    if candidate > latest:
        candidate = max(local + timedelta(minutes=30), min(latest, candidate))
    return candidate.astimezone(timezone.utc)


def _confidence(probabilities: list[float]) -> float:
    """How settled the estimate is: cohort size times probability decisiveness.

    Not an accuracy claim (§4.4.1); model performance lives in /model-info.
    """
    if not probabilities:
        return 0.0
    n = len(probabilities)
    decisiveness = float(np.mean([abs(p - 0.5) * 2 for p in probabilities]))
    size_factor = n / (n + 10)
    return round_half_up(size_factor * (0.5 + 0.5 * decisiveness), 4)


def _confidence_label(confidence: float) -> str:
    if confidence >= 0.70:
        return "high"
    if confidence >= 0.45:
        return "medium"
    return "low"


def build_forecast(
    request: ForecastRequest,
    predictor: Predictor,
    generated_at: datetime | None = None,
    uplift: UpliftEstimator | None = None,
) -> tuple[dict[str, Any], list[float]]:
    """The contract forecast body, and the per-registration probabilities behind it."""
    as_of = as_utc(request.as_of)
    event_start = as_utc(request.event_date_time, default_tz=DHAKA)
    capacity = request.event_capacity

    active = [row for row in request.registrations if not row.is_cancelled]
    scored = score(predictor, active)
    probabilities = [item.p for item in scored]

    paid = len(active)
    predicted_attendance = round_half_up(sum(probabilities), 2)
    predicted_no_shows = int(round_half_up(paid - predicted_attendance, 0))
    no_show_rate = 0.0 if paid == 0 else round_half_up(1 - predicted_attendance / paid, 4)
    baseline_waitlist = max(0, math.floor(capacity - predicted_attendance))

    confidence = _confidence(probabilities)
    at_risk = sum(1 for p in probabilities if risk_band(p) != "low")
    unreminded = sum(1 for row in active if row.reminder_status == "none")
    unconfirmed = sum(1 for row in active if row.reminder_status != "confirmed")
    late_payers = sum(
        1 for row in active if row.payment_delay_hours is not None and row.payment_delay_hours > 24
    )
    days_to_event = (event_start - as_of).total_seconds() / 86400
    event_upcoming = days_to_event > 0

    reminder_lift: ReminderLift | None = None
    unreminded_rows = [row for row in active if row.reminder_status == "none"]
    if uplift is not None and unreminded_rows:
        lifts = uplift.predict(unreminded_rows)
        reminder_lift = ReminderLift(
            extra_attendees=max(0.0, sum(lifts)),
            persuadable=sum(1 for lift in lifts if lift >= PERSUADABLE_UPLIFT),
        )

    reasons = _event_reasons(
        paid=paid,
        capacity=capacity,
        at_risk=at_risk,
        unconfirmed=unconfirmed,
        unreminded=unreminded,
        late_payers=late_payers,
        no_show_rate=no_show_rate,
    )

    recommendation, waitlist = _recommend(
        paid=paid,
        capacity=capacity,
        predicted_attendance=predicted_attendance,
        predicted_no_shows=predicted_no_shows,
        no_show_rate=no_show_rate,
        baseline_waitlist=baseline_waitlist,
        unreminded=unreminded,
        event_upcoming=event_upcoming,
        days_to_event=days_to_event,
        reminder_at=_next_reminder_time(as_of, event_start) if event_upcoming else None,
        reminder_lift=reminder_lift,
    )

    return {
        "event_id": request.event_id,
        "model_version": predictor.model_version,
        "generated_at": iso_utc(generated_at or datetime.now(timezone.utc)),
        "as_of": iso_utc(as_of),
        "synthetic_data_only": True,
        "event_capacity": capacity,
        "paid_registrations": paid,
        "predicted_attendance": predicted_attendance,
        "predicted_no_shows": predicted_no_shows,
        "no_show_rate": no_show_rate,
        "recommended_waitlist": max(0, min(capacity, waitlist)),
        "confidence": confidence,
        "confidence_label": _confidence_label(confidence),
        "top_reasons": reasons,
        "recommendation": recommendation,
    }, probabilities


def _event_reasons(
    *,
    paid: int,
    capacity: int,
    at_risk: int,
    unconfirmed: int,
    unreminded: int,
    late_payers: int,
    no_show_rate: float,
) -> list[str]:
    if paid == 0:
        return [
            f"No paid registrations yet against a capacity of {capacity} seats",
            "The forecast will sharpen as attendees complete payment",
        ]

    reasons: list[str] = []
    if capacity > 0:
        fill = paid / capacity
        if fill >= 0.9:
            reasons.append(f"{paid} paid registrations fill {_percent(fill)} of the {capacity}-seat capacity")
        else:
            reasons.append(
                f"{paid} paid registrations against {capacity} seats, so the event is {_percent(1 - fill)} below capacity"
            )
    else:
        reasons.append(f"{paid} paid registrations for an event with no declared capacity")

    reasons.append(f"{_percent(at_risk / paid)} of paid registrations carry medium or high no-show risk")

    if unreminded:
        reasons.append(f"{unreminded} of {paid} paid registrants have not received any reminder")
    elif unconfirmed:
        reasons.append(f"{unconfirmed} of {paid} paid registrants have not confirmed attendance")
    else:
        reasons.append("Every paid registrant has confirmed attendance")

    if late_payers:
        reasons.append(f"{late_payers} registrants paid more than 24 hours after registering, a strong no-show signal")

    reasons.append(f"Predicted no-show rate is {_percent(no_show_rate)}")
    return reasons[:5]


def _recommend(
    *,
    paid: int,
    capacity: int,
    predicted_attendance: float,
    predicted_no_shows: int,
    no_show_rate: float,
    baseline_waitlist: int,
    unreminded: int,
    event_upcoming: bool,
    days_to_event: float,
    reminder_at: datetime | None,
    reminder_lift: ReminderLift | None = None,
) -> tuple[dict[str, Any], int]:
    attending = round(predicted_attendance)

    def action(
        action_type: str,
        headline: str,
        detail: str,
        rationale: str,
        *,
        send_at: datetime | None = None,
        catering: int | None = None,
    ) -> dict[str, Any]:
        return {
            "action_type": action_type,
            "headline": headline,
            "detail": detail,
            "rationale": rationale,
            "suggested_send_at": iso_utc(send_at) if send_at else None,
            "catering_headcount": catering,
        }

    if paid == 0:
        if event_upcoming and reminder_at:
            return (
                action(
                    "target_segment",
                    "Promote the event to students interested in this category",
                    f"No paid registrations yet for {capacity} seats. Send a targeted announcement to interested student clubs.",
                    "With no paid registrants there is nothing to forecast yet; demand generation is the only useful lever.",
                    send_at=reminder_at,
                ),
                0,
            )
        return (
            action(
                "no_action",
                "No paid registrations to forecast yet",
                "The forecast will appear once attendees complete payment.",
                "There are no paid registrations, so no attendance signal exists.",
            ),
            0,
        )

    if capacity > 0 and predicted_attendance >= 0.95 * capacity:
        return (
            action(
                "increase_capacity",
                "Demand exceeds capacity; add seats or a second session",
                f"About {attending} of {capacity} seats are expected to be filled even after no-shows.",
                f"The predicted no-show rate of {_percent(no_show_rate)} is too low to free meaningful capacity.",
            ),
            0,
        )

    if event_upcoming and reminder_at and unreminded / paid >= 0.3:
        detail = f"{unreminded} of {paid} paid registrants have not been reminded. Ask them to confirm attendance."
        rationale = (
            "Registrants without a reminder are the largest group of predicted no-shows; "
            "confirmation is the strongest attendance signal in the model."
        )
        if reminder_lift is not None:
            extra = round_half_up(reminder_lift.extra_attendees, 1)
            persuadable = reminder_lift.persuadable
            if persuadable == unreminded:
                targeting = f"all {unreminded} are likely to respond to it."
            elif persuadable == 0:
                targeting = "none of them is strongly persuadable, so expect a modest effect."
            else:
                targeting = f"start with the {persuadable} most likely to change their plans."
            detail += (
                f" The uplift model expects about {extra:g} more attendees if all of them are reminded; {targeting}"
            )
            rationale += (
                " The uplift model estimates how much a reminder changes each registrant's attendance, "
                "so reminders go to people they actually persuade."
            )
        return (
            action(
                "send_reminder",
                "Send a confirmation reminder tonight",
                detail,
                rationale,
                send_at=reminder_at,
            ),
            min(baseline_waitlist, predicted_no_shows),
        )

    if paid >= 100 and no_show_rate >= 0.2:
        return (
            action(
                "adjust_catering",
                f"Plan catering for {math.ceil(predicted_attendance)} attendees, not {paid}",
                f"Predicted attendance is {attending} of {paid} paid registrations.",
                f"A predicted no-show rate of {_percent(no_show_rate)} means ordering for every registration would waste food and budget.",
                catering=math.ceil(predicted_attendance),
            ),
            min(baseline_waitlist, predicted_no_shows),
        )

    if no_show_rate >= 0.25 and baseline_waitlist > 0:
        return (
            action(
                "open_waitlist",
                f"Open {baseline_waitlist} waitlist slots",
                f"Predicted attendance is {attending} of {capacity} seats. Releasing {baseline_waitlist} more seats covers the forecast gap.",
                f"No-show risk is elevated across the paid cohort ({_percent(no_show_rate)}), so opening capacity now is unlikely to overshoot true turnout.",
            ),
            baseline_waitlist,
        )

    if event_upcoming and reminder_at and capacity > 0 and paid < 0.5 * capacity and days_to_event >= 3:
        return (
            action(
                "target_segment",
                "Registration is slow; target interested student clubs",
                f"Only {paid} of {capacity} seats are paid. Send a targeted announcement to boost registrations.",
                "Turnout among current registrants looks healthy, so the gap is demand, not no-shows.",
                send_at=reminder_at,
            ),
            0,
        )

    return (
        action(
            "no_action",
            "Forecast looks healthy, no action needed",
            f"Predicted attendance is {attending} of {paid} paid registrations.",
            f"The predicted no-show rate of {_percent(no_show_rate)} is low and registration timing is healthy, so no intervention is warranted.",
        ),
        0,
    )
