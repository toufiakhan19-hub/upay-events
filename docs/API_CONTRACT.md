# UpayEvents AI Service — API Contract

**Status:** Frozen v1.0 — awaiting sign-off
**Contract owner:** Application owner (`src/server/ai/client.ts`)
**Implementor:** AI/ML owner (`ai/`)
**Related:** `docs/PRD.md` §9 (AI design), §11 (technical architecture), §14 (responsible AI)

---

## 1. Purpose and scope

This document is the **sole interface** between the UpayEvents Next.js application and the Python FastAPI AI service.

It defines:

- The four endpoints the application may call.
- The exact JSON shape of every request and response.
- Field names, types, units, nullability, enum values, and rounding rules.
- The error envelope for every failure mode.
- Worked examples that both sides use as test fixtures.

### 1.1 What this contract deliberately does NOT cover

The AI service is **stateless and has no database access**. Specifically, the AI service MUST NOT:

- Connect to, query, or migrate the application database.
- Receive user PII (name, phone number, email, interests).
- Receive upay account references, wallet balances, or transaction history.
- Receive any authentication or session credential from the end user.
- Make decisions that gate a user-facing flow (payment, ticketing, check-in).

The application converts database rows into the feature payloads defined here. The AI service receives ready features and returns numbers. This boundary means either side can be rewritten, stubbed, or replaced without the other changing.

### 1.2 Prohibited input fields (enforced, PRD §14)

The following MUST be rejected with `422 VALIDATION_ERROR` if present in any request. If FastAPI/Pydantic is configured to ignore unknown fields, this must be changed to `extra="forbid"`.

| Field | Reason |
|---|---|
| `user_name`, `name` | Direct PII |
| `phone`, `phone_number`, `email` | Direct PII |
| `wallet_balance`, `balance`, `spending`, `transaction_history` | Financial profiling — explicitly forbidden by PRD §14 |
| `contacts`, `friend_list` | PII |
| `location_history`, `gps_history`, `home_address` | Private location data |
| `credit_score`, `income`, `financial_status` | Financial inference — explicitly forbidden by PRD §14 |

The model MUST NOT infer or accept any proxy for these. Features are limited to the nine declared in PRD §9.2 plus the correlation identifiers in §4.3.1.

---

## 2. Conventions

| Aspect | Rule |
|---|---|
| **Base URL** | `http://127.0.0.1:8000` in development. Configured in the app via `AI_SERVICE_URL`. |
| **Transport** | HTTP/1.1, JSON over the wire. |
| **Content-Type** | `application/json; charset=utf-8` on all requests and responses. |
| **Auth** | None for v1.0. Local network / localhost only. See §9 for the v2 plan. |
| **Field naming** | `snake_case` in JSON. The TypeScript client maps to `camelCase`. |
| **Identifiers** | ULID strings, 26 characters, Crockford base32 (uppercase `0-9A-HJKMNP-TV-Z`). Example: `01JQ8W7XK9M4N2P8Q3R6T5V1ZC`. |
| **Timestamps (request/response metadata)** | ISO 8601, UTC, trailing `Z`, second precision. Example: `2026-03-10T09:00:00Z`. |
| **Timestamps (event date/time)** | ISO 8601 with explicit offset. Bangladesh local time is `+06:00`. Example: `2026-03-14T09:00:00+06:00`. |
| **Day of week** | ISO 8601 integer, `1` = Monday … `7` = Sunday. (Python: `date.isoweekday()`. **Not** `weekday()`.) |
| **Money** | Integer BDT (Bangladeshi Taka). Smallest unit = 1 Taka. Never a float, never poisha. |
| **Probabilities and rates** | JSON number, floating point, clamped to `[0.0, 1.0]`, **4 decimal places**. |
| **Counts** | JSON integer. Predicted attendance is `2` decimal places; predicted no-shows is a rounded integer. |
| **Empty / absent** | `null` means *explicitly not applicable*. Omitted means *use the default*. The two are not interchangeable. |
| **Unknown fields** | Rejected. See §1.2. |
| **CORS** | Not required. The AI service is called server-to-server only, never from the browser. |

### 2.1 Units reference

| Quantity | Unit | Example | Notes |
|---|---|---|---|
| `ticket_price_taka` | BDT (integer) | `300` | `0` = free event |
| `days_before_event_registered` | days (integer) | `12` | `0` = registered on event day |
| `payment_delay_hours` | hours (float) | `0.5` | `null` = payment not yet successful |
| `event_start_hour` | hour of day, `0`–`23` | `9` | Asia/Dhaka local time |
| `prior_attendance_count` | count of prior events (integer) | `3` | Synthetic historical count only |
| `attendance_probability` | probability `0.0`–`1.0` | `0.9300` | P(attend) |
| `no_show_rate` | ratio `0.0`–`1.0` | `0.4167` | Share of paid registrations predicted to miss |
| `predicted_attendance` | people (2 dp) | `7.0` | Sum of individual probabilities |
| `recommended_waitlist` | seats (integer) | `13` | Additional seats the organizer should open |

### 2.2 Rounding and derivation rules (normative)

These are **not** suggestions. Both implementations must produce identical values for identical inputs.

```
predicted_attendance  = round(sum(attendance_probability for each row), 2)
predicted_no_shows   = round(paid_registrations - predicted_attendance, 0)      # half-up
no_show_rate         = 0.0        if paid_registrations == 0
                     = round(1 - (predicted_attendance / paid_registrations), 4)  otherwise
recommended_waitlist = max(0, floor(event_capacity - predicted_attendance))     # baseline
```

`recommended_waitlist` is the **baseline** gap. The recommendation rules MAY reduce it (for example, capping additional capacity at 10% of `event_capacity`), but MUST satisfy:

```
0 <= recommended_waitlist <= event_capacity
```

### 2.3 Risk band thresholds (normative)

Derived from `attendance_probability`. The app MUST NOT recompute these; it displays the band the AI service returns.

| `no_show_risk` | Condition |
|---|---|
| `low` | `attendance_probability >= 0.70` |
| `medium` | `0.40 <= attendance_probability < 0.70` |
| `high` | `attendance_probability < 0.40` |

---

## 3. Endpoint summary

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET` | `/health` | Liveness and model-load readiness | None |
| `GET` | `/model-info` | Model version, features, evaluation metrics, disclosure | None |
| `POST` | `/predict/attendance` | Per-registration no-show probability (batch) | None |
| `POST` | `/predict/forecast` | Event-level attendance forecast and one recommended action | None |

| Requirement | Target | Where enforced |
|---|---|---|
| Recommendation latency (PRD §9.4) | < 3000 ms | AI service |
| No-show model ROC-AUC (PRD §9.4) | >= 0.75 | AI service, reported in `/model-info` |
| Batch size | <= 2000 rows per request | Both sides |
| Idempotency | Same input → same output | AI service (no hidden state, no per-request training) |

---

## 4. Endpoint definitions

### 4.1 `GET /health`

Liveness probe. The application calls this at startup and before the first forecast of a demo session. Must not require the model to be loaded — it must answer even when the model failed to load, so the app can distinguish "process down" from "model down".

**Request:** none.

**Response `200`:**

```json
{
  "status": "ok",
  "model_loaded": true,
  "model_version": "no-show-xgb-2026.03.1",
  "service_version": "1.0.0",
  "uptime_seconds": 4312,
  "time": "2026-03-10T09:00:00Z"
}
```

**Response `503`** — process is up but the model failed to load:

```json
{
  "status": "degraded",
  "model_loaded": false,
  "model_version": null,
  "service_version": "1.0.0",
  "uptime_seconds": 12,
  "time": "2026-03-10T09:00:00Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `status` | enum | `ok` \| `degraded` |
| `model_loaded` | boolean | Whether the serialized model artifact is resident in memory |
| `model_version` | string \| null | `null` when `model_loaded` is `false` |
| `service_version` | string | Semver of the FastAPI service itself |
| `uptime_seconds` | integer | Seconds since process start |
| `time` | string | Server clock, ISO 8601 UTC |

**Application behaviour:** a non-200 or a `model_loaded: false` MUST NOT break any page. The dashboard serves the last cached forecast flagged `is_stale: true` (see §7.3).

---

### 4.2 `GET /model-info`

Model transparency payload. Powers the "Model transparency" panel on the organizer dashboard. This is a deliberate credibility feature for the pitch: the app displays the training metrics and the synthetic-data disclosure verbatim.

**Request:** none.

**Response `200`:**

```json
{
  "model_version": "no-show-xgb-2026.03.1",
  "model_family": "xgboost",
  "trained_at": "2026-03-08T11:20:00Z",
  "training_rows": 2480,
  "test_rows": 620,
  "metrics": {
    "roc_auc": 0.781,
    "precision": 0.744,
    "recall": 0.702,
    "accuracy": 0.731,
    "brier_score": 0.164,
    "positive_class": "attends"
  },
  "roc_auc_target": 0.75,
  "meets_roc_auc_target": true,
  "calibration": {
    "method": "isotonic",
    "ece": 0.048,
    "fitted_on": "validation_split"
  },
  "features": [
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
  ],
  "feature_importance": [
    { "feature": "days_before_event_registered", "importance": 0.241 },
    { "feature": "payment_delay_hours", "importance": 0.198 },
    { "feature": "reminder_status", "importance": 0.163 },
    { "feature": "ticket_price_taka", "importance": 0.121 },
    { "feature": "prior_attendance_count", "importance": 0.094 },
    { "feature": "event_category", "importance": 0.071 },
    { "feature": "location_type", "importance": 0.058 },
    { "feature": "event_start_hour", "importance": 0.031 },
    { "feature": "event_day_of_week", "importance": 0.016 },
    { "feature": "is_cancelled", "importance": 0.007 }
  ],
  "fallback_model_available": true,
  "fallback_model_type": "weighted_scoring",
  "data_source": "synthetic",
  "disclaimer": "Model trained and validated exclusively on synthetic data generated for the UpayEvents hackathon demo. Predictions require controlled validation on real, governed, anonymized event data before any production use.",
  "limitations": [
    "No real-world validation has been performed.",
    "Performance may differ on real registration and payment behaviour.",
    "Predictions are advisory and must not be used to deny a registration."
  ]
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `model_version` | string | No | Echoed in every prediction response |
| `model_family` | enum | No | `xgboost` \| `lightgbm` \| `random_forest` \| `weighted_scoring` |
| `trained_at` | string | No | ISO 8601 UTC |
| `training_rows` | integer | No | Synthetic training split size |
| `test_rows` | integer | No | Held-out synthetic test split size |
| `metrics.roc_auc` | number | No | **Required to be >= 0.75** for the MVP (PRD §9.4) |
| `metrics.positive_class` | enum | No | `attends` \| `no_show` — which class ROC-AUC refers to |
| `roc_auc_target` | number | No | Always `0.75` in v1.0 |
| `meets_roc_auc_target` | boolean | No | Honest self-report; the app displays it as-is |
| `calibration` | object | Yes | `null` if the model is uncalibrated |
| `features` | string[] | No | Ordered feature list; must match §4.3.1 |
| `feature_importance` | object[] | No | Sorted descending; `importance` normalised to sum to ~1.0 |
| `fallback_model_available` | boolean | No | Whether `weighted_scoring` fallback can be served |
| `data_source` | enum | No | Always `synthetic` in v1.0 |
| `disclaimer` | string | No | Rendered verbatim in the dashboard UI |
| `limitations` | string[] | No | Rendered verbatim in the dashboard UI |

**Honesty requirement:** `metrics.roc_auc` and `meets_roc_auc_target` MUST reflect the actual measured value on the held-out synthetic test set. The AI owner validates this claim (PRD §16). If the target is missed, report the real number — a missed target with an honest number is recoverable; a fabricated metric is not.

---

### 4.3 `POST /predict/attendance`

Per-registration no-show probability. This is the central prediction of the product (PRD §9.1): *"Will this paid registrant attend the event?"*

**One HTTP call per event, batched.** Never one call per registration.

#### 4.3.1 Request

**Path:** `/predict/attendance`
**Content-Type:** `application/json`

```json
{
  "as_of": "2026-03-10T09:00:00Z",
  "registrations": [
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZC",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 12,
      "payment_delay_hours": 0.5,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "sent",
      "prior_attendance_count": 2,
      "is_cancelled": false
    }
  ]
}
```

**Top-level fields:**

| Field | Type | Required | Nullable | Notes |
|---|---|---|---|---|
| `as_of` | string | No | No | ISO 8601 UTC. Evaluation instant for time-relative features. Defaults to server clock. **Always send it** — it makes responses deterministic and testable. |
| `registrations` | `AttendanceInput[]` | Yes | No | 1–2000 items. Order is preserved in the response. |

**`AttendanceInput` fields — the complete, closed set:**

| Field | Type | Required | Nullable | Unit | Constraints / Enum |
|---|---|---|---|---|---|
| `registration_id` | string | Yes | No | — | ULID. Echoed back. Correlation key only; never used as a feature. |
| `event_id` | string | Yes | No | — | ULID. Correlation/grouping key only; never used as a feature. |
| `event_category` | enum | Yes | No | — | `hackathon` \| `workshop` \| `cultural` \| `career_fair` \| `conference` \| `sports` \| `other` |
| `ticket_price_taka` | integer | Yes | No | BDT | `>= 0`. `0` = free event. |
| `days_before_event_registered` | integer | Yes | No | days | `>= 0`. `0` = registered on event day. |
| `payment_delay_hours` | number | **Yes** | **Yes** | hours | `>= 0.0`, `2` dp. `null` = payment not yet successful (registration still pending). The AI service MUST handle `null` explicitly — it is not the same as `0.0`. |
| `event_day_of_week` | integer | Yes | No | ISO weekday | `1` = Monday … `7` = Sunday |
| `event_start_hour` | integer | Yes | No | hour of day | `0`–`23`, Asia/Dhaka local time |
| `location_type` | enum | Yes | No | — | `campus` \| `city` \| `online` |
| `reminder_status` | enum | Yes | No | — | `none` \| `sent` \| `opened` \| `confirmed` |
| `prior_attendance_count` | integer | Yes | No | count | `>= 0`. **Synthetic historical count only.** Must not be derived from real user history in v1.0. |
| `is_cancelled` | boolean | Yes | No | — | `true` = registration cancelled (excluded from event totals) |

Exactly ten predictive features, matching PRD §9.2. `registration_id` and `event_id` are correlation keys and MUST NOT be fed to the model as features — doing so causes the model to memorise the demo dataset and produces meaningless feature importances.

**Responses `200`:**

```json
{
  "model_version": "no-show-xgb-2026.03.1",
  "generated_at": "2026-03-10T09:00:01Z",
  "as_of": "2026-03-10T09:00:00Z",
  "synthetic_data_only": true,
  "count": 3,
  "predictions": [
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZC",
      "attendance_probability": 0.93,
      "no_show_risk": "low",
      "top_reasons": [
        "Registered 12 days before the event, well ahead of the median for this category",
        "Payment completed 30 minutes after registration",
        "Confirmation reminder was sent and has not been marked as ignored"
      ]
    }
  ]
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `model_version` | string | No | Must match `/model-info` |
| `generated_at` | string | No | ISO 8601 UTC, when the prediction was computed |
| `as_of` | string | No | Echo of the request `as_of`, or the server clock if defaulted |
| `synthetic_data_only` | boolean | No | Always `true` in v1.0. Required honesty field (PRD §14). |
| `count` | integer | No | MUST equal `predictions.length` |
| `predictions` | `AttendanceOutput[]` | No | Same length and order as request `registrations` |

**`AttendanceOutput` fields:**

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `registration_id` | string | No | Echo of the request value |
| `attendance_probability` | number | No | `0.0`–`1.0`, 4 dp. `P(attend)`. |
| `no_show_risk` | enum | No | `low` \| `medium` \| `high`. Derived per §2.3. |
| `top_reasons` | string[] | No | **2–5 items**, ordered by contribution descending. Plain-language, organizer-readable, no jargon or raw feature names. Each reason is grounded in a model feature contribution. |

**LLM boundary (normative, PRD §9.3):** the LLM MAY rewrite these reasons into friendlier prose. It MUST NOT produce, alter, or influence `attendance_probability`. The number is produced by the ML model and is final before any LLM call. If an LLM is unavailable, the service MUST still return a valid response using the raw reason strings.

---

### 4.4 `POST /predict/forecast`

Event-level aggregation and the single recommended action. Per PRD §9.3, `predicted_attendance` is the sum of individual attendance probabilities.

**Path:** `/predict/forecast`
**Content-Type:** `application/json`

#### 4.4.1 Request

```json
{
  "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
  "event_capacity": 20,
  "event_date_time": "2026-03-14T09:00:00+06:00",
  "as_of": "2026-03-10T09:00:00Z",
  "registrations": [
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZC",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 12,
      "payment_delay_hours": 0.5,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "sent",
      "prior_attendance_count": 2,
      "is_cancelled": false
    }
  ]
}
```

| Field | Type | Required | Nullable | Notes |
|---|---|---|---|---|
| `event_id` | ULID string | Yes | No | Echoed in the response |
| `event_capacity` | integer | Yes | No | `>= 0`. Required — the waitlist recommendation is a function of capacity. |
| `event_date_time` | string | Yes | No | ISO 8601 with offset, Asia/Dhaka. Used for "days until event" rules. |
| `as_of` | string | No | No | Same semantics as §4.3.1. Rules such as "send reminder tonight" depend on it. |
| `registrations` | `AttendanceInput[]` | Yes | No | **Paid registrations only.** 0–2000 items. Each item's `event_id` MUST equal the top-level `event_id`. |

**Request rules:**

- The application sends **paid, non-cancelled** registrations. Cancelled rows MAY be included with `is_cancelled: true`, in which case the service MUST exclude them from all totals.
- All rows MUST share the top-level `event_id`. Mismatched rows → `422 VALIDATION_ERROR`.
- An **empty** `registrations` array is valid and returns a zeroed forecast. It is not an error.

**Response `200`:**

```json
{
  "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
  "model_version": "no-show-xgb-2026.03.1",
  "generated_at": "2026-03-10T09:00:01Z",
  "as_of": "2026-03-10T09:00:00Z",
  "synthetic_data_only": true,
  "event_capacity": 20,
  "paid_registrations": 12,
  "predicted_attendance": 7.0,
  "predicted_no_shows": 5,
  "no_show_rate": 0.4167,
  "recommended_waitlist": 13,
  "confidence": 0.62,
  "confidence_label": "medium",
  "top_reasons": [
    "Registration volume is 40% below capacity, so the event is likely to run below full",
    "41.7% of paid registrations carry medium or high no-show risk",
    "Late registrants show a 2.3x higher historical no-show rate in this category"
  ],
  "recommendation": {
    "action_type": "open_waitlist",
    "headline": "Open 13 waitlist slots",
    "detail": "Predicted attendance is 7 of 20 seats. Opening 13 additional seats covers the forecast gap without over-committing catering.",
    "rationale": "No-show risk is elevated across the paid cohort, so releasing capacity now is unlikely to overshoot the true turnout.",
    "suggested_send_at": null,
    "catering_headcount": 7
  }
}
```

**`ForecastOutput` fields:**

| Field | Type | Nullable | Unit | Notes |
|---|---|---|---|---|
| `event_id` | string | No | — | Echo |
| `model_version` | string | No | — | Must match `/model-info` |
| `generated_at` | string | No | — | ISO 8601 UTC |
| `as_of` | string | No | — | Echo of request `as_of` |
| `synthetic_data_only` | boolean | No | — | Always `true` in v1.0 |
| `event_capacity` | integer | No | seats | Echo of request value |
| `paid_registrations` | integer | No | people | Count of non-cancelled paid registrations |
| `predicted_attendance` | number | No | people, 2 dp | `Σ attendance_probability`, per §2.2 |
| `predicted_no_shows` | integer | No | people | `round(paid_registrations − predicted_attendance)` |
| `no_show_rate` | number | No | ratio `0.0`–`1.0`, 4 dp | Per §2.2 |
| `recommended_waitlist` | integer | No | seats, `>= 0` | Baseline gap per §2.2, optionally reduced by rules. `<= event_capacity`. |
| `confidence` | number | No | `0.0`–`1.0`, 4 dp | See warning below. |
| `confidence_label` | enum | No | — | `low` \| `medium` \| `high` |
| `top_reasons` | string[] | No | — | 2–5 strings, event-level, descending contribution |
| `recommendation` | object | No | — | See below. Exactly **one** action per forecast (PRD §7, §9). |

**`confidence` warning:** `confidence` expresses how much the *forecast estimate itself* can be trusted, derived from cohort size and probability dispersion. It is **not** an accuracy claim and **not** a probability of correctness. The application displays it as a qualitative `confidence_label` and MUST NOT present it as model performance. Model performance lives in `/model-info.metrics`.

**`recommendation` object:**

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `action_type` | enum | No | `open_waitlist` \| `send_reminder` \| `adjust_catering` \| `target_segment` \| `increase_capacity` \| `no_action` |
| `headline` | string | No | One short imperative sentence. Max ~80 chars. Displayed as the primary recommendation. |
| `detail` | string | No | 1–2 sentences of concrete guidance. May include numbers. |
| `rationale` | string | No | **Why** this action follows from the prediction. Must reference actual model signals. This is the "explain every important prediction" requirement (PRD §14). |
| `suggested_send_at` | string | No | ISO 8601 UTC. Non-null only for time-dependent actions (`send_reminder`, `target_segment`). `null` for immediate actions. |
| `catering_headcount` | integer | No | Suggested catering quantity. Non-null only for `adjust_catering`, otherwise `null`. |

**`action_type` semantics — exactly one MUST be returned:**

| Value | Meaning | PRD example |
|---|---|---|
| `open_waitlist` | Release additional seats | "Open 25 waitlist seats." |
| `send_reminder` | Trigger a confirmation reminder | "Send a confirmation reminder tonight." |
| `adjust_catering` | Reduce or increase catering order | "Plan catering for 210 attendees, not all 300 registrations." |
| `target_segment` | Target a specific interest segment | "Registration demand is slowing; target AI-club students with a reminder." |
| `increase_capacity` | Venue or slot capacity is the binding constraint | "Attendee demand exceeds capacity; add a second session." |
| `no_action` | Forecast is healthy; no intervention needed | "Forecast looks healthy — no action needed." |

---

## 5. Error format

All non-2xx responses use one envelope. **This includes validation errors.** FastAPI's default `{"detail": [...]}` shape MUST be overridden with an exception handler so the contract holds uniformly.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request failed schema validation.",
    "details": [
      {
        "field": "registrations[2].payment_delay_hours",
        "issue": "Value must be greater than or equal to 0."
      }
    ],
    "request_id": "01JQ8W9F3M5N7P9Q2R4T6V8X0Z"
  }
}
```

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `error.code` | enum | No | See table below |
| `error.message` | string | No | Human-readable, safe to log, **not** safe to show raw to end users |
| `error.details` | object[] | Yes | `null` when not applicable. Each entry has `field` (dotted/indexed path) and `issue`. |
| `error.request_id` | string | No | ULID. Echoed in the AI service's own logs. Include it in any bug report. |

| Code | HTTP | When | Client action |
|---|---|---|---|
| `VALIDATION_ERROR` | 422 | Schema violation, unknown field, prohibited field (§1.2), enum mismatch, out-of-range value, batch > 2000, `event_id` mismatch across rows | Fix the payload. Do not retry unchanged. |
| `MODEL_NOT_READY` | 503 | Model artifact missing, failed to load, or still warming up | Retry with backoff, then fall back to cached forecast (`is_stale: true`) |
| `TIMEOUT` | 504 | Inference exceeded the 3000 ms budget | Retry once, then serve cached forecast |
| `INTERNAL_ERROR` | 500 | Unhandled exception | Log with `request_id`, serve cached forecast, never surface to the user |
| `NOT_FOUND` | 404 | Unknown route | Bug in the app client |
| `RATE_LIMITED` | 429 | Too many concurrent inference requests | Back off and retry. **Not expected in v1.0** — the app batches one call per event. |

**Hard requirements on the AI service:**

- Never return a stack trace, file path, or Python exception name in `message`.
- Never return `200` with a partial or malformed body.
- Always include `request_id`.
- `5xx` responses MUST use the same envelope as `4xx`.

---

## 6. Worked examples

Example A (`/predict/attendance`) uses the first three rows of Example B (`/predict/forecast`), and their probabilities agree. **Both sides use these as regression fixtures** — if a change breaks either example, the change is wrong.

### Example A — `POST /predict/attendance`

**Request**

```http
POST /predict/attendance HTTP/1.1
Content-Type: application/json; charset=utf-8
```

```json
{
  "as_of": "2026-03-10T09:00:00Z",
  "registrations": [
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZC",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 12,
      "payment_delay_hours": 0.5,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "sent",
      "prior_attendance_count": 2,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZD",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 2,
      "payment_delay_hours": 71.5,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "opened",
      "prior_attendance_count": 0,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZE",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 0,
      "payment_delay_hours": 0.0,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "none",
      "prior_attendance_count": 1,
      "is_cancelled": false
    }
  ]
}
```

**Response `200`**

```json
{
  "model_version": "no-show-xgb-2026.03.1",
  "generated_at": "2026-03-10T09:00:01Z",
  "as_of": "2026-03-10T09:00:00Z",
  "synthetic_data_only": true,
  "count": 3,
  "predictions": [
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZC",
      "attendance_probability": 0.93,
      "no_show_risk": "low",
      "top_reasons": [
        "Registered 12 days before the event, well ahead of the median for hackathons",
        "Payment completed 30 minutes after registration with no delay",
        "Confirmation reminder was sent and has not been marked as ignored"
      ]
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZD",
      "attendance_probability": 0.31,
      "no_show_risk": "high",
      "top_reasons": [
        "Registered only 2 days before the event",
        "Payment took 71.5 hours to complete after registration",
        "No prior synthetic attendance history for this registrant"
      ]
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZE",
      "attendance_probability": 0.19,
      "no_show_risk": "high",
      "top_reasons": [
        "Registered on the event day itself",
        "No confirmation reminder was sent",
        "First-time attendee with no synthetic prior attendance history"
      ]
    }
  ]
}
```

Note the three distinct risk bands (`low`, `high`, `high`) per §2.3 thresholds: `0.93 >= 0.70` → low; `0.31 < 0.40` → high; `0.19 < 0.40` → high.

---

### Example B — `POST /predict/forecast` (12 paid registrations, capacity 20)

**Request**

```http
POST /predict/forecast HTTP/1.1
Content-Type: application/json; charset=utf-8
```

```json
{
  "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
  "event_capacity": 20,
  "event_date_time": "2026-03-14T09:00:00+06:00",
  "as_of": "2026-03-10T09:00:00Z",
  "registrations": [
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZC",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 12,
      "payment_delay_hours": 0.5,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "sent",
      "prior_attendance_count": 2,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZD",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 2,
      "payment_delay_hours": 71.5,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "opened",
      "prior_attendance_count": 0,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZE",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 0,
      "payment_delay_hours": 0.0,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "none",
      "prior_attendance_count": 1,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZF",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 9,
      "payment_delay_hours": 1.2,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "confirmed",
      "prior_attendance_count": 4,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZG",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 15,
      "payment_delay_hours": 0.0,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "confirmed",
      "prior_attendance_count": 5,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZH",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 5,
      "payment_delay_hours": 3.0,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "sent",
      "prior_attendance_count": 1,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZJ",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 7,
      "payment_delay_hours": 12.0,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "city",
      "reminder_status": "sent",
      "prior_attendance_count": 2,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZK",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 3,
      "payment_delay_hours": 48.0,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "opened",
      "prior_attendance_count": 0,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZL",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 1,
      "payment_delay_hours": 96.0,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "none",
      "prior_attendance_count": 0,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZM",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 6,
      "payment_delay_hours": 6.0,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "online",
      "reminder_status": "sent",
      "prior_attendance_count": 1,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZN",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 21,
      "payment_delay_hours": 0.0,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "campus",
      "reminder_status": "confirmed",
      "prior_attendance_count": 3,
      "is_cancelled": false
    },
    {
      "registration_id": "01JQ8W7XK9M4N2P8Q3R6T5V1ZP",
      "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
      "event_category": "hackathon",
      "ticket_price_taka": 300,
      "days_before_event_registered": 4,
      "payment_delay_hours": 24.0,
      "event_day_of_week": 6,
      "event_start_hour": 9,
      "location_type": "city",
      "reminder_status": "opened",
      "prior_attendance_count": 1,
      "is_cancelled": false
    }
  ]
}
```

**Response `200`**

```json
{
  "event_id": "01JQ8W1A2B3C4D5E6F7G8H9J0KM",
  "model_version": "no-show-xgb-2026.03.1",
  "generated_at": "2026-03-10T09:00:01Z",
  "as_of": "2026-03-10T09:00:00Z",
  "synthetic_data_only": true,
  "event_capacity": 20,
  "paid_registrations": 12,
  "predicted_attendance": 7.0,
  "predicted_no_shows": 5,
  "no_show_rate": 0.4167,
  "recommended_waitlist": 13,
  "confidence": 0.62,
  "confidence_label": "medium",
  "top_reasons": [
    "Registration volume is 40% below capacity, so the event is likely to run well under full",
    "41.7% of paid registrations carry medium or high no-show risk",
    "Registrants who paid more than 24 hours after registering show a 2.3x higher historical no-show rate in this category"
  ],
  "recommendation": {
    "action_type": "open_waitlist",
    "headline": "Open 13 waitlist slots",
    "detail": "Predicted attendance is 7 of 20 seats. Releasing 13 more seats covers the forecast gap without over-committing catering.",
    "rationale": "No-show risk is elevated across the paid cohort, so opening capacity now is unlikely to overshoot true turnout.",
    "suggested_send_at": null,
    "catering_headcount": null
  }
}
```

**Arithmetic check** (per §2.2) — the teammate should assert this in a unit test:

```
probabilities       0.93 0.31 0.19 0.79 0.74 0.66 0.61 0.55 0.42 0.31 0.19 0.11
sum                 = 7.00
predicted_attendance = round(7.00, 2)                      = 7.0
predicted_no_shows   = round(12 - 7.0, 0)                 = 5
no_show_rate         = round(1 - 7.0/12, 4)               = round(0.41666..., 4) = 0.4167
recommended_waitlist = max(0, floor(20 - 7.0))            = 13
constraint check     0 <= 13 <= 20                         OK
```

---

### Example C — `POST /predict/forecast` (healthy event → `no_action`)

A second forecast shape, showing the other recommendation branch. Six paid registrations, capacity 30, low no-show rate.

**Response `200`** (request body omitted for brevity; all rows are high-confidence early registrations with `reminder_status: "confirmed"`)

```json
{
  "event_id": "01JQ8W2B3C4D5E6F7G8H9J0K1MN",
  "model_version": "no-show-xgb-2026.03.1",
  "generated_at": "2026-03-10T09:00:02Z",
  "as_of": "2026-03-10T09:00:00Z",
  "synthetic_data_only": true,
  "event_capacity": 30,
  "paid_registrations": 6,
  "predicted_attendance": 5.4,
  "predicted_no_shows": 1,
  "no_show_rate": 0.1,
  "recommended_waitlist": 0,
  "confidence": 0.81,
  "confidence_label": "high",
  "top_reasons": [
    "Every paid registrant confirmed attendance after the reminder",
    "All registrations were completed more than 10 days before the event",
    "No-show rate of 10.0% is below the 22% historical average for workshops"
  ],
  "recommendation": {
    "action_type": "no_action",
    "headline": "Forecast looks healthy, no action needed",
    "detail": "Predicted attendance is 5 of 6 paid registrations with 24 seats still open.",
    "rationale": "Confirmation rates are high and registration timing is early, so no-show risk is low and no intervention is warranted.",
    "suggested_send_at": null,
    "catering_headcount": null
  }
}
```

Arithmetic: `sum = 5.40` → `predicted_no_shows = round(6 − 5.4) = 1`; `no_show_rate = round(1 − 5.4/6, 4) = round(0.1, 4) = 0.1`; `recommended_waitlist = max(0, floor(30 − 5.4)) = 24`, then **reduced to 0 by the rules** because no-show risk is low and there is no demand pressure. This demonstrates that `recommended_waitlist` is rule-adjusted, not a bare formula.

---

### Example D — `GET /model-info` error case

**Response `503`** if the serialized model artifact is missing at startup:

```json
{
  "error": {
    "code": "MODEL_NOT_READY",
    "message": "No-show model artifact failed to load. The service is running but cannot serve predictions.",
    "details": [
      {
        "field": "model_artifact",
        "issue": "Expected serialized model at ai/artifacts/no_show_model.json"
      }
    ],
    "request_id": "01JQ8W9F3M5N7P9Q2R4T6V8X0Z"
  }
}
```

---

## 7. Integration rules for the application

Owned by the application; recorded here because they constrain how the AI service will be called.

### 7.1 Calling discipline

| Rule | Value |
|---|---|
| Batch size | One `POST /predict/forecast` per event, all paid registrations in a single array |
| Per-registration calls | **Never** during a page render. Only for the registrations table, batched |
| Timeout | 3000 ms hard, 1 retry |
| Caching | Every response persisted to `event_forecasts` / `predictions`. The dashboard reads the database, never a live AI call |
| Trigger | Forecast refresh is explicit (organizer clicks "Refresh forecast") or on a schedule, not on every request |

### 7.2 Feature mapping ownership

The application owns the mapping from its database rows to `AttendanceInput` (`src/server/ai/features.ts`). The AI service never sees the application schema. If the application schema changes, only the mapper changes — no contract change required.

### 7.3 Graceful degradation (mandatory)

A forecast request MUST NOT block or fail page rendering.

| Failure | App behaviour |
|---|---|
| Connection refused | Serve last cached forecast, `is_stale: true` |
| `MODEL_NOT_READY` (503) | Serve last cached forecast, `is_stale: true`, show "Model warming up" |
| `TIMEOUT` (504) | Retry once, then serve cached, `is_stale: true` |
| `INTERNAL_ERROR` (500) | Serve cached, `is_stale: true`, log `request_id` |
| No cached forecast exists | Dashboard renders counts only, with "Prediction unavailable" |

**Staleness is application state.** The AI service never returns an `is_stale` field. A cached forecast older than 24 hours is also flagged stale regardless of service health.

### 7.4 Demo-day startup sequence

```
1. Application boots.
2. Application calls GET /health.
     200 + model_loaded=true  -> normal operation
     otherwise                 -> degraded mode, cached forecasts only
3. Organizer opens dashboard -> app reads event_forecasts from DB (no AI call).
4. Optional: organizer clicks "Refresh forecast" -> POST /predict/forecast -> persist.
```

Step 3 is what guarantees the dashboard always renders, even with the AI service stopped.

---

## 8. Versioning and change control

- The contract version is `1.0.0`, recorded in this document header.
- **Additive changes** (new optional request field, new response field) bump the **minor** version. Both sides must tolerate unknown fields in responses.
- **Breaking changes** (rename, remove, type change, enum value removal, semantic change) bump the **major** version and require written agreement from both owners before implementation.
- `model_version` is independent of the contract version. It changes on every model retrain and is surfaced in the dashboard for reproducibility.
- Every change is recorded in §10 with both owners named.

**Ownership boundary (enforced by directory convention):**

| Owner | Paths |
|---|---|
| Application owner | `src/`, `drizzle/` (schema/migrations/seed), `docs/API_CONTRACT.md` |
| AI/ML owner | `ai/` only |

Neither owner edits the other's paths. This document is the only shared artifact and the only place a cross-boundary change is agreed.

---

## 9. Deferred to v2 (recorded, not implemented)

| Item | Note |
|---|---|
| Service authentication | mTLS or a shared bearer token once the AI service leaves localhost |
| Real-data validation mode | A `data_source` other than `synthetic`, gated behind explicit governance approval |
| Streaming predictions | Not needed for batches under 2000 |
| Per-feature SHAP values | Would improve explanations; `top_reasons` covers the MVP |
| Forecast history endpoint | App can derive from its own `event_forecasts` table |

---

## 10. Sign-off and changelog

| Role | Name | Date | Agreed |
|---|---|---|---|
| Application owner | _Toufia_ | __________ | ☐ |
| AI/ML owner | __________ | __________ | ☐ |

**Integration is complete when:**

- [ ] AI service returns `200` on `/health` with `model_loaded: true`
- [ ] `/model-info` returns the measured `roc_auc` on the held-out synthetic test set
- [ ] Example A request/response reproduced exactly
- [ ] Example B request/response reproduced exactly, **including the arithmetic in §6**
- [ ] Example C request/response reproduced exactly
- [ ] Example D error envelope reproduced exactly
- [ ] A `VALIDATION_ERROR` with the `error.details` envelope is returned (not FastAPI's default `detail`)
- [ ] A prohibited field from §1.2 is rejected with `422`
- [ ] `payment_delay_hours: null` is handled explicitly and does not crash
- [ ] An empty `registrations` array returns a valid zeroed forecast
- [ ] `registration_id` and `event_id` are excluded from model features (verify via `feature_importance`)
- [ ] Inference latency measured under 3000 ms for a 500-row batch
- [ ] Application serves cached forecasts with `is_stale: true` when the AI service is stopped

### Changelog

| Version | Date | Change | Owner |
|---|---|---|---|
| 1.0.0 | 2026-03-10 | Initial frozen contract | Application owner |