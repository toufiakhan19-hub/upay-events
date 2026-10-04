# UpayEvents Insight

An upay-linked event-registration platform for student events — hackathons,
workshops, cultural programs and career fairs — with AI attendance forecasting
for organizers.

> **Hackathon track:** Merchant & Agent Intelligence
> **Secondary tracks:** Growth & Campaign Intelligence · Trust & Risk Intelligence

| | |
| --- | --- |
| **Live deployment** | **`<LIVE_DEPLOYMENT_URL>`** ← replace before submission |
| **Repository** | https://github.com/toufiakhan19-hub/upay-events |
| **Product requirements** | [`docs/PRD.md`](docs/PRD.md) |
| **AI service contract** | [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) |

> **Demo disclaimer.** upay login and upay payment are **simulated**. No real
> upay API is called, no money moves, and no credentials are stored. All AI
> predictions come from a model trained on **synthetic data only**.

---

## Table of contents

1. [Project overview](#1-project-overview)
2. [Features](#2-features)
3. [Technology stack](#3-technology-stack)
4. [Requirements](#4-requirements)
5. [Installation and setup](#5-installation-and-setup)
6. [Environment variables](#6-environment-variables)
7. [Run and build commands](#7-run-and-build-commands)
8. [Live deployment](#8-live-deployment)
9. [Testing and verification](#9-testing-and-verification)
10. [Other configuration](#10-other-configuration)
11. [Architecture](#11-architecture)
12. [Responsible AI and security](#12-responsible-ai-and-security)
13. [Limitations and roadmap](#13-limitations-and-roadmap)

---

## 1. Project overview

### Problem

Student-event organizers know how many people **registered**, but not how many
will **show up**. That gap causes empty seats, wasted food, T-shirts and venue
budget, promotion that starts too late, manual ticket checking with
duplicate-ticket risk, and a registration-plus-payment experience split across
several tools.

### Solution

UpayEvents treats event organizers as upay merchants and gives them one place
to:

- let existing upay users register and pay for an event in a few taps;
- issue a secure QR ticket only after a successful payment;
- check attendees in at the door, with duplicate scans rejected;
- see an **AI forecast** of real attendance and no-shows, with **one concrete
  recommended action** (for example "Open 13 waitlist slots" or "Plan catering
  for 210 attendees, not all 300 registrations").

### Purpose

Make upay the trusted payment and intelligence layer for Bangladesh's
student-event ecosystem:

- **Organizers** plan for the people who will actually attend.
- **Attendees** get simple discovery, one-tap payment and a secure ticket.
- **upay** gains legitimate payment use cases, merchant acquisition and repeat
  transactions.

---

## 2. Features

### Attendee

| Feature | Route |
| --- | --- |
| Mock **"Continue with upay"** login — name and phone only, no password | `/login` |
| Event discovery: category, date, venue, price, seats left | `/events` |
| Event detail page and one-click registration | `/events/[slug]` |
| Mock upay checkout with **success** and **declined** outcomes | `/events/[slug]/checkout` |
| Simulated transaction ID on success; no ticket on failure | checkout |
| Secure QR ticket and ticket status (valid / checked in / invalid) | `/tickets`, `/tickets/[id]` |

### Organizer

| Feature | Route |
| --- | --- |
| Demo organizer picker (choose an organization to act as) | `/organizer` |
| Event overview: registrations, paid registrations, awaiting payment | `/organizer` |
| Registration and payment funnel | `/organizer/events/[id]` |
| **AI forecast panel**: predicted attendance, predicted no-show rate, recommended waitlist, confidence, top reasons, one recommended action | `/organizer/events/[id]` |
| Explicit **Generate / Refresh forecast** button | `/organizer/events/[id]` |
| Live check-in count and forecast-versus-actual comparison | `/organizer/events/[id]/checkin` |

### Check-in staff

| Feature | Route |
| --- | --- |
| Camera QR scanner (in-browser, `jsQR`) | `/organizer/events/[id]/checkin` |
| Manual fallback: type the `UPE-XXXXXXXX` reference printed on the ticket | same |
| Each ticket validates **once**; results are `checked_in`, `already_used` or `invalid_ticket` | same |
| Check-in timestamp recorded; live attendance updates | same |

### How the AI is used

The central prediction is: **"Will this paid registrant attend the event?"**

1. When the organizer clicks **Generate forecast**, the app collects every paid,
   non-cancelled registration for the event and converts each into ten
   non-personal features (`src/server/ai/features.ts`):
   event category, ticket price, days before the event the person registered,
   payment delay in hours, event day of week, event start hour, location type
   (campus / city / online), reminder status, synthetic prior-attendance count,
   and cancellation flag.
2. The batch is sent in **one** request to the Python AI service
   (`POST /predict/forecast`), with a 3-second budget and one retry
   (`src/server/ai/client.ts`).
3. The AI service scores each registration with a gradient-boosted no-show
   model (XGBoost, with a transparent weighted-scoring fallback), sums the
   individual attendance probabilities into an event-level forecast, and applies
   recommendation rules to choose **exactly one** action: `open_waitlist`,
   `send_reminder`, `adjust_catering`, `target_segment`, `increase_capacity` or
   `no_action`.
4. The app **validates** the response against the contract before saving
   anything (`src/server/ai/validate.ts`) — wrong arithmetic, out-of-range
   values or missing explanations are rejected.
5. The validated forecast is stored in `event_forecasts`. The dashboard only
   ever reads this cache, so pages render even when the AI service is down.

Every forecast shows plain-language reasons (for example "41.7% of paid
registrations carry medium or high no-show risk"). An LLM may only rephrase
those reasons; it never produces or changes a number. Predictions are advisory
and never block a registration, payment or check-in.

---

## 3. Technology stack

| Layer | Technology |
| --- | --- |
| Language | TypeScript 5 (web app), Python 3 (AI service) |
| Framework | Next.js 16 (App Router, Server Components, Server Actions), React 19 |
| Styling | Tailwind CSS v4 |
| Database | SQLite via `better-sqlite3` |
| ORM / migrations | Drizzle ORM, Drizzle Kit |
| QR generation | `qrcode` |
| QR scanning | `jsqr` (in-browser camera decoding) |
| Auth | Mocked upay sign-in with HTTP-only session cookie (no third-party auth) |
| Payments | `MockUpayPaymentAdapter` behind a `UpayPaymentAdapter` interface (`src/server/payments/`) |
| AI service | Python, FastAPI, Pandas, scikit-learn, XGBoost — called server-to-server over HTTP/JSON |
| AI models | XGBoost no-show classifier (isotonic-calibrated), weighted-scoring fallback; optional LLM only for rewording explanations |
| Tooling | ESLint 9 (`eslint-config-next`), `tsx` for scripts, `dotenv` |

No paid external APIs or API keys are required to run the web app.

---

## 4. Requirements

| Requirement | Version / note |
| --- | --- |
| Node.js | **20.9 or newer** (developed on Node 24) |
| npm | 10+ (ships with Node) |
| Git | any recent version |
| Python | 3.10+ — only to run the AI service locally |
| C++ build tools | Usually **not** needed: `better-sqlite3` ships prebuilt binaries. If `npm install` tries to compile it, install Visual Studio Build Tools (Windows), Xcode CLT (macOS) or `build-essential` + `python3` (Linux). |
| Browser | Any modern browser. Camera QR scanning needs camera permission and a **secure context** (`localhost` or HTTPS). |
| Hardware | Any laptop; ~500 MB free disk for dependencies. A webcam or phone camera is optional (manual ticket-ID entry works without one). |

---

## 5. Installation and setup

### 5.1 Web app

```bash
# 1. Clone
git clone https://github.com/toufiakhan19-hub/upay-events.git
cd upay-events

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env

# 4. Create the SQLite database and tables
npm run db:migrate

# 5. Seed demo organizers and events (safe to re-run)
npm run db:seed

# 6. Start the dev server
npm run dev
```

Open http://localhost:3000.

`db:seed` creates three demo organizers and four events:

| Event | Category | Capacity | Price |
| --- | --- | --- | --- |
| DIU AI Hackathon 2026 | hackathon | 500 | ৳300 |
| Flutter App Development Workshop | workshop | 80 | ৳100 |
| Dhaka Tech Career Fair 2026 | career fair | 1200 | free |
| Pohela Boishakh Cultural Night | cultural | 600 | ৳250 |

It deliberately seeds **no** users, registrations, payments or tickets. Those
are created by actually using the app, so every number on the dashboard comes
from a real flow.

### 5.2 AI service (for live forecasts)

The organizer dashboard calls a separate Python FastAPI service for forecasts.
Its interface is fully specified in [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md);
its code lives in [`ai/`](ai/) (see [`ai/README.md`](ai/README.md)).

```bash
cd ai
python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows:     .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

Check it is up: http://127.0.0.1:8000/health should return
`{"status": "ok", "model_loaded": true, ...}`.

The web app runs fine **without** the AI service: every page renders, and the
forecast panel shows "Prediction unavailable" until a forecast has been
generated successfully.

---

## 6. Environment variables

Copy `.env.example` to `.env`. `.env` is git-ignored and must never be
committed. No secrets are required.

| Variable | Required | Example / default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Yes** | `file:./upay-events.db` | Path to the SQLite database file. The `file:` prefix is optional. The app refuses to start if this is missing. |
| `AI_SERVICE_URL` | No | `http://127.0.0.1:8000` | Base URL of the Python AI service. Called server-to-server only, never from the browser. Defaults to `http://127.0.0.1:8000` if unset. |

Example `.env`:

```dotenv
DATABASE_URL="file:./upay-events.db"
AI_SERVICE_URL="http://127.0.0.1:8000"
```

On a hosting provider, set the same two variables in its environment settings
and point `AI_SERVICE_URL` at your deployed AI service, e.g.
`https://<your-ai-service-host>`.

---

## 7. Run and build commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on http://localhost:3000 |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build (run `npm run build` first) |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply SQL migrations from `drizzle/` |
| `npm run db:seed` | Insert or refresh demo organizers and events |
| `npm run db:generate` | Generate a new migration after editing `src/db/schema.ts` |
| `npm run db:studio` | Browse the database in Drizzle Studio |

Production build and run:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run build
npm run start
```

To reset all demo data, stop the server, delete `upay-events.db`, then run
`npm run db:migrate` and `npm run db:seed` again.

---

## 8. Live deployment

**URL:** `<LIVE_DEPLOYMENT_URL>`

Judges do not need an account. On the live site:

- Attendee login: enter any name and an 11-digit Bangladeshi-style phone
  number such as `01712345678`. Nothing is verified or charged.
- Organizer dashboard: open `/organizer` and pick an organization from the
  list — no password.

---

## 9. Testing and verification

There is no automated test suite yet. Verify the project with the static
checks below, then the end-to-end walkthrough.

### 9.1 Static checks

```bash
npm run typecheck
npm run lint
npm run build
```

All three should finish without errors.

### 9.2 Health checks

```bash
# Web app can reach its database
curl http://localhost:3000/api/health
# -> {"status":"ok","database":"connected"}

# AI service is up and the model is loaded
curl http://127.0.0.1:8000/health
# -> {"status":"ok","model_loaded":true,...}
```

### 9.3 End-to-end walkthrough (about 3 minutes)

**Attendee: registration → payment → ticket**

1. Open http://localhost:3000 and click **Continue with upay**.
2. Enter a name and phone number (e.g. `01712345678`) and continue.
3. Open **DIU AI Hackathon 2026** and click **Register**.
4. On checkout, click **Simulate a declined payment**.
   *Expected:* a failure message and **no** ticket.
5. Click **Pay ৳300 with upay**.
   *Expected:* a confirmation with a `mock_txn_…` transaction ID and a QR
   ticket with a `UPE-XXXXXXXX` reference. The QR encodes only an opaque
   token — no name, phone or payment data.
6. Open **My tickets** (`/tickets`). *Expected:* the ticket shows status **valid**.

Repeat with a few different phone numbers to build up paid registrations.

**Organizer: forecast**

7. Open http://localhost:3000/organizer and choose
   **Daffodil International University — CSE Society**.
8. Open **DIU AI Hackathon 2026**.
   *Expected:* registration count, paid count and payment funnel match what you
   just did.
9. With the AI service running, click **Generate forecast**.
   *Expected (in under 3 s):* predicted attendance, no-show rate, recommended
   waitlist, confidence label, top reasons and one recommended action.
10. Stop the AI service and click **Refresh forecast**.
    *Expected:* a clear error, and the previously cached forecast stays on screen
    unchanged.

**Check-in staff: duplicate protection**

11. From the event dashboard, open the **check-in** screen.
12. Click **Start camera** and show the ticket QR from step 5 (or type its
    `UPE-XXXXXXXX` reference in the ticket-ID box).
    *Expected:* **checked in**, and the live attendance count increases by one.
13. Scan the same ticket again.
    *Expected:* **already used** — the second scan is rejected.
14. Enter a made-up reference such as `UPE-00000000`.
    *Expected:* **invalid ticket**.
15. Back on `/tickets/[id]`, the ticket now shows **checked in**.

### 9.4 API checks (optional)

The check-in and forecast endpoints require the organizer cookie set by
`/organizer`, so they are easiest to exercise from the browser dev tools while
on an organizer page:

```js
// Scan a ticket by reference
await fetch("/api/checkin/scan", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ticket_id: "UPE-XXXXXXXX" }),
}).then((r) => r.json());

// Live attendance for an event
await fetch("/api/checkin/live?event_id=<EVENT_ID>").then((r) => r.json());
```

Without the organizer cookie both endpoints answer `401`.

### 9.5 AI service contract checks

[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) §6 contains worked
request/response examples (A–D) with the exact arithmetic the AI service must
reproduce, and §10 lists the integration checklist (ROC-AUC ≥ 0.75 on the
held-out synthetic test set, prohibited PII fields rejected with `422`,
latency under 3000 ms for a 500-row batch).

---

## 10. Other configuration

- **Database file.** SQLite is stored at `./upay-events.db` (from
  `DATABASE_URL`) and is git-ignored. Migrations in `drizzle/` are committed and
  must be applied with `npm run db:migrate` before first run.
- **No external accounts or API keys** are needed for the web app. upay login
  and payment are simulated in-process.
- **Organizer access is a demo picker, not authentication.** Anyone who opens
  `/organizer` can act as any seeded organization. Data is still scoped to the
  selected organizer inside every query.
- **Camera scanning** requires browser camera permission and only works on
  `localhost` or HTTPS. Manual ticket-ID entry works everywhere.
- **Hosting note.** SQLite needs a writable, persistent disk. Serverless
  platforms with read-only or ephemeral file systems will lose data between
  requests; deploy on a host with a persistent volume, or run locally.
- **Ports.** Web app on `3000`, AI service on `8000`. Change the AI port by
  updating `AI_SERVICE_URL`.
- **Cookies.** `upay_session` (attendee, 30 days) and `upay_organizer`
  (organizer demo access, 7 days). Both are HTTP-only, `SameSite=Lax`, and
  `Secure` in production.

---

## 11. Architecture

```
Browser (Next.js pages, React Server Components)
        │
        ▼
Next.js server — Server Actions + Route Handlers
  ├── src/server/auth/          mock upay sign-in, sessions
  ├── src/server/registrations/ registration state machine
  ├── src/server/payments/      UpayPaymentAdapter ─► MockUpayPaymentAdapter
  ├── src/server/tickets/       opaque QR tokens, QR images
  ├── src/server/checkin/       single-use ticket validation
  ├── src/server/forecast/      explicit forecast refresh + cache
  └── src/server/ai/            feature mapping, HTTP client, response validation
        │                                   │
        ▼                                   ▼ HTTP/JSON (server-to-server)
SQLite (Drizzle ORM)               Python FastAPI AI service (ai/)
users, sessions, organizers,         • synthetic data generator
events, registrations, payments,     • XGBoost no-show model
tickets, check-ins, reminders,       • event forecast aggregation
predictions, event_forecasts         • recommendation rules
```

The AI service is stateless, has no database access and never receives
personal data — only the ten features listed in §2.

### Project layout

```
src/
  app/
    (attendee)/      login, events, checkout, tickets
    organizer/       organizer picker, event dashboard, check-in
    api/             health, check-in scan/live, forecast refresh
  components/        UI components (QR scanner, AI panel, funnel, cards)
  db/                schema, enums, SQLite connection (server-only)
  lib/               env, ids, formatting, time helpers
  server/            all server-only business logic (see diagram)
scripts/seed.ts      demo organizers and events
drizzle/             committed SQL migrations
docs/                PRD and AI service API contract
ai/                  Python AI service
```

---

## 12. Responsible AI and security

- Synthetic data only for training and evaluation; the model's ROC-AUC is
  reported honestly against the 0.75 target.
- No wallet balances, spending, contacts, location history or financial status
  are used. The AI contract rejects such fields with `422`.
- Every forecast is shown with its reasons; organizers decide whether to act.
- A risk score never denies a registration, payment or check-in.
- QR codes carry an opaque random token prefixed `UPE1:` — no name, phone or
  payment data.
- Every scan is logged; a ticket can be checked in only once.
- Mock payment and synthetic predictions are labelled in the UI.

---

## 13. Limitations and roadmap

**Current limitations**

- upay SSO and payments are simulated (`MockUpayPaymentAdapter`).
- Organizer access is a demo picker with no authentication.
- Reminder campaigns and waitlist opening are recommended by the AI but not yet
  sent or executed from the dashboard.
- The model is validated on synthetic data only and needs controlled
  real-world validation.
- No automated test suite yet.

**Roadmap**

Real upay SSO and payment integration through the existing adapter interface;
organizer verification and settlement; time-rotating QR tickets; consent-based
waitlist auto-promotion; opt-in interest-based recommendations; Bangla-first
UI; sponsor analytics; fraud and duplicate-ticket risk scoring.
