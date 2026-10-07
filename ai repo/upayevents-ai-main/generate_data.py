
import pandas as pd
import numpy as np

# Reproducible random number generator
np.random.seed(42)

# Number of registrations
n = 2000

# Generate synthetic event registration data
data = pd.DataFrame({
    "event_category": np.random.choice(
        ["hackathon", "workshop", "cultural", "career_fair"],
        size=n
    ),

    "ticket_price_taka": np.random.choice(
        [0, 100, 300],
        size=n
    ),

    "days_before_event_registered": np.random.randint(
        1, 31,
        size=n
    ),

    "payment_delay_hours": np.random.choice(
        [0.0, 1.0, 3.0, 6.0, 12.0, 24.0, 36.0, 48.0, np.nan],
        size=n,
        p=[0.10, 0.10, 0.12, 0.12, 0.12, 0.12, 0.10, 0.07, 0.15]
    ),

    "event_day_of_week": np.random.randint(
        0, 7,
        size=n
    ),

    "event_start_hour": np.random.randint(
        8, 23,
        size=n
    ),

    "location_type": np.random.choice(
        ["campus", "city_venue", "online"],
        size=n
    ),

    "reminder_status": np.random.choice(
        ["not_sent", "sent", "opened", "confirmed"],
        size=n,
        p=[0.15, 0.25, 0.35, 0.25]
    ),

    "prior_attendance_count": np.random.randint(
        0, 11,
        size=n
    ),

    "is_cancelled": np.random.choice(
        [True, False],
        size=n,
        p=[0.10, 0.90]
    )
})

# --------------------------------------------------
# Calculate check-in probability
# --------------------------------------------------

# Base probability
probability = np.full(n, 0.70)

# Reminder status adjustments
probability -= np.where(
    data["reminder_status"].isin(["not_sent", "sent"]),
    0.25,
    0
)

probability += np.where(
    data["reminder_status"] == "confirmed",
    0.15,
    0
)

# Prior attendance adjustments
probability -= np.where(
    data["prior_attendance_count"] == 0,
    0.30,
    0
)

probability += np.where(
    data["prior_attendance_count"] >= 5,
    0.10,
    0
)

# Registration timing adjustment
probability -= np.where(
    data["days_before_event_registered"] > 14,
    0.20,
    0
)

# Payment delay adjustment
probability -= np.where(
    data["payment_delay_hours"] > 24,
    0.10,
    0
)

# Ticket price adjustment
probability -= np.where(
    data["ticket_price_taka"] == 0,
    0.05,
    0
)

# Weekend adjustment (Saturday = 5, Sunday = 6)
probability += np.where(
    data["event_day_of_week"].isin([5, 6]),
    0.05,
    0
)

# Clamp probabilities between 0.05 and 0.95
probability = np.clip(
    probability,
    0.05,
    0.95
)

# Generate check-in outcomes
data["checked_in"] = np.random.binomial(
    1,
    probability
)

# Cancelled registrations cannot check in
data.loc[
    data["is_cancelled"],
    "checked_in"
] = 0

# --------------------------------------------------
# Save dataset
# --------------------------------------------------

data.to_csv(
    "synthetic_data.csv",
    index=False
)

# --------------------------------------------------
# Print dataset information and target distribution
# --------------------------------------------------

print("Synthetic event registration data generated successfully!")
print(f"Total rows: {len(data)}")
print(f"Total columns: {len(data.columns)}")

print("\nColumn names:")
print(data.columns.tolist())

print("\nChecked-in distribution:")

counts = data["checked_in"].value_counts().reindex(
    [0, 1],
    fill_value=0
)

percentages = (
    data["checked_in"]
    .value_counts(normalize=True)
    .reindex([0, 1], fill_value=0)
    * 100
)

print(f"No-show (0):    {counts[0]} ({percentages[0]:.2f}%)")
print(f"Checked-in (1): {counts[1]} ({percentages[1]:.2f}%)")

print("\nMissing payment_delay_hours values:")
print(data["payment_delay_hours"].isna().sum())

print("\nDataset saved to synthetic_data.csv")
