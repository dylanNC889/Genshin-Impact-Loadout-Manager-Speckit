# Genshin Impact Loadout & Team Builder

A single-user web app for theorycrafting in Genshin Impact: browse the character roster,
inspect base stats & skills, build a character **loadout** (weapon + 5 artifacts) and watch
final stats recalculate instantly, assemble a **4-character team** with a synergy assessment
and an on-demand damage estimate, and **save / manage** your loadouts and teams.

Built spec-first with [Spec Kit](.specify/) — see [`specs/001-genshin-loadout-manager/`](specs/001-genshin-loadout-manager/)
for the spec, plan, data model, contracts, and tasks.

## Architecture

A TypeScript **pnpm + Turborepo monorepo**:

| Package | Role |
|---|---|
| `packages/contracts` | Shared **Zod** schemas + inferred types (single source of truth) |
| `packages/stat-engine` | **Pure, deterministic** calculations: base/final stats, artifact validation, synergy, damage. Runs on both client (instant recalc) and server. |
| `packages/dataset` | Loads + validates the curated reference dataset from `data/` |
| `backend` | **Fastify** API serving the dataset and persisting loadouts/teams |
| `frontend` | **React + Vite** UI (TanStack Query + Zustand) |
| `data/5x-slice` | Curated reference dataset (characters, weapons, artifact sets, stat-value tables) |

The keystone is `stat-engine` — identical accuracy-critical math runs client-side for the
<200ms recalculation budget and server-side for authoritative validation.

> **Docker-free note:** the plan specifies PostgreSQL; this build uses a **JSON file store**
> (`backend/src/db/store.ts`) so persistence runs with no database. The `Store` interface is
> the seam for swapping in a Prisma/Postgres implementation later.

## Prerequisites

- Node.js 20+ and pnpm 10+

## Setup & run

```bash
pnpm install
pnpm rebuild esbuild   # one-time: vitest/vite need esbuild's native binary
```

**Run both (one command):**

```bash
pnpm dev               # backend API :3000 + frontend :5173 together
```

**Or run them separately (two terminals):**

```bash
pnpm --filter @app/backend start    # API on http://localhost:3000
pnpm --filter @app/frontend dev     # UI  on http://localhost:5173 (proxies /api → backend)
```

Open <http://localhost:5173>. The backend persists saved loadouts/teams to `.data/store.json`
(override with `STORE_PATH=/path/to/store.json`). Stop with `Ctrl+C`.

> The live GitHub Pages site is a **static, backend-free** build (data bundled, saves in
> localStorage). Local dev above is the **full** app with the real API.

## Quality gates

```bash
pnpm lint        # ESLint + (typescript-eslint) — zero errors (Constitution Principle I)
pnpm typecheck   # tsc -b across all packages
pnpm test        # Vitest: stat-engine golden values, dataset, backend contract + integration
pnpm --filter @app/frontend build   # production bundle
```

All four are green. See [quickstart.md](specs/001-genshin-loadout-manager/quickstart.md) for
the user-story validation walkthrough.

## Status

Core product loop (US1–US4) is implemented and verified:

- **US1** browse & inspect a character ✅
- **US2** build a loadout with dropdown-constrained stats + live recalc ✅
- **US3** team builder with synergy + on-demand damage ✅
- **US4** save / reopen / duplicate / delete loadouts & teams ✅

**Known limitations** (intentional for this slice):

- Reference data is a **curated ~30-character slice**, best-effort from public values — it
  is **not** the full roster and **should be cross-checked** before production. Only Lv 90 is
  supported. See [`data/5x-slice/meta.json`](data/5x-slice/meta.json).
- Team damage uses base stats + a generic rotation (a labeled estimate, not a guarantee).
- No end-to-end (Playwright) or Postgres-integration tests run here (no browser / Docker in
  the dev environment); the persistence store is JSON-file-backed.

## Updating the dataset

Edit the JSON under `data/<version>/` (compact authored character shape is normalized + Zod-
validated by `packages/dataset`). Add entries and the loader/tests scale automatically; bump
the count assertions in `packages/dataset/tests/dataset.test.ts`.
