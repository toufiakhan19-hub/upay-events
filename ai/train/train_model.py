"""Train and evaluate the XGBoost no-show model.

Original training script by Sadika (AI/ML owner). It now encodes features with
`ai/app/features.py` (the same code the API uses), saves the model in XGBoost's
native JSON format so inference does not need scikit-learn or pandas, and writes
the measured held-out metrics to `ai/artifacts/metrics.json`, which the API
serves verbatim from `GET /model-info`.

Run from the repository root:

    python ai/train/generate_data.py
    python ai/train/train_model.py
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

AI_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_ROOT))

from app.features import FEATURE_COLUMNS, PREDICTIVE_FEATURES, encode, feature_of_column  # noqa: E402

DATA_PATH = AI_ROOT / "train" / "synthetic_data.csv"
ARTIFACTS = AI_ROOT / "artifacts"

ROC_AUC_TARGET = 0.75


def model_version(trained_at: datetime) -> str:
    return f"no-show-xgb-{trained_at:%Y.%m.%d}"


def calibration_report(y_true: np.ndarray, probabilities: np.ndarray, bins: int = 10) -> dict:
    """Reliability table and expected calibration error over equal-width bins."""
    edges = np.linspace(0.0, 1.0, bins + 1)
    index = np.clip(np.digitize(probabilities, edges[1:-1]), 0, bins - 1)
    table = []
    ece = 0.0
    for b in range(bins):
        mask = index == b
        count = int(mask.sum())
        if count == 0:
            continue
        predicted = float(probabilities[mask].mean())
        observed = float(y_true[mask].mean())
        ece += count / len(y_true) * abs(predicted - observed)
        table.append(
            {
                "bin": f"{edges[b]:.1f}-{edges[b + 1]:.1f}",
                "count": count,
                "mean_predicted": round(predicted, 3),
                "observed_rate": round(observed, 3),
            }
        )
    return {
        "method": None,
        "expected_calibration_error": round(ece, 4),
        "bins": bins,
        "reliability": table,
        "note": "Uncalibrated XGBoost probabilities, measured on the held-out synthetic test set.",
    }


def main() -> None:
    data = pd.read_csv(DATA_PATH)
    data["payment_delay_hours"] = data["payment_delay_hours"].astype(float)
    data["is_cancelled"] = data["is_cancelled"].astype(bool)

    y = data["checked_in"].astype(int).to_numpy()
    if len(np.unique(y)) < 2:
        raise ValueError("checked_in must contain both classes.")

    records = data[list(PREDICTIVE_FEATURES)].to_dict(orient="records")
    for record in records:
        if pd.isna(record["payment_delay_hours"]):
            record["payment_delay_hours"] = None
    X = encode(records)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(X_train, y_train)

    probabilities = model.predict_proba(X_test)[:, 1]
    predictions = (probabilities >= 0.5).astype(int)

    roc_auc = float(roc_auc_score(y_test, probabilities))

    # Collapse one-hot columns back to the ten contract features.
    per_feature: dict[str, float] = {feature: 0.0 for feature in PREDICTIVE_FEATURES}
    for column, importance in zip(FEATURE_COLUMNS, model.feature_importances_):
        per_feature[feature_of_column(column)] += float(importance)
    total = sum(per_feature.values()) or 1.0
    feature_importance = sorted(
        (
            {"feature": feature, "importance": round(value / total, 3)}
            for feature, value in per_feature.items()
        ),
        key=lambda item: item["importance"],
        reverse=True,
    )

    trained_at = datetime.now(timezone.utc).replace(microsecond=0)

    ARTIFACTS.mkdir(exist_ok=True)
    model.save_model(ARTIFACTS / "model.json")
    (ARTIFACTS / "feature_columns.json").write_text(
        json.dumps(list(FEATURE_COLUMNS), indent=2) + "\n"
    )

    metrics = {
        "model_version": model_version(trained_at),
        "model_family": "xgboost",
        "trained_at": trained_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "training_rows": int(len(y_train)),
        "test_rows": int(len(y_test)),
        "metrics": {
            "roc_auc": round(roc_auc, 3),
            "precision": round(float(precision_score(y_test, predictions)), 3),
            "recall": round(float(recall_score(y_test, predictions)), 3),
            "accuracy": round(float(accuracy_score(y_test, predictions)), 3),
            "brier_score": round(float(brier_score_loss(y_test, probabilities)), 3),
            "positive_class": "attends",
        },
        "roc_auc_target": ROC_AUC_TARGET,
        "meets_roc_auc_target": roc_auc >= ROC_AUC_TARGET,
        "calibration": calibration_report(y_test, probabilities),
        "features": list(PREDICTIVE_FEATURES),
        "feature_importance": feature_importance,
    }
    (ARTIFACTS / "metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")

    print(f"Training rows: {len(y_train)}  Test rows: {len(y_test)}")
    print(f"Held-out ROC-AUC: {roc_auc:.4f} (target {ROC_AUC_TARGET})")
    print(f"Expected calibration error: {metrics['calibration']['expected_calibration_error']:.4f}")
    print("Feature importance:")
    for item in feature_importance:
        print(f"  {item['feature']:<30} {item['importance']:.3f}")
    print(f"Saved model, feature columns and metrics to {ARTIFACTS}")


if __name__ == "__main__":
    main()
