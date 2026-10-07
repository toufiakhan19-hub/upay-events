"""Feature encoding shared by training and inference.

Training (`ai/train/train_model.py`) and the API (`ai/app/forecast.py`) both call
`encode`, so the column order the model was fitted on is the column order it is
scored on. The ten predictive features are fixed by docs/API_CONTRACT.md §4.3.1;
`registration_id` and `event_id` are correlation keys and never reach the model.
"""

from collections.abc import Iterable, Mapping
from typing import Any

import numpy as np

EVENT_CATEGORIES = (
    "hackathon",
    "workshop",
    "cultural",
    "career_fair",
    "conference",
    "sports",
    "other",
)
LOCATION_TYPES = ("campus", "city", "online")
REMINDER_STATUSES = ("none", "sent", "opened", "confirmed")

PREDICTIVE_FEATURES = (
    "event_category",
    "ticket_price_taka",
    "days_before_event_registered",
    "payment_delay_hours",
    "event_day_of_week",
    "event_start_hour",
    "location_type",
    "reminder_status",
    "prior_attendance_count",
    "is_cancelled",
)

NUMERIC_COLUMNS = (
    "ticket_price_taka",
    "days_before_event_registered",
    "payment_delay_hours",
    "event_day_of_week",
    "event_start_hour",
    "prior_attendance_count",
    "is_cancelled",
)

ONE_HOT = (
    ("event_category", EVENT_CATEGORIES),
    ("location_type", LOCATION_TYPES),
    ("reminder_status", REMINDER_STATUSES),
)

FEATURE_COLUMNS: tuple[str, ...] = NUMERIC_COLUMNS + tuple(
    f"{name}={value}" for name, values in ONE_HOT for value in values
)

# The uplift model estimates the effect of sending a reminder, so the reminder
# itself is the treatment, not a feature. Cancelled registrations are never
# reminded and are excluded before scoring.
UPLIFT_NUMERIC_COLUMNS = tuple(c for c in NUMERIC_COLUMNS if c != "is_cancelled")
UPLIFT_ONE_HOT = tuple((name, values) for name, values in ONE_HOT if name != "reminder_status")
UPLIFT_COLUMNS: tuple[str, ...] = UPLIFT_NUMERIC_COLUMNS + tuple(
    f"{name}={value}" for name, values in UPLIFT_ONE_HOT for value in values
)


def _is_missing(value: Any) -> bool:
    return value is None or (isinstance(value, float) and np.isnan(value))


def _encode(
    rows: Iterable[Mapping[str, Any]],
    numeric: tuple[str, ...],
    one_hot: tuple[tuple[str, tuple[str, ...]], ...],
    width: int,
) -> np.ndarray:
    encoded: list[list[float]] = []

    for row in rows:
        vector: list[float] = []

        for column in numeric:
            value = row[column]
            vector.append(np.nan if _is_missing(value) else float(value))

        for name, values in one_hot:
            vector.extend(1.0 if row[name] == value else 0.0 for value in values)

        encoded.append(vector)

    return np.asarray(encoded, dtype=np.float32).reshape(-1, width)


def encode(rows: Iterable[Mapping[str, Any]]) -> np.ndarray:
    """Encode rows into the no-show model matrix.

    A null `payment_delay_hours` (payment not yet successful) is encoded as NaN,
    which XGBoost treats as an explicit "missing" branch rather than as 0 hours.
    """
    return _encode(rows, NUMERIC_COLUMNS, ONE_HOT, len(FEATURE_COLUMNS))


def encode_uplift(rows: Iterable[Mapping[str, Any]]) -> np.ndarray:
    """Encode rows into the uplift model matrix (no reminder, no cancellation)."""
    return _encode(rows, UPLIFT_NUMERIC_COLUMNS, UPLIFT_ONE_HOT, len(UPLIFT_COLUMNS))


def feature_of_column(column: str) -> str:
    """Map an encoded column back to the contract feature it came from."""
    return column.split("=", 1)[0]
