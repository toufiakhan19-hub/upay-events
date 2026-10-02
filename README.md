# upay-events

UpayEvents Insight — an upay-linked event-registration platform for student
events, with AI attendance forecasting for organizers.

- Product requirements: [`docs/PRD.md`](docs/PRD.md)
- AI service contract: [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)
- AI service implementation: `ai/` (separate owner)

## Status

Phase 2A is implemented: mock upay login, server-side sessions, event
discovery, and event details.

| Area | State |
| --- | --- |
| Mock "Continue with upay" login, session cookie, logout | done |
| Event discovery (`/events`) and details (`/events/[slug]`) | done |
| Development seed data (`npm run db:seed`) | done |
| Registration, mock upay payment, QR ticket | **not implemented yet** |
| Organizer dashboard, check-in, reminders, waitlist | **not implemented yet** |
| AI predictions and forecasts | **not implemented yet** |

Authentication is mocked: no password, no upay API call, and no secrets are
stored. Registration and payment are not built, so nothing is charged in this
demo.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | SQLite via Drizzle ORM |
| Auth | Mocked upay login — name + phone, HTTP-only session cookie |
| AI service | Python FastAPI, owned separately, speaks `docs/API_CONTRACT.md` |

## Local setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Then open http://localhost:3000 and use **Continue with upay**.

`.env` is git-ignored and must never be committed. `.env.example` is the
committed template. No secrets are stored in this repository.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate SQL migrations from `src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Insert or refresh the demo events (safe to re-run) |
| `npm run db:studio` | Browse the database in Drizzle Studio |

The SQLite file is `./upay-events.db` at the repo root and is git-ignored via
the `*.db` rule.

`db:seed` runs through `tsx` because it executes TypeScript outside Next.js. It
upserts organizers and events on their unique keys, so repeated runs never
duplicate rows. It deliberately seeds no users, registrations, payments, or
tickets — those flows do not exist yet.

## Project layout

```
src/
  app/            Routes, layouts, route handlers
    (attendee)/   Attendee pages
      login/      Mock upay login (server action + form)
      events/     Discovery list and event detail
    api/health/   Local connectivity check
  components/     Site header and event card (Server Components)
  db/             Server-only database layer (never import from a Client Component)
    client.ts     SQLite connection + Drizzle instance
    connection.ts better-sqlite3 factory shared by the app and the seed script
    enums.ts      Enum values; contract-aligned values marked
    schema.ts     Table definitions
  lib/            Framework-free helpers (ids, formatting, redirects)
  server/         Server-only data access
    auth/         Session layer, mock upay sign-in, login validation
    events/       Published-event queries
scripts/seed.ts   Development seed data
docs/             PRD and AI contract
ai/               AI service (separate owner)
drizzle/          Generated SQL migrations (committed)
```

## Mock upay login

1. `/login` posts name and phone to a server action.
2. The server trims and validates the input, then reuses the `users` row with
   that phone number or creates one — `users_phone_unique` makes the number the
   identity key.
3. A `sessions` row is created and its id is written to the `upay_session`
   cookie: HTTP-only, `SameSite=Lax`, `Secure` in production, 30-day expiry.
4. Attendee-only pages call `requireCurrentUser`, which redirects to
   `/login?next=…`. That `next` value is restricted to same-site paths.

The database module is `server-only`, so importing it from a Client Component
fails the build instead of shipping a database handle to the browser. The login
form is the only Client Component, and it renders nothing but inputs.

## Database conventions

- Primary keys are ULID strings, not auto-increment integers.
- Timestamps are ISO 8601 UTC strings with second precision.
- Money is an integer count of Bangladeshi Taka. Never a float.
- Structured values are JSON text columns.
- Enum values shared with the AI service are marked in `src/db/enums.ts` and
  must stay identical to `docs/API_CONTRACT.md`.

## Boundaries

`src/db/schema.ts` is never exposed to the AI service. The app maps database
rows into the request shapes defined in `docs/API_CONTRACT.md` §4.3.1 and
§4.4.1, so no table or column name crosses the wire. This is implemented in a
later phase.