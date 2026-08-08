# Seed World × CFI checkout demo

A local-first retailer order desk demonstrating CFI financing inside an
e-commerce checkout. A Seed World admin builds a customer's seed order, checks
whether an existing funded line can cover it, and either creates the draw or
starts a financing application while holding the order.

## Stack

- Bun
- TanStack Start and React
- shadcn/ui with Base UI and Tailwind CSS
- Drizzle ORM v1 RC with PostgreSQL
- Docker Compose for the local database
- Sentry SDK with Spotlight for local errors, traces, and logs

## Local development

```sh
cp .env.example .env
bun run db:up
bun run dev
```

Open [http://localhost:3001](http://localhost:3001). The database-backed health
endpoint is available at [http://localhost:3001/api/health](http://localhost:3001/api/health).

To sync the customer directory and use CFI checkout, generate a dealer API token in ConnectedFi
**Settings → API** and set `CFI_API_KEY` in `.env`. The sandbox API URL is
configured by default. Customer sync imports submitted applicants and their
financing profiles. Checkout uses `getAccountFinancing` to find funded lines,
`getDrawEligibility` to retrieve the valid tranche choices, and `createDraw`
to pay the order. If no single line covers the order, the admin can submit a
new application inline and leave the order on financing hold.

`bun run dev` starts both the app and Spotlight. Open Spotlight at
[http://localhost:8969](http://localhost:8969), or stream events in another
terminal with `bun run spotlight:tail`.

Console-log capture and the TanStack Devtools Vite console bridge are
intentionally disabled while using Spotlight. The bridge can recursively
forward server warnings through `/__tsd/console-pipe`, producing a real browser
request storm. Exceptions and performance traces still appear in Spotlight.

To send a known test exception to Spotlight:

```sh
curl -X POST http://localhost:3001/api/debug/sentry
```

This endpoint returns `404` in production. A local Sentry DSN is not required;
when connecting the app to hosted Sentry, fill in the optional variables from
`.env.example`.

The `hono` package override in `package.json` keeps Spotlight 4.11.8 on its
compatible Hono release; without it, Bun currently resolves Hono 4.13 and the
Spotlight sidecar fails while parsing requests.

## Database commands

```sh
bun run db:generate  # generate migrations from src/db/schema.ts
bun run db:migrate   # apply generated migrations
bun run db:push      # push schema directly during prototyping
bun run db:studio    # open Drizzle Studio
bun run db:down      # stop the local database
```

Applicants are contacts keyed by `personUuid`; they are not pipeline tickets.
Financing applications are deals keyed by `financingUuid`, so one applicant can
have multiple independent cards on the Kanban board. Applicant-level tables
from the first prototype remain in the database for data preservation but are
no longer exposed by the application UI.
