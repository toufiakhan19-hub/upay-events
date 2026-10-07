"""Generate the synthetic registration dataset used to train the no-show model.

Original generator by Sadika (AI/ML owner). Every categorical value and the
weekday numbering follow docs/API_CONTRACT.md §4.3.1, so the columns the model
is trained on are exactly the values the web app sends at inference time.

Run from the repository root:

    python ai/train/generate_data.py
"""

from pathlib import Path

import numpy as np
import pandas as pd

OUTPUT_PATH = Path(__file__).resolve().parent / "synthetic_data.csv"

N_ROWS = 3000

EVENT_CATEGORIES = [
    "hackathon",
    "workshop",
    "cultural",
    "career_fair",
    "conference",
    "sports",
    "other",
]
LOCATION_TYPES = ["campus", "city", "online"]
REMINDER_STATUSES = ["none", "sent", "opened", "confirmed"]


def generate(n: int = N_ROWS, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    data = pd.DataFrame(
        {
            "event_category": rng.choice(
                EVENT_CATEGORIES,
                size=n,
                p=[0.22, 0.22, 0.16, 0.14, 0.10, 0.08, 0.08],
            ),
            "ticket_price_taka": rng.choice([0, 100, 250, 300, 500], size=n),
            "days_before_event_registered": rng.integers(0, 31, size=n),
            "payment_delay_hours": rng.choice(
                [0.0, 0.5, 1.0, 3.0, 6.0, 12.0, 24.0, 36.0, 48.0, 72.0, np.nan],
                size=n,
                p=[0.10, 0.08, 0.10, 0.10, 0.10, 0.10, 0.10, 0.08, 0.07, 0.05, 0.12],
            ),
            # ISO 8601 weekday: 1 = Monday ... 7 = Sunday.
            "event_day_of_week": rng.integers(1, 8, size=n),
            "event_start_hour": rng.integers(8, 23, size=n),
            "location_type": rng.choice(LOCATION_TYPES, size=n, p=[0.5, 0.3, 0.2]),
            "reminder_status": rng.choice(
                REMINDER_STATUSES, size=n, p=[0.15, 0.25, 0.35, 0.25]
            ),
            "prior_attendance_count": rng.integers(0, 11, size=n),
            "is_cancelled": rng.choice([True, False], size=n, p=[0.08, 0.92]),
        }
    )

    probability = np.full(n, 0.70)

    probability -= np.where(data["reminder_status"].isin(["none", "sent"]), 0.25, 0)
    probability += np.where(data["reminder_status"] == "confirmed", 0.15, 0)

    probability -= np.where(data["prior_attendance_count"] == 0, 0.30, 0)
    probability += np.where(data["prior_attendance_count"] >= 5, 0.10, 0)

    # Very early registrants forget; same-day registrants are impulsive.
    probability -= np.where(data["days_before_event_registered"] > 14, 0.20, 0)
    probability -= np.where(data["days_before_event_registered"] == 0, 0.10, 0)

    probability -= np.where(data["payment_delay_hours"] > 24, 0.10, 0)
    # Unpaid (null delay) registrations rarely turn up.
    probability -= np.where(data["payment_delay_hours"].isna(), 0.20, 0)

    probability -= np.where(data["ticket_price_taka"] == 0, 0.05, 0)

    probability -= np.where(data["location_type"] == "online", 0.10, 0)

    # Bangladesh weekend: Friday (5) and Saturday (6).
    probability += np.where(data["event_day_of_week"].isin([5, 6]), 0.05, 0)

    probability = np.clip(probability, 0.05, 0.95)

    data["checked_in"] = rng.binomial(1, probability)
    data.loc[data["is_cancelled"], "checked_in"] = 0

    return data


def main() -> None:
    data = generate()
    data.to_csv(OUTPUT_PATH, index=False)

    counts = data["checked_in"].value_counts().reindex([0, 1], fill_value=0)
    print(f"Rows: {len(data)}  Columns: {len(data.columns)}")
    print(f"No-show (0):    {counts[0]} ({counts[0] / len(data):.1%})")
    print(f"Checked-in (1): {counts[1]} ({counts[1] / len(data):.1%})")
    print(f"Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
