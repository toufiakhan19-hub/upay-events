"""Train and evaluate the reminder uplift model (two-model T-learner).

The no-show model answers "who is likely to miss the event?". The uplift model
answers the marketing question "whose attendance does a reminder actually
change?", so organizers can spend reminders on persuadable registrants instead
of people who would come anyway or will not come regardless.

Data: a simulated randomized reminder experiment. Registrant features come from
`generate_data.generate`; each registrant is then randomly assigned to receive a
reminder (treatment) or not (control) with probability 0.5. The true reminder
effect varies by registrant, and because the data is synthetic that true effect
is known, so the model can be checked against it.

Model: one XGBoost classifier fitted on treated rows and one on control rows.
Predicted uplift = P(attend | reminded) - P(attend | not reminded).

Evaluation on a held-out 30% split: Qini curve, Qini coefficient and AUUC
against random targeting, plus the share of incremental attendees captured by
reminding only the top 30% of registrants. Writes:

    ai/artifacts/uplift_treated.json
    ai/artifacts/uplift_control.json
    ai/artifacts/uplift_metrics.json
    docs/images/qini-curve.png

Run from the repository root:

    python ai/train/train_uplift.py
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

AI_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_ROOT))
sys.path.insert(0, str(AI_ROOT / "train"))

from app.features import UPLIFT_COLUMNS, encode_uplift  # noqa: E402
from generate_data import generate  # noqa: E402

ARTIFACTS = AI_ROOT / "artifacts"
PLOT_PATH = AI_ROOT.parent / "docs" / "images" / "qini-curve.png"

N_ROWS = 8000
SEED = 7
TARGET_FRACTION = 0.3


def simulate_experiment(n: int = N_ROWS, seed: int = SEED) -> pd.DataFrame:
    """Randomized reminder experiment with a heterogeneous, known effect."""
    data = generate(n=n, seed=seed)
    data = data[~data["is_cancelled"]].reset_index(drop=True)
    rng = np.random.default_rng(seed + 1)
    n = len(data)

    # Attendance without any reminder; same signals as the no-show generator.
    base = np.full(n, 0.45)
    base -= np.where(data["prior_attendance_count"] == 0, 0.20, 0)
    base += np.where(data["prior_attendance_count"] >= 5, 0.25, 0)
    base -= np.where(data["days_before_event_registered"] > 14, 0.15, 0)
    base -= np.where(data["days_before_event_registered"] == 0, 0.05, 0)
    base -= np.where(data["payment_delay_hours"] > 24, 0.10, 0)
    base -= np.where(data["payment_delay_hours"].isna(), 0.15, 0)
    base -= np.where(data["ticket_price_taka"] == 0, 0.05, 0)
    base -= np.where(data["location_type"] == "online", 0.10, 0)
    base += np.where(data["event_day_of_week"].isin([5, 6]), 0.05, 0)
    base = np.clip(base, 0.05, 0.95)

    # Who a reminder helps: early registrants who forget, first-timers and
    # online attendees gain most; loyal regulars come anyway.
    effect = np.full(n, 0.03)
    effect += np.where(data["days_before_event_registered"] > 14, 0.22, 0)
    effect += np.where(data["prior_attendance_count"] == 0, 0.10, 0)
    effect += np.where(data["location_type"] == "online", 0.08, 0)
    effect -= np.where(data["prior_attendance_count"] >= 5, 0.05, 0)

    treated = rng.binomial(1, 0.5, size=n)
    p_control = base
    p_treated = np.clip(base + effect, 0.02, 0.98)
    probability = np.where(treated == 1, p_treated, p_control)

    data["treated"] = treated
    data["true_uplift"] = p_treated - p_control
    data["attended"] = rng.binomial(1, probability)
    return data


def records(frame: pd.DataFrame) -> list[dict]:
    rows = frame.to_dict(orient="records")
    for row in rows:
        if pd.isna(row["payment_delay_hours"]):
            row["payment_delay_hours"] = None
    return rows


def qini_curve(uplift: np.ndarray, treated: np.ndarray, outcome: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Cumulative incremental attendees when targeting the top-k by predicted uplift.

    Qini(k) = Y_t(k) - Y_c(k) * N_t(k) / N_c(k), returned per registrant
    (divided by N) against the targeted fraction k / N.
    """
    order = np.argsort(-uplift, kind="stable")
    t = treated[order]
    y = outcome[order]
    n_t = np.cumsum(t)
    n_c = np.cumsum(1 - t)
    y_t = np.cumsum(y * t)
    y_c = np.cumsum(y * (1 - t))
    ratio = np.divide(n_t, n_c, out=np.zeros_like(n_t, dtype=float), where=n_c > 0)
    qini = y_t - y_c * ratio
    n = len(uplift)
    fraction = np.concatenate([[0.0], np.arange(1, n + 1) / n])
    return fraction, np.concatenate([[0.0], qini / n])


def uplift_curve(uplift: np.ndarray, treated: np.ndarray, outcome: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """(response rate treated - response rate control) in the top-k, times k / N."""
    order = np.argsort(-uplift, kind="stable")
    t = treated[order]
    y = outcome[order]
    n_t = np.cumsum(t)
    n_c = np.cumsum(1 - t)
    rate_t = np.divide(np.cumsum(y * t), n_t, out=np.zeros(len(t)), where=n_t > 0)
    rate_c = np.divide(np.cumsum(y * (1 - t)), n_c, out=np.zeros(len(t)), where=n_c > 0)
    n = len(uplift)
    fraction = np.arange(1, n + 1) / n
    return np.concatenate([[0.0], fraction]), np.concatenate([[0.0], (rate_t - rate_c) * fraction])


def area(x: np.ndarray, y: np.ndarray) -> float:
    return float(np.sum((x[1:] - x[:-1]) * (y[1:] + y[:-1]) / 2))


def at_fraction(x: np.ndarray, y: np.ndarray, fraction: float) -> float:
    return float(np.interp(fraction, x, y))


def make_model() -> XGBClassifier:
    return XGBClassifier(
        n_estimators=200,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        min_child_weight=5,
        eval_metric="logloss",
        random_state=SEED,
    )


def main() -> None:
    data = simulate_experiment()
    train, test = train_test_split(
        data, test_size=0.3, random_state=SEED, stratify=data["treated"]
    )

    treated_train = train[train["treated"] == 1]
    control_train = train[train["treated"] == 0]

    model_t = make_model()
    model_t.fit(encode_uplift(records(treated_train)), treated_train["attended"])
    model_c = make_model()
    model_c.fit(encode_uplift(records(control_train)), control_train["attended"])

    X_test = encode_uplift(records(test))
    predicted = model_t.predict_proba(X_test)[:, 1] - model_c.predict_proba(X_test)[:, 1]
    treated = test["treated"].to_numpy()
    outcome = test["attended"].to_numpy()
    true_uplift = test["true_uplift"].to_numpy()

    x, model_qini = qini_curve(predicted, treated, outcome)
    _, oracle_qini = qini_curve(true_uplift, treated, outcome)
    random_qini = x * model_qini[-1]
    ux, model_uplift = uplift_curve(predicted, treated, outcome)
    random_uplift = ux * model_uplift[-1]

    qini_coefficient = area(x, model_qini) - area(x, random_qini)
    oracle_coefficient = area(x, oracle_qini) - area(x, random_qini)
    auuc = area(ux, model_uplift)
    auuc_random = area(ux, random_uplift)

    total_gain = model_qini[-1]
    top_gain = at_fraction(x, model_qini, TARGET_FRACTION)
    observed_ate = outcome[treated == 1].mean() - outcome[treated == 0].mean()
    spearman = float(pd.Series(predicted).corr(pd.Series(true_uplift), method="spearman"))

    trained_at = datetime.now(timezone.utc).replace(microsecond=0)
    ARTIFACTS.mkdir(exist_ok=True)
    model_t.save_model(ARTIFACTS / "uplift_treated.json")
    model_c.save_model(ARTIFACTS / "uplift_control.json")

    metrics = {
        "model_version": f"reminder-uplift-tlearner-{trained_at:%Y.%m.%d}",
        "model_family": "xgboost_t_learner",
        "treatment": "confirmation reminder sent",
        "outcome": "attended",
        "trained_at": trained_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "training_rows": int(len(train)),
        "test_rows": int(len(test)),
        "data_source": "synthetic randomized reminder experiment",
        "features": list(UPLIFT_COLUMNS),
        "metrics": {
            "observed_average_treatment_effect": round(float(observed_ate), 4),
            "mean_predicted_uplift": round(float(predicted.mean()), 4),
            "qini_coefficient": round(qini_coefficient, 4),
            "qini_coefficient_oracle": round(oracle_coefficient, 4),
            "qini_coefficient_ratio_to_oracle": round(qini_coefficient / oracle_coefficient, 3)
            if oracle_coefficient > 0
            else None,
            "auuc": round(auuc, 4),
            "auuc_random": round(auuc_random, 4),
            "top_30pct_share_of_incremental_attendees": round(top_gain / total_gain, 3)
            if total_gain > 0
            else None,
            "spearman_with_true_uplift": round(spearman, 3),
        },
    }
    (ARTIFACTS / "uplift_metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(7, 4.5), dpi=120)
    ax.plot(x * 100, model_qini * 100, label=f"T-learner (Qini coef. {qini_coefficient:.4f})", color="#0b6e4f", linewidth=2)
    ax.plot(x * 100, oracle_qini * 100, label=f"Oracle, true effect ({oracle_coefficient:.4f})", color="#999999", linestyle=":")
    ax.plot(x * 100, random_qini * 100, label="Random targeting", color="#c0392b", linestyle="--")
    ax.axvline(TARGET_FRACTION * 100, color="#555555", linewidth=0.8, alpha=0.6)
    ax.set_xlabel("Registrants reminded, ranked by predicted uplift (%)")
    ax.set_ylabel("Incremental attendees per 100 registrants")
    ax.set_title("Qini curve: reminder uplift model (held-out synthetic data)")
    ax.legend(loc="lower right", fontsize=8)
    ax.grid(alpha=0.25)
    fig.tight_layout()
    PLOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(PLOT_PATH)

    print(f"Training rows: {len(train)}  Test rows: {len(test)}")
    for key, value in metrics["metrics"].items():
        print(f"  {key:<45} {value}")
    print(f"Saved uplift models and metrics to {ARTIFACTS}; Qini plot to {PLOT_PATH}")


if __name__ == "__main__":
    main()
