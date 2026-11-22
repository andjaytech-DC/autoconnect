# Progressive AutoHub — customer web (autoconnect)

Next.js 16 storefront for Progressive Auto Sports / Progressive AutoHub.

## Part of a five-repo system

| Repo | Role |
|---|---|
| `autoconnect` (this repo) | Customer web app |
| `progressive-autohub-backend` | NestJS API (system of record), PostgreSQL |
| `progressive-autohub-admin` | Admin web app |
| `progressive-autohub-api-client` | Shared axios SDK |
| `AndroidStudioProjects/autoconnect` | Android app |

## Run locally

1. Start PostgreSQL and the NestJS API (`progressive-autohub-backend`, port 5000).
   The site needs the API: `/uploads/*` and `/nest-api/*` are proxied to it.
2. Copy `.env` values (see the backend `.env.example` for shared settings).
3. `npm install`, `npx prisma generate`, then `npm run dev` (http://localhost:3000).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev, build, serve |
| `npm test` | Unit and security regression tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run smoke` | Route smoke test (needs a running server) |
| `npm run seed` | Seed the database |

## Security and operations docs

See `docs/security-headers.md`, `docs/rate-limiting.md`,
`docs/security-program-checklist.md`.

## Agent instructions

See `AGENTS.md`. This Next.js version has breaking changes; read
`node_modules/next/dist/docs/` before writing code.
