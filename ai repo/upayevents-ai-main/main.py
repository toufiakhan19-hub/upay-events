
import json
import joblib
import pandas as pd
import numpy as np

from typing import Optional
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# --------------------------------------------------
# 1. Load trained model and feature columns
# --------------------------------------------------

model = joblib.load("model.pkl")

with open("feature_columns.json", "r") as file:
    feature_columns = json.load(file)


# --------------------------------------------------
# 2. Create FastAPI app and configure CORS
# --------------------------------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# 3. Define Pydantic input models
# --------------------------------------------------

class AttendanceInput(BaseModel):
    registration_id: str
    event_id: str
    event_category: str
    ticket_price_taka: int
    days_before_event_registered: int
    payment_delay_hours: Optional[float] = None
    event_day_of_week: int
    event_start_hour: int
    location_type: str
    reminder_status: str
    prior_attendance_count: int
    is_cancelled: bool


class EventForecastRequest(BaseModel):
    event_id: str
    event_capacity: int
    event_date_time: str
    as_of: str
    registrations: list[AttendanceInput]


# --------------------------------------------------
# 4. Event-level attendance forecast endpoint
# --------------------------------------------------

@app.post("/predict/forecast")
def predict_forecast(request: EventForecastRequest):

    # Define the exact 10 predictive features.
    # IDs are correlation keys only and are excluded.
    predictive_features = [
        "event_category",
        "ticket_price_taka",
        "days_before_event_registered",
        "payment_delay_hours",
        "event_day_of_week",
        "event_start_hour",
        "location_type",
        "reminder_status",
        "prior_attendance_count",
        "is_cancelled"
    ]

    # Convert registrations into dictionaries
    registration_records = [
        registration.model_dump()
        for registration in request.registrations
    ]

    # Build a DataFrame containing ONLY predictive features
    records = [
        {
            feature: registration[feature]
            for feature in predictive_features
        }
        for registration in registration_records
    ]

    input_df = pd.DataFrame(
        records,
        columns=predictive_features
    )

    # Fill missing payment delays with -1
    input_df["payment_delay_hours"] = (
        input_df["payment_delay_hours"].fillna(-1)
    )

    # Convert cancellation flags to integer values (0/1)
    input_df["is_cancelled"] = (
        input_df["is_cancelled"].astype(int)
    )

    # One-hot encode categorical columns
    categorical_columns = [
        "event_category",
        "location_type",
        "reminder_status"
    ]

    input_df = pd.get_dummies(
        input_df,
        columns=categorical_columns,
        dtype=int
    )

    # Align with the feature columns used during training
    input_df = input_df.reindex(
        columns=feature_columns,
        fill_value=0
    )

    # Predict attendance probabilities for every registration
    if len(input_df) > 0:
        probabilities = model.predict_proba(input_df)[:, 1]
    else:
        probabilities = np.array([], dtype=float)

    # --------------------------------------------------
    # 5. Calculate event-level metrics
    # --------------------------------------------------

    paid_registrations = len(request.registrations)

    predicted_attendance = int(round(float(probabilities.sum())))

    predicted_no_shows = (
        paid_registrations - predicted_attendance
    )

    if paid_registrations > 0:
        no_show_rate = round(
            predicted_no_shows / paid_registrations,
            3
        )
    else:
        no_show_rate = 0

    recommended_waitlist = max(
        0,
        request.event_capacity - predicted_attendance
    )

    # Confidence: 1 minus the standard deviation of probabilities
    if len(probabilities) > 0:
        confidence = round(
            float(np.clip(
                1.0 - np.std(probabilities),
                0.0,
                1.0
            )),
            3
        )
    else:
        confidence = 0.0

    if confidence >= 0.75:
        confidence_label = "High"
    elif confidence >= 0.5:
        confidence_label = "Medium"
    else:
        confidence_label = "Low"

    # --------------------------------------------------
    # 6. Get top 3 globally important features
    # --------------------------------------------------

    importances = model.feature_importances_

    top_indices = np.argsort(importances)[::-1][:3]

    top_reasons = [
        feature_columns[index]
        for index in top_indices
    ]

    # --------------------------------------------------
    # 7. Generate exactly one recommendation
    # --------------------------------------------------

    if no_show_rate > 0.3:
        recommendation = (
            "Send a confirmation reminder to all paid registrants tonight."
        )

    elif recommended_waitlist > 0:
        recommendation = (
            f"Open {recommended_waitlist} waitlist slots."
        )

    elif predicted_attendance >= request.event_capacity * 0.95:
        recommendation = (
            "Event is near capacity — stop promotion."
        )

    else:
        recommendation = (
            "Attendance looks healthy — continue current plan."
        )

    # --------------------------------------------------
    # 8. Build response in the exact requested field order
    # --------------------------------------------------

    response = {
        "event_id": request.event_id,
        "model_version": "xgboost-v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "as_of": request.as_of,
        "synthetic_data_only": True,
        "event_capacity": request.event_capacity,
        "paid_registrations": paid_registrations,
        "predicted_attendance": predicted_attendance,
        "predicted_no_shows": predicted_no_shows,
        "no_show_rate": no_show_rate,
        "recommended_waitlist": recommended_waitlist,
        "confidence": confidence,
        "confidence_label": confidence_label,
        "top_reasons": top_reasons,
        "recommendation": recommendation
    }

    return response


# --------------------------------------------------
# 9. Health check endpoint
# --------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}
