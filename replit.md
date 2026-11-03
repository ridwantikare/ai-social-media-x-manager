# AI Social Media Manager

A single-user AI-powered social media command center: monitors X/Twitter topics via keywords, generates original tweets/replies/ideas using Gemini AI, routes everything through a Telegram bot for approval, and posts approved content via the Zernio API — all manageable from a dark web dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/dashboard run dev` — run the dashboard (port 23183, served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Env Vars

- `DATABASE_URL` — Postgres connection string
- `GEMINI_API_KEY` — Google Gemini API key (user's own)
- `TELEGRAM_BOT_TOKEN` — Telegraf bot token
- `TELEGRAM_GROUP_CHAT_ID` — Telegram group chat ID to send approvals to
- `ZERNIO_API_KEY` — Zernio API key for X posting

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, pino logging
- DB: PostgreSQL + Drizzle ORM
- AI: `@google/genai` (Gemini 2.5 Flash)
- Telegram: `telegraf` (polling mode)
- Posting: `@zernio/node`
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite, Tailwind, shadcn/ui, wouter, TanStack Query
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all routes)
- `lib/db/src/schema/` — Drizzle DB schemas (keywords, content-items, app-settings)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/` — gemini.ts, telegram.ts, zernio-client.ts, logger.ts
- `artifacts/dashboard/src/pages/` — Dashboard, Content, Keywords, Analytics, Settings pages
- `lib/api-client-react/src/generated/` — Orval-generated React Query hooks
- `lib/api-zod/src/generated/` — Orval-generated Zod schemas
- `docs/PROJECT_DOCUMENTATION.md` — full implementation, setup, deployment, and maintenance guide

## Architecture decisions

- **No auth** — single-user tool, no login required
- **Telegram approval flow** — when content is generated, it's sent to the Telegram bot with inline Approve/Reject buttons; approval triggers Zernio posting automatically
- **Zernio for posting** — uses `@zernio/node` SDK, not X API directly; `publishNow: true` for immediate posting
- **Gemini 2.5 Flash** — used directly via `@google/genai` with user's own `GEMINI_API_KEY`
- **Orval contract-first** — all API routes defined in OpenAPI spec first; hooks and Zod schemas generated from it

## Product

- **Dashboard** — live stats (pending/approved/posted/rejected), recent pending content feed
- **Content Queue** — generate AI content by type (tweet/reply/idea) and topic; approve/reject/edit/delete inline
- **Keywords** — add/remove tracked topics that Gemini draws from for generation
- **Analytics** — approval rate progress bar, full posted content history with links
- **Settings** — client name/niche/tone, default Zernio account, Telegram toggle, auto-generate toggle + interval

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `scheduledFor` from Orval Zod schemas is typed as `Date | null` (coerce.date), not string — handle accordingly
- Telegram bot runs in polling mode; do NOT add a webhook endpoint
- `zod/v4` is used (not `zod`), import as `import { z } from "zod/v4"`
- Never use `console.log` in server code — use `req.log` in handlers or `logger` from `lib/logger`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
