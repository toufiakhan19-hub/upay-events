
import pandas as pd
import numpy as np
import json
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from xgboost import XGBClassifier


# 1. Load the existing dataset
data = pd.read_csv("synthetic_data.csv")


# 2. Print the dataset shape
print("Dataset shape:", data.shape)


# 3. Fill missing payment_delay_hours values with -1
data["payment_delay_hours"] = data["payment_delay_hours"].fillna(-1)


# 4. Ensure is_cancelled and checked_in are integers (0/1)
data["is_cancelled"] = data["is_cancelled"].astype(int)
data["checked_in"] = data["checked_in"].astype(int)


# Separate features and target
X = data.drop(columns=["checked_in"])
y = data["checked_in"]


# Apply one-hot encoding to categorical columns
categorical_columns = [
    "event_category",
    "location_type",
    "reminder_status"
]

X = pd.get_dummies(
    X,
    columns=categorical_columns,
    dtype=int
)


# Ensure the target contains both classes
if y.nunique() < 2:
    raise ValueError(
        "The checked_in target must contain both 0 and 1 "
        "to perform stratified splitting and ROC-AUC evaluation."
    )


# 11. Save feature column names after one-hot encoding
feature_columns = X.columns.tolist()

with open("feature_columns.json", "w") as file:
    json.dump(feature_columns, file, indent=4)

print("\nNumber of features:", len(feature_columns))


# 6. Split the data into 80% training and 20% testing
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print("Training samples:", len(X_train))
print("Testing samples:", len(X_test))


# 7. Train the XGBoost classifier
model = XGBClassifier(
    n_estimators=100,
    max_depth=4,
    learning_rate=0.1,
    eval_metric="logloss",
    random_state=42
)

model.fit(X_train, y_train)

print("\nXGBoost model trained successfully!")


# 8. Evaluate the model using ROC-AUC
y_prob = model.predict_proba(X_test)[:, 1]

roc_auc = roc_auc_score(y_test, y_prob)

print(f"\nTest ROC-AUC Score: {roc_auc:.4f}")


# 9. Print the top 5 feature importances
feature_importances = pd.DataFrame({
    "feature": feature_columns,
    "importance": model.feature_importances_
})

feature_importances = feature_importances.sort_values(
    by="importance",
    ascending=False
)

print("\nTop 5 Feature Importances:")
print(
    feature_importances.head(5).to_string(index=False)
)


# 10. Save the trained model
joblib.dump(model, "model.pkl")

print("\nModel saved as model.pkl")


# Save feature column names
print("Feature columns saved as feature_columns.json")
