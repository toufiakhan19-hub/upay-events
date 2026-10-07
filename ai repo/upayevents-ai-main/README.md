

# UpayEvents Insight — AI Service

> **AI-powered no-show prediction for student event organizers.**
> Built for **AI Dev Fest 2026** · Organized by DIU CPC · Sponsored by Upay

![Status](https://img.shields.io/badge/status-working-brightgreen)
![ROC-AUC](https://img.shields.io/badge/ROC--AUC-0.7820-blue)
![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![FastAPI](https://img.shields.io/badge/API-FastAPI-009688)
![License](https://img.shields.io/badge/license-hackathon-lightgrey)

---

## What Is This?

UpayEvents Insight is an **upay-linked event registration platform** for student events — hackathons, workshops, cultural programs, and career fairs. Organizers accept event payments through upay, issue secure QR tickets, and get AI-powered forecasts of **who will actually show up**.

This repository contains the **AI service**: a trained XGBoost model that predicts no-shows, exposed through a FastAPI endpoint that the organizer dashboard calls.

---

## The Problem

Event organizers in Bangladesh know how many people **register** — but not how many will **attend**. This causes:

- Empty seats and poor event atmosphere
- Wasted food, T-shirts, venue capacity, and sponsor budget
- Late or ineffective promotion
- Manual ticket checking and duplicate-ticket risk
- Fragmented registration and payment experiences

Event organizers can be treated as **upay merchants**. Better prediction means better planning, less waste, and more successful events.

---

## The Solution

Given a paid registration's details, the AI returns:

- **`attendance_probability`** — the likelihood the registrant will check in
- **`no_show_risk`** — Low, Medium, or High
- **`top_reasons`** — the three features that most influenced the prediction

The organizer dashboard aggregates these probabilities across all registrations to forecast **total expected attendance**, then recommends actions like:

> *"Open 30 waitlist slots and send a confirmation reminder tonight."*

---

## Track Alignment

| Field | Value |
|---|---|
| **Primary Track** | Merchant & Agent Intelligence |
| **Secondary Tracks** | Growth & Campaign Intelligence · Trust & Risk Intelligence |
| **Why it fits** | Treats organizers as upay merchants, uses AI for demand forecasting and operational recommendations, and increases legitimate upay transaction volume |

---

## Features

- **Synthetic data generator** — 2,000 realistic event registration rows with injected behavioral patterns
- **XGBoost classifier** — trained, evaluated, and saved with joblib
- **ROC-AUC 0.7820** — validated on a held-out synthetic test set, above the 0.75 target
- **FastAPI `/predict/forecast` endpoint** — returns probability, risk level, and top reasons
- **Health check `/health`** — for uptime monitoring
- **Explainable output** — every prediction includes feature-based reasons
- **Privacy-first** — no real customer, wallet, or financial data used at any point

---

## Technology Stack

| Layer | Tools |
|---|---|
| Data | Python, pandas, numpy |
| ML Model | XGBoost, scikit-learn |
| Serialization | joblib |
| API | FastAPI, uvicorn, pydantic |
| Feature Encoding | pandas `get_dummies` |

---

## Requirements

- **Python 3.10 or higher**
- **pip** (bundled with Python)
- ~200 MB free disk space
- No GPU required

---

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/sadika-dotcom/upayevents-ai.git
cd upayevents-ai
```

### 2. Create a virtual environment (recommended)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install pandas numpy scikit-learn xgboost joblib fastapi uvicorn pydantic
```

### 4. Generate the synthetic dataset

```bash
python generate_data.py
```

Output: `synthetic_data.csv` — 2,000 rows of registrations with realistic patterns. Roughly a 53 / 47 no-show / check-in split.

### 5. Train the model

```bash
python train_model.py
```

Output:
- `model.pkl` — trained XGBoost model
- `feature_columns.json` — the feature column list used for inference

Expected terminal output:

```
Dataset shape: (2000, 11)
Number of features: 18
ROC-AUC: 0.7820
Top 5 Feature Importances:
is_cancelled                    0.264
reminder_status_confirmed       0.184
reminder_status_opened          0.143
days_before_event_registered    0.039
prior_attendance_count          0.036
Model saved to model.pkl
Feature columns saved to feature_columns.json
```

---

## Environment Variables

**None required.** This service uses only synthetic data generated locally. No API keys, secrets, or credentials are needed.

---

## Run and Build Commands

### Run the API locally

```bash
uvicorn main:app --reload
```

The API will be available at:

```
http://127.0.0.1:8000
```

### Live Deployment URL

_Not yet deployed. This service runs locally for the hackathon demo. The organizer dashboard connects to `http://127.0.0.1:8000`._

---

## API Reference

### `POST /predict/forecast`

Predict attendance probability for a single paid registrant.

**Request body:**

```json
{
  "registration_id": "REG-001",
  "event_id": "EVT-100",
  "event_category": "hackathon",
  "ticket_price_taka": 300,
  "days_before_event_registered": 12,
  "payment_delay_hours": 2.5,
  "event_day_of_week": 5,
  "event_start_hour": 18,
  "location_type": "campus",
  "reminder_status": "sent",
  "prior_attendance_count": 0,
  "is_cancelled": false
}
```

**Field descriptions:**

| Field | Type | Notes |
|---|---|---|
| `registration_id` | string | Correlation key only — **not** used as a model feature |
| `event_id` | string | Correlation key only — **not** used as a model feature |
| `event_category` | string | `hackathon`, `workshop`, `cultural`, `career_fair` |
| `ticket_price_taka` | int | `0`, `100`, `300` |
| `days_before_event_registered` | int | `1` to `30` |
| `payment_delay_hours` | float or null | Nullable — missing values are filled with `-1` |
| `event_day_of_week` | int | `0` (Monday) to `6` (Sunday) |
| `event_start_hour` | int | `8` to `22` |
| `location_type` | string | `campus`, `city_venue`, `online` |
| `reminder_status` | string | `not_sent`, `sent`, `opened`, `confirmed` |
| `prior_attendance_count` | int | `0` to `10` |
| `is_cancelled` | bool | `true` if the registration was cancelled |

**Response:**

```json
{
  "registration_id": "REG-001",
  "event_id": "EVT-100",
  "attendance_probability": 0.5482,
  "no_show_risk": "Medium",
  "top_reasons": [
    "is_cancelled",
    "reminder_status_confirmed",
    "reminder_status_opened"
  ]
}
```

**Risk levels:**

| Level | Condition |
|---|---|
| `Low` | probability > 0.7 |
| `Medium` | 0.4 < probability ≤ 0.7 |
| `High` | probability ≤ 0.4 |

### `GET /health`

Returns `{"status": "ok"}` when the service is running.

---

## Testing Instructions

### Test the API interactively

1. Start the server:
   ```bash
   uvicorn main:app --reload
   ```
2. Open in your browser:
   ```
   http://127.0.0.1:8000/docs
   ```
3. Click **`/predict/forecast`** → **Try it out**
4. Paste the example JSON above
5. Click **Execute**

You should see a 200 response with `attendance_probability`, `no_show_risk`, and `top_reasons`.

### Verify the health endpoint

Open in your browser:

```
http://127.0.0.1:8000/health
```

Expected response: `{"status": "ok"}`

### Test the model independently

```bash
python train_model.py
```

Confirm the printed ROC-AUC is above 0.75.

---

## Project Structure

```
upayevents-ai/
├── generate_data.py       # Synthetic data generator (2000 rows)
├── train_model.py         # XGBoost training and evaluation
├── main.py                # FastAPI service with /predict/forecast and /health
├── synthetic_data.csv     # Generated dataset (output)
├── model.pkl              # Trained model (output)
├── feature_columns.json   # Feature columns for inference alignment
└── README.md              # This file
```

---

## Responsible AI Notes

- All data used during the hackathon is **synthetic**. No real customer, wallet, or financial data is used.
- The service does **not** infer financial status or use wallet balances.
- Every prediction is **explainable** — the `top_reasons` field shows which features drove the result.
- The model outputs a **probability**, not a decision. Organizers decide what action to take.
- High-impact decisions must remain subject to **human oversight**.
- No autonomous denial of registration occurs based on any risk score.

---

## Related Repositories

- **Frontend + Organizer Dashboard:** _[Builder will link her repo here]_

---

## Team

| Role | Name | Responsibility |
|---|---|---|
| Builder | Toufia | Frontend, dashboard, AI integration |
| Designer | Nahin | UI/UX design, project report, video |
| Researcher (AI Service) | Sadika | synthetic data, XGBoost model, FastAPI service |

---

## Hackathon Context

- **Event:** AI Dev Fest 2026
- **Organizer:** DIU Computer and Programming Club (DIU-CPC), Department of CSE, Daffodil International University
- **Sponsor:** Upay (UCB Fintech)
- **Format:** 72-hour initial development + on-site update phase
- **Primary Track:** Merchant & Agent Intelligence

---

## License

Built for the AI Dev Fest 2026 hackathon. Code is open for review and educational purposes.
```

