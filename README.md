# upay-events

UpayEvents Insight — an upay-linked event-registration platform for student
events, with AI attendance forecasting for organizers.

- Product requirements: [`docs/PRD.md`](docs/PRD.md)
- AI service contract: [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md)
- AI service implementation: `ai/` (separate owner)

## Status

Foundation phase only. Event registration, mock upay payments, QR tickets,
organizer dashboard, check-in, and AI forecasting are **not implemented yet**.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | SQLite via Drizzle ORM |
| AI service | Python FastAPI, owned separately, speaks `docs/API_CONTRACT.md` |

## Local setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Then open http://localhost:3000.

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
| `npm run db:studio` | Browse the database in Drizzle Studio |

The SQLite file is `./upay-events.db` at the repo root and is git-ignored via
the `*.db` rule.

## Project layout

```
src/
  app/            Routes, layouts, route handlers
    api/health/   Local connectivity check
  db/             Server-only database layer (never import from a Client Component)
    client.ts     SQLite connection + Drizzle instance
    enums.ts      Enum values; contract-aligned values marked
    schema.ts     Table definitions
  lib/env.ts      Validated environment access
docs/             PRD and API contract
ai/               AI service (separate owner)
drizzle/          Generated SQL migrations (committed)
```

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