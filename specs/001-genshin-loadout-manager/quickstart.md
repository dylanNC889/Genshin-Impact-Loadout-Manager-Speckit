# Quickstart & Validation Guide: Genshin Loadout & Team Builder

**Feature**: `001-genshin-loadout-manager` | **Date**: 2026-06-23

A run/validation guide proving the feature works end-to-end. Implementation details live
in `tasks.md` and the code; this guide is for setting up, running, and **validating
against the user stories**. See [data-model.md](./data-model.md) and
[contracts/](./contracts/) for shapes.

> **Note:** This reflects the **implemented Docker-free build** — persistence uses a JSON file
> store, not Postgres. The original plan's Postgres/Prisma path is a documented deviation
> (see plan.md and README.md). E2E (Playwright) and Postgres-integration tests are deferred
> (no browser / Docker in this environment).

## Prerequisites

- Node.js 20+ and pnpm 10+

## Setup

```bash
pnpm install                  # install the monorepo workspaces
pnpm rebuild esbuild          # one-time: vitest/vite need esbuild's native binary
```

## Run (two terminals)

```bash
pnpm --filter @app/backend start    # API on http://localhost:3000 (persists to .data/store.json)
pnpm --filter @app/frontend dev     # UI  on http://localhost:5173 (proxies /api → backend)
# open http://localhost:5173
```

## Test (gates — Constitution Principles I, II, IV)

```bash
pnpm lint                              # ESLint + Prettier — zero errors (Principle I)
pnpm typecheck                         # tsc -b across packages
pnpm test                              # Vitest: golden stats, dataset, backend contract + integration
pnpm --filter @app/frontend build      # production bundle
```

## Validation scenarios (map to user stories & success criteria)

### US1 — Browse & inspect a character (P1)
1. Open the app → roster is listed; search/filter by name/element/weapon.
2. Select a character → base HP/ATK/DEF, element, weapon type, and all skills display.
3. Change level/ascension → base stats update at the ascension breakpoint.
- **Expected**: values match the in-game reference (golden set); reachable in <10s (SC-001).

### US2 — Build a loadout & see recalculated stats (P2)
1. With a character open, equip a weapon → ATK reflects weapon base ATK + secondary stat.
2. Fill all 5 artifact slots (valid main stats per slot) with substats → final stats sum
   correctly; active 2pc/4pc set bonuses are indicated.
3. Try an invalid main stat (e.g., EM on a Flower) → blocked with an actionable message.
4. Swap/remove a piece → stats and set bonuses recalculate immediately.
- **Expected**: recalculation feels instant (<200ms; SC-002); computed stats match the
  golden set within tolerance for ≥99% of fields (SC-003).

### US3 — Build a team & evaluate synergy (P3)
1. Add up to 4 distinct characters → a 5th is rejected; duplicates rejected.
2. With ≥2 same-element members → the correct resonance shows as active.
3. With mixed elements → the list of triggerable reactions is correct.
4. Review role coverage → gaps surfaced (e.g., "no healer").
5. With <4 members → a partial assessment shows and marks the team incomplete.
- **Expected**: every valid combo yields a non-empty assessment (SC-004); resonance &
  reactions 100% correct on the golden set (SC-005).
6. Click **Calculate** → on-demand damage estimate appears **with its assumptions**.
- **Expected**: result + assumptions within 5s for a full team (SC-009; FR-016).

### US4 — Save & manage loadouts and teams (P4)
1. Save a configured loadout and a team with names → they appear in the saved lists.
2. Restart the session → both reopen with all selections intact (SC-006).
3. Duplicate one → an independent copy is created; edit it without affecting the original.
4. Delete one → it disappears from the saved list.

## Done / acceptance

- All four validation scenarios pass and `pnpm lint && pnpm test && pnpm test:e2e` are
  green, with `bench` within budget. This satisfies SC-001..SC-009 and the constitution's
  Quality Gates.
