"""Request models for docs/API_CONTRACT.md §4.3.1 and §4.4.1.

Every model forbids unknown fields (§1.2): a request carrying a name, phone
number, wallet balance or any other undeclared field is rejected with 422.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MAX_BATCH = 2000

EventCategory = Literal[
    "hackathon",
    "workshop",
    "cultural",
    "career_fair",
    "conference",
    "sports",
    "other",
]
LocationType = Literal["campus", "city", "online"]
ReminderStatus = Literal["none", "sent", "opened", "confirmed"]

Identifier = Field(min_length=1, max_length=64)

PROHIBITED_FIELDS = frozenset(
    {
        "user_name",
        "name",
        "phone",
        "phone_number",
        "email",
        "wallet_balance",
        "balance",
        "spending",
        "transaction_history",
        "contacts",
        "friend_list",
        "location_history",
        "gps_history",
        "home_address",
        "credit_score",
        "income",
        "financial_status",
    }
)


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AttendanceInput(ContractModel):
    registration_id: str = Identifier
    event_id: str = Identifier
    event_category: EventCategory
    ticket_price_taka: int = Field(ge=0)
    days_before_event_registered: int = Field(ge=0)
    # Required but nullable: null means the payment has not succeeded yet.
    payment_delay_hours: float | None = Field(ge=0)
    event_day_of_week: int = Field(ge=1, le=7)
    event_start_hour: int = Field(ge=0, le=23)
    location_type: LocationType
    reminder_status: ReminderStatus
    prior_attendance_count: int = Field(ge=0)
    is_cancelled: bool


class AttendanceRequest(ContractModel):
    as_of: datetime | None = None
    registrations: list[AttendanceInput] = Field(min_length=1, max_length=MAX_BATCH)


class ForecastRequest(ContractModel):
    event_id: str = Identifier
    event_capacity: int = Field(ge=0)
    event_date_time: datetime
    as_of: datetime | None = None
    registrations: list[AttendanceInput] = Field(max_length=MAX_BATCH)
