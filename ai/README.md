# UpayEvents AI service

The attendance-forecasting service behind the UpayEvents organizer dashboard:
a synthetic data generator, an XGBoost no-show model, and a FastAPI service
that turns per-registration predictions into an event forecast with one
recommended action.

Originally built by **Sadika** (synthetic data, XGBoost model, FastAPI
service) and merged into this repository so the web app and the model ship
together. The interface is specified in
[`../docs/API_CONTRACT.md`](../docs/API_CONTRACT.md).

> All training and evaluation data is **synthetic**. Predictions are advisory
> and never block a registration, payment or check-in.

## Layout

```
ai/
  app/
    main.py          FastAPI app, endpoints, contract error envelope
    schemas.py       request models (unknown and PII fields are rejected)
    features.py      the feature encoder shared by training and inference
    forecast.py      scoring, event arithmetic, reasons, recommendation rules
  train/
    generate_data.py synthetic registrations (3,000 rows, seed 42)
    train_model.py   trains the no-show model and writes ai/artifacts/
    train_uplift.py  reminder uplift T-learner, Qini curve and AUUC
  artifacts/
    model.json           trained no-show XGBoost booster (committed)
    feature_columns.json encoded column order
    metrics.json         measured held-out metrics, calibration, feature importance
    uplift_treated.json  uplift model fitted on reminded registrants
    uplift_control.json  uplift model fitted on non-reminded registrants
    uplift_metrics.json  Qini coefficient, AUUC, top-30% capture
  tests/
    test_contract.py contract and uplift tests
    loadtest.py      concurrent load test against a running service
  requirements.txt       runtime: fastapi, numpy, xgboost-cpu
  requirements-train.txt training and tests: + pandas, scikit-learn, matplotlib, pytest, httpx, uvicorn
  render.yaml            fallback deployment on Render
```

## Running it

From the repository root:

```bash
python -m venv ai/.venv
# macOS/Linux: source ai/.venv/bin/activate
# Windows:     ai\.venv\Scripts\Activate.ps1

npm run ai:install   # pip install -r ai/requirements-train.txt
npm run ai:dev       # http://127.0.0.1:8000, docs at /docs
npm run ai:test      # contract tests
npm run ai:data      # regenerate ai/train/synthetic_data.csv
npm run ai:train     # retrain and rewrite ai/artifacts/
npm run ai:uplift    # retrain the uplift model, redraw docs/images/qini-curve.png
npm run ai:loadtest  # load-test the running service
```

No environment variables or API keys are needed.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | `200 {"status":"ok","model_loaded":true}`, or `503` "degraded" if the model failed to load |
| `GET` | `/model-info` | Model version, measured metrics and calibration, features, uplift model metrics, synthetic-data disclaimer, limitations |
| `POST` | `/predict/attendance` | Attendance probability and risk band (low / medium / high) for 1–2,000 registrations |
| `POST` | `/predict/forecast` | Event forecast: predicted attendance, no-shows, no-show rate, recommended waitlist, confidence, reasons, one recommendation |

Errors use the contract envelope
`{"error": {"code", "message", "details", "request_id"}}`. Personal fields such
as `phone`, `name` or `wallet_balance` are rejected with `422`.

## Model

Ten features per registration: event category, ticket price, days registered
before the event, payment delay, event weekday and hour, location type,
reminder status, prior attendance count, and whether the registration was
cancelled. A missing payment delay is passed to XGBoost as a missing value.

Measured on a held-out stratified 20% split (2,400 training rows, 600 test
rows), from `artifacts/metrics.json`:

| Metric | Value |
| --- | --- |
| ROC-AUC | 0.785 (target ≥ 0.75) |
| Accuracy | 0.698 |
| Precision / recall (attends) | 0.661 / 0.688 |
| Brier score | 0.189 |
| Expected calibration error | 0.060 |

The model is not post-calibrated; the reliability table is in `metrics.json`.

### Reminder uplift model

A two-model T-learner: one XGBoost classifier on reminded registrants, one on
non-reminded registrants, trained on a simulated randomized reminder
experiment. Predicted uplift = P(attend | reminded) − P(attend | not reminded).
When the forecast recommends `send_reminder`, the detail line includes the
expected extra attendees and how many registrants are persuadable (uplift
≥ 0.15). The forecast still works if the uplift artifacts are missing.

On 2,202 held-out rows: Qini coefficient 0.0124 (a perfect model scores
0.0156), AUUC 0.103 vs. 0.079 for random targeting, and reminding the top 30%
captures 54% of all extra attendees. The Qini plot is in
[`../docs/images/qini-curve.png`](../docs/images/qini-curve.png).

## Monitoring

Each prediction writes one JSON line to stdout (logger `upay-ai.monitor`):
model version, row count, mean probability, high-risk share, action and
latency. No row-level or personal data is logged. The monitoring plan is in
the main README §12.

## Load test

`npm run ai:loadtest` with a single uvicorn worker: a 500-registration forecast
takes about 45 ms on its own, and 240 concurrent requests in four scenarios
(up to 100 at once, up to 2,000 rows each) all succeed. Full results are in the
main README §9.6 and `../docs/load-test-results.json`.

## Deployment

On Vercel, the repository's [`../vercel.json`](../vercel.json) deploys this
folder as the private `ai` service (`app.main:app`) next to the Next.js app.
The web app reaches it through a service binding that sets `AI_SERVICE_URL`.
Without Vercel Services, deploy with `render.yaml` and set `AI_SERVICE_URL`
in the web app to the Render URL.
