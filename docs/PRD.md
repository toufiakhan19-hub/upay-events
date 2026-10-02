UpayEvents Insight - Product Requirements Document
1. Product summary
UpayEvents Insight is an upay-linked event-registration platform for student events, hackathons, workshops, cultural programs, and career fairs.
It helps organizers accept event payments through upay, issue secure QR tickets, and use AI to predict registration demand and paid-attendee no-shows. The organizer receives concrete recommendations: how many waitlist seats to open, when to send reminders, and how many attendees to plan for.
Primary hackathon track: Merchant & Agent Intelligence
Secondary tracks: Growth & Campaign Intelligence; Trust & Risk Intelligence
2. Problem
Student-event organizers often know how many people registered, but not how many will actually attend. This creates:
Empty seats and poor event atmosphere
Wasted food, T-shirts, venue capacity, and sponsor budget
Late or ineffective promotion
Manual ticket checking and duplicate-ticket risk
Fragmented registration and payment experiences
Event organizers can be treated as upay merchants. UpayEvents creates value for both sides:
Organizers: better attendance planning and smoother payment collection
Users: simple event discovery, one-tap payment, and a secure ticket
upay: more legitimate payment use cases, merchant acquisition, and repeat transactions
3. Product vision
Make upay the trusted payment and intelligence layer for Bangladesh’s student-event ecosystem.
4. Goals
Let an existing upay customer register and pay for an event quickly.
Provide each successful payment with a secure QR ticket.
Predict likely attendance and no-shows for the organizer.
Recommend one clear operational action based on the prediction.
Demonstrate a realistic future integration path to upay.
5. Non-goals for the MVP
Real upay production integration
Real KYC or wallet account creation
Real-money transaction processing
Dynamic ticket pricing
Full event marketplace features
Social feed, chat, reviews, or organizer payouts
Autonomous ticket cancellation or user penalties
Existing upay users should use single sign-on in the future. A new financial account must continue through approved upay onboarding; do not claim document-free wallet creation.
6. Target users
User
Need
MVP value
Student attendee
Find, pay for, and enter an event easily
Simple registration, mock upay checkout, QR ticket
Event organizer
Avoid over- or under-planning attendance
AI attendance forecast and action recommendations
Event check-in staff
Validate tickets quickly
QR scan and attendee status
upay operations team
Grow event payment usage safely
Organizer merchant dashboard and future integration model








7. Core MVP
MVP statement
Build a working web app where a user logs in through a simulated upay account, registers and pays for an event, receives a QR ticket, and an organizer sees AI-generated attendance forecasts and recommended actions.
Must-have features
upay-linked login
“Continue with upay” button
Mock authenticated user for the demo
Privacy-friendly event profile with only name, phone, and optional interests
No separate password
Event discovery and registration
Event card with category, date, location, ticket price, seats left
Event detail page
Registration form
Clear “Pay with upay” action
Mock upay payment flow
Payment confirmation screen
Simulated transaction ID
Payment success/failure state
Architecture should isolate this as a future UpayPaymentAdapter
Secure QR ticket
Ticket issued only after successful payment
QR contains a signed or random ticket ID, not personal data
Ticket status: valid, checked in, invalid
Organizer dashboard
Registration count
Paid registration count
Predicted attendance
Predicted no-show rate
Recommended waitlist size
One recommended action with explanation
Check-in view
QR scanner or manual ticket-ID input
Validates ticket once
Marks attendee as checked in
Updates actual attendance count
AI intelligence
No-show prediction per paid registration
Event-level attendance forecast
One actionable recommendation, such as:
“Open 25 waitlist seats.”
“Send a confirmation reminder tonight.”
“Plan catering for 210 attendees, not all 300 registrations.”
“Registration demand is slowing; target AI-club students with a reminder.”
8. Primary user flows
Attendee flow
Landing page
→ Continue with upay
→ Browse event
→ Register
→ Pay with upay
→ Payment confirmed
→ QR ticket issued
→ QR scanned at venue
→ Checked in
Organizer flow
Organizer dashboard
→ Select event
→ View registrations and payment status
→ View demand forecast and no-show estimate
→ See recommended action
→ Send simulated reminder / open waitlist
→ Monitor live check-ins
Staff flow
Open check-in screen
→ Scan QR / enter ticket ID
→ Validate ticket
→ Mark attendee checked in
→ Show success or invalid-ticket message
9. AI design
9.1 AI decision
The central prediction is:
“Will this paid registrant attend the event?”
The output is a probability, not an automatic decision. For example:
Likely attendance: 62%
No-show risk: Medium
Reason: Registered late, has not confirmed attendance, and similar registrations historically had lower attendance.
9.2 Input data for the MVP
Use clearly labelled synthetic data only.
Feature
Example
Event category
Hackathon, workshop, cultural event
Ticket price
৳0, ৳100, ৳300
Registration timing
12 days before event
Payment timing
Paid immediately / delayed
Event day and time
Friday, 9:00 AM
Location type
DIU campus / city venue
Reminder status
Sent, opened, confirmed
Prior attendance
Synthetic historical count
Cancellation status
Cancelled / active
Final label
Checked in / no-show

Do not use real wallet balances, spending habits, financial data, contacts, or private location history.
9.3 Suggested model
MVP model: XGBoost, LightGBM, or Random Forest
Fallback: transparent weighted scoring model if the ML model is unstable
Demand forecast: aggregate individual attendance probabilities by event
Explanation: feature importance or simple rule trace
LLM role: turn structured predictions into a short organizer-friendly explanation; it must not make the numerical prediction itself

9.4 Model evaluation
Use a held-out synthetic test set.
Metric
MVP target
No-show model ROC-AUC
0.75+ on synthetic test data
Prediction explanation
Displayed for every forecast
Recommendation latency
Under 3 seconds
Ticket fraud prevention
Reject second scan of the same ticket

Be transparent in the pitch: the model is validated on synthetic data and needs controlled real-world validation after the hackathon.
10. Functional requirements
Attendee-facing
Browse at least three seeded events.
View event details and available capacity.
Register through a short form.
Complete simulated upay payment.
Receive a unique QR ticket.
View ticket status.
Organizer-facing
View event overview.
View registration/payment funnel.
View predicted attendance and no-show estimate.
See top prediction reasons.
Receive one recommended action.
Trigger a simulated reminder campaign.
View live check-in count.
Check-in-facing
Validate each ticket one time only.
Show clear status: valid, already used, invalid.
Record check-in timestamp.
11. Technical architecture
React / Next.js frontend
        ↓
API layer
        ↓
PostgreSQL or SQLite database
        ↓
Python AI service
- synthetic data generator
- no-show model
- demand forecast
- recommendation engine
        ↓
Mock UpayPaymentAdapter
        ↓
QR-ticket service
Suggested stack
Frontend: Next.js, React, Tailwind CSS
Backend: Next.js API routes or FastAPI
Database: SQLite for demo speed; PostgreSQL if already available
AI: Python, Pandas, scikit-learn, XGBoost/LightGBM
QR: qrcode package
Charts: Recharts
Deployment: local demo or Vercel-compatible frontend
12. Data model
Entity
Essential fields
User
id, name, phone, interests, upay_account_reference
Organizer
id, organization_name, contact_name
Event
id, title, category, venue, date_time, capacity, price
Registration
id, user_id, event_id, status, created_at
Payment
id, registration_id, amount, status, mock_transaction_id
Ticket
id, registration_id, qr_token, status, checked_in_at
Reminder
id, registration_id, sent_at, opened_at, confirmed_at
Prediction
id, registration_id, attendance_probability, explanation
EventForecast
event_id, predicted_attendance, no_show_rate, recommendation

13. Success metrics
Product metrics
Completed registrations
Payment completion rate
QR-ticket issuance success rate
Check-in completion rate
Organizer dashboard usage
AI and operational metrics
Forecasted versus actual attendance
Mean absolute attendance-forecast error
No-show model ROC-AUC
Empty-seat reduction in simulation
Recommended-action acceptance rate
Estimated incremental upay event-payment volume
14. Responsible AI and security
Use synthetic data only during the hackathon.
Do not infer financial status or use wallet spending behavior.
Explain every important prediction.
Let organizers decide whether to act on recommendations.
Never automatically deny a user’s registration based on a risk score.
QR tokens must not expose name, phone number, or payment information.
Ticket scans must be logged and protected from duplicate use.
Clearly label mock payment and synthetic predictions in the demo.
15. Development phases - 40 hours
Phase 0: Scope lock and design system - Hours 0-2
Deliverables:
Final feature list
Three seeded demo events
User stories and wireframes
Synthetic-data schema
Git repository and task board
Decision: no real payment integration; use a realistic mock UpayPaymentAdapter.
Phase 1: Foundation and synthetic data - Hours 2-8
Deliverables:
App shell and database schema
Synthetic dataset with 3 events and 1,000-3,000 historical registrations
Event, registration, payment, ticket, and check-in seed data
Basic API contracts
AI-agent work:
Generate frontend scaffold
Create synthetic data generator
Generate migrations and seed scripts
Draft test cases
Human review:
Verify data is plausible and has no real personal information.
Phase 2: Core attendee journey - Hours 8-18
Deliverables:
Landing page
Mock “Continue with upay” login
Event listing and event detail pages
Registration form
Mock upay checkout
Payment success screen
QR ticket generation
Definition of done:
A user can complete the full registration-to-ticket flow in under two minutes.
Phase 3: AI forecasting engine - Hours 18-27
Deliverables:
Train/test split for synthetic dataset
No-show prediction model
Event attendance aggregation
Recommendation rules
Explanation output
API endpoint for predictions
Definition of done:
The dashboard can show predicted attendance, no-show risk, top reasons, and one suggested action.
Phase 4: Organizer dashboard and check-in - Hours 27-35
Deliverables:
Organizer dashboard with charts
Forecast and recommendation panel
Waitlist/remainder simulation actions
QR check-in screen
Duplicate-scan prevention
Live attendance count
Definition of done:
A demo organizer can see expected attendance, scan tickets, and compare live turnout with the forecast.
Phase 5: Quality, story, and pitch readiness - Hours 35-40
Deliverables:
End-to-end test of the demo flow
Mobile-responsive polish
Error states for failed payment and invalid QR
Metrics screenshots
Three-minute demo script
Architecture diagram
Pitch slides or one-page product brief
Definition of done:
The team can demonstrate the full journey without editing code or relying on manual database changes.
16. AI-agent task allocation
Workstream
Best use of AI agents
Human responsibility
UI
Pages, components, responsive styling
Product decisions and final visual review
Backend
CRUD APIs, schema, adapters
Security review and endpoint validation
Data
Synthetic-data generation and model notebook
Check realism and remove unsafe assumptions
ML
Baseline model, feature engineering, evaluation charts
Validate claims and choose metrics
Testing
Test cases, edge-case generation, lint fixes
Run end-to-end demo manually
Pitch
Draft story, diagrams, dashboard copy
Final narrative and honest limitations

17. Demo script
A student logs in with “Continue with upay.”
They register for “DIU AI Hackathon 2026.”
They complete a simulated upay payment and receive a QR ticket.
The organizer dashboard shows:
500 paid registrations
408 predicted attendees
18.4% predicted no-show rate
Recommendation: “Open 30 waitlist slots and send a confirmation reminder tonight.”
A staff member scans the QR ticket.
The dashboard updates live attendance.
Close with: “UpayEvents helps event organizers plan for people who will actually show up—not just people who clicked register.”
18. Future roadmap
After the MVP
Actual upay SSO and payment integration
Organizer verification and settlement workflow
Secure, time-rotating QR tickets
Waitlist auto-promotion with user consent
Personalized event recommendations based only on opt-in interests
Multilingual Bangla-first experience
Sponsor analytics
Fraud and duplicate-ticket risk scoring
Controlled validation with real, governed, anonymized event data
