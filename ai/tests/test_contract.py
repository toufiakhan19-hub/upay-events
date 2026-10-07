"""Contract tests for docs/API_CONTRACT.md v1.0.

Run from the repository root:

    python -m pytest ai/tests
"""

import re
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import main  # noqa: E402
from app.forecast import XGBoostPredictor, XGBoostUplift  # noqa: E402
from app.schemas import AttendanceInput  # noqa: E402

EVENT_ID = "01JQ8W1A2B3C4D5E6F7G8H9J0KM"

RAW_FEATURE_NAMES = (
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

# Example B (contract §6): reminder, days, delay, prior, location, probability.
# The contract lists probabilities that sum to 5.81 while stating a sum of 7.00;
# the last four are raised so the sum really is 7.00 and the stated outputs hold.
EXAMPLE_B = [
    ("sent", 12, 0.5, 2, "campus", 0.93),
    ("opened", 2, 71.5, 0, "campus", 0.31),
    ("none", 0, 0.0, 1, "campus", 0.19),
    ("confirmed", 9, 1.2, 4, "campus", 0.79),
    ("confirmed", 15, 0.0, 5, "campus", 0.74),
    ("sent", 5, 3.0, 1, "campus", 0.66),
    ("sent", 7, 12.0, 2, "city", 0.61),
    ("opened", 3, 48.0, 0, "campus", 0.55),
    ("none", 1, 96.0, 0, "campus", 0.62),
    ("sent", 6, 6.0, 1, "online", 0.61),
    ("confirmed", 21, 0.0, 3, "campus", 0.49),
    ("opened", 4, 24.0, 1, "city", 0.50),
]


def registration(index: int, **overrides):
    reminder, days, delay, prior, location, _ = EXAMPLE_B[index % len(EXAMPLE_B)]
    row = {
        "registration_id": f"01JQ8W7XK9M4N2P8Q3R6T5V{index:03d}",
        "event_id": EVENT_ID,
        "event_category": "hackathon",
        "ticket_price_taka": 300,
        "days_before_event_registered": days,
        "payment_delay_hours": delay,
        "event_day_of_week": 6,
        "event_start_hour": 9,
        "location_type": location,
        "reminder_status": reminder,
        "prior_attendance_count": prior,
        "is_cancelled": False,
    }
    row.update(overrides)
    return row


def forecast_body(rows, capacity=20):
    return {
        "event_id": EVENT_ID,
        "event_capacity": capacity,
        "event_date_time": "2026-03-14T09:00:00+06:00",
        "as_of": "2026-03-10T09:00:00Z",
        "registrations": rows,
    }


class FixedPredictor:
    model_version = "test-fixed"

    def __init__(self, probabilities):
        self._by_id = probabilities

    def predict(self, rows):
        return [self._by_id[row.registration_id] for row in rows]


@pytest.fixture
def client():
    return TestClient(main.app)


@pytest.fixture
def real_model():
    predictor = XGBoostPredictor()
    main.set_predictor(predictor)
    yield predictor


@pytest.fixture
def example_b_model():
    rows = [registration(i) for i in range(len(EXAMPLE_B))]
    predictor = FixedPredictor(
        {row["registration_id"]: EXAMPLE_B[i][5] for i, row in enumerate(rows)}
    )
    main.set_predictor(predictor)
    yield rows
    main.set_predictor(XGBoostPredictor())


def assert_app_validator_accepts(body, capacity, paid):
    """The checks src/server/ai/validate.ts applies before persisting."""
    assert body["event_id"] == EVENT_ID
    assert body["synthetic_data_only"] is True
    assert body["event_capacity"] == capacity
    assert body["paid_registrations"] == paid
    assert 0 <= body["predicted_attendance"] <= paid
    assert isinstance(body["predicted_no_shows"], int)
    assert 0 <= body["no_show_rate"] <= 1
    assert isinstance(body["recommended_waitlist"], int)
    assert 0 <= body["recommended_waitlist"] <= capacity
    assert 0 <= body["confidence"] <= 1
    assert body["confidence_label"] in ("low", "medium", "high")

    reasons = body["top_reasons"]
    assert 2 <= len(reasons) <= 5
    for reason in reasons:
        assert reason.strip() and len(reason) <= 400
        for feature in RAW_FEATURE_NAMES:
            assert not re.search(rf"(^|[^a-z0-9_]){feature}([^a-z0-9_]|$)", reason, re.I)

    rec = body["recommendation"]
    assert rec["action_type"] in (
        "open_waitlist",
        "send_reminder",
        "adjust_catering",
        "target_segment",
        "increase_capacity",
        "no_action",
    )
    for field in ("headline", "detail", "rationale"):
        assert rec[field].strip() and len(rec[field]) <= 600
    if rec["action_type"] in ("send_reminder", "target_segment"):
        assert rec["suggested_send_at"]
    else:
        assert rec["suggested_send_at"] is None
    if rec["action_type"] == "adjust_catering":
        assert isinstance(rec["catering_headcount"], int)
    else:
        assert rec["catering_headcount"] is None


def test_example_b_arithmetic(client, example_b_model):
    response = client.post("/predict/forecast", json=forecast_body(example_b_model))

    assert response.status_code == 200
    body = response.json()
    assert body["paid_registrations"] == 12
    assert body["predicted_attendance"] == 7.0
    assert body["predicted_no_shows"] == 5
    assert body["no_show_rate"] == 0.4167
    assert body["recommended_waitlist"] == 13
    assert body["recommendation"]["action_type"] == "open_waitlist"
    assert body["recommendation"]["headline"] == "Open 13 waitlist slots"
    assert_app_validator_accepts(body, capacity=20, paid=12)


def test_cancelled_rows_are_excluded(client, example_b_model):
    rows = example_b_model + [registration(99, is_cancelled=True)]
    main.set_predictor(
        FixedPredictor(
            {**{row["registration_id"]: EXAMPLE_B[i][5] for i, row in enumerate(example_b_model)},
             rows[-1]["registration_id"]: 0.5}
        )
    )
    body = client.post("/predict/forecast", json=forecast_body(rows)).json()

    assert body["paid_registrations"] == 12
    assert body["predicted_attendance"] == 7.0


def test_empty_cohort_returns_zeroed_forecast(client, real_model):
    response = client.post("/predict/forecast", json=forecast_body([], capacity=30))

    assert response.status_code == 200
    body = response.json()
    assert body["paid_registrations"] == 0
    assert body["predicted_attendance"] == 0
    assert body["predicted_no_shows"] == 0
    assert body["no_show_rate"] == 0
    assert body["recommended_waitlist"] == 0
    assert_app_validator_accepts(body, capacity=30, paid=0)


def test_prohibited_field_is_rejected_with_envelope(client, real_model):
    rows = [registration(0, phone="01712345678")]
    response = client.post("/predict/forecast", json=forecast_body(rows))

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["details"][0]["field"] == "registrations[0].phone"
    assert "Prohibited" in error["details"][0]["issue"]
    assert re.fullmatch(r"[0-9A-HJKMNP-TV-Z]{26}", error["request_id"])


def test_event_id_mismatch_is_rejected(client, real_model):
    rows = [registration(0), registration(1, event_id="SOME-OTHER-EVENT")]
    response = client.post("/predict/forecast", json=forecast_body(rows))

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "registrations[1].event_id"


def test_null_payment_delay_is_handled(client, real_model):
    rows = [registration(0, payment_delay_hours=None)]

    forecast = client.post("/predict/forecast", json=forecast_body(rows))
    attendance = client.post(
        "/predict/attendance", json={"as_of": "2026-03-10T09:00:00Z", "registrations": rows}
    )

    assert forecast.status_code == 200
    assert attendance.status_code == 200
    prediction = attendance.json()["predictions"][0]
    assert "Payment has not been completed yet" in prediction["top_reasons"]


@pytest.mark.parametrize("capacity,count", [(20, 12), (30, 6), (500, 3), (120, 118), (400, 250)])
def test_real_model_output_passes_app_validator(client, real_model, capacity, count):
    rows = [registration(i) for i in range(count)]
    response = client.post("/predict/forecast", json=forecast_body(rows, capacity=capacity))

    assert response.status_code == 200
    assert_app_validator_accepts(response.json(), capacity=capacity, paid=count)


def test_attendance_predictions_follow_risk_bands(client, real_model):
    rows = [registration(i) for i in range(len(EXAMPLE_B))]
    body = client.post(
        "/predict/attendance", json={"as_of": "2026-03-10T09:00:00Z", "registrations": rows}
    ).json()

    assert body["count"] == len(rows)
    for row, prediction in zip(rows, body["predictions"]):
        assert prediction["registration_id"] == row["registration_id"]
        p = prediction["attendance_probability"]
        expected = "low" if p >= 0.7 else "medium" if p >= 0.4 else "high"
        assert prediction["no_show_risk"] == expected
        assert 2 <= len(prediction["top_reasons"]) <= 5


def test_health_and_model_info(client, real_model):
    health = client.get("/health").json()
    info = client.get("/model-info").json()

    assert health["status"] == "ok" and health["model_loaded"] is True
    assert info["model_version"] == health["model_version"]
    assert info["data_source"] == "synthetic"
    assert info["meets_roc_auc_target"] == (info["metrics"]["roc_auc"] >= 0.75)
    assert "registration_id" not in info["features"]
    assert "event_id" not in info["features"]


def test_uplift_model_ranks_persuadable_registrants_first():
    uplift = XGBoostUplift()
    forgetful_first_timer = AttendanceInput(
        **registration(0, days_before_event_registered=25, prior_attendance_count=0, location_type="online")
    )
    loyal_regular = AttendanceInput(
        **registration(1, days_before_event_registered=5, prior_attendance_count=8, location_type="campus")
    )

    persuadable, regular = uplift.predict([forgetful_first_timer, loyal_regular])

    assert persuadable > regular
    assert persuadable > 0.15


def test_reminder_recommendation_uses_uplift(client, real_model):
    rows = [registration(i, reminder_status="none", days_before_event_registered=20) for i in range(10)]

    with_uplift = client.post("/predict/forecast", json=forecast_body(rows)).json()
    main.set_uplift(None)
    try:
        without_uplift = client.post("/predict/forecast", json=forecast_body(rows)).json()
    finally:
        main.set_uplift(XGBoostUplift())

    assert with_uplift["recommendation"]["action_type"] == "send_reminder"
    assert "uplift model expects about" in with_uplift["recommendation"]["detail"]
    assert "uplift" not in without_uplift["recommendation"]["detail"]
    assert_app_validator_accepts(with_uplift, capacity=20, paid=10)


def test_model_info_reports_uplift_validation(client, real_model):
    uplift = client.get("/model-info").json()["uplift_model"]
    metrics = uplift["metrics"]

    assert uplift["data_source"].startswith("synthetic")
    assert metrics["qini_coefficient"] > 0
    assert metrics["auuc"] > metrics["auuc_random"]
    assert "reminder_status=none" not in uplift["features"]


def test_unknown_route_uses_envelope(client):
    response = client.get("/nope")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
