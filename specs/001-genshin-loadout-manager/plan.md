# Implementation Plan: Genshin Impact Loadout & Team Builder

**Branch**: `001-genshin-loadout-manager` | **Date**: 2026-06-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-genshin-loadout-manager/spec.md`

## Summary

A single-user web application for theorycrafting in Genshin Impact: browse the full
character roster and inspect base stats/skills, build a character "loadout" (weapon +
five artifacts with sets, main stats, and substats) and see final stats recalculate
instantly, assemble a 4-character team with a rule-based synergy assessment (resonance,
possible reactions, role coverage) plus an on-demand quantitative damage estimate, and
save/manage loadouts and teams.

**Technical approach**: A TypeScript monorepo with a React frontend, a Node/TypeScript
API, and PostgreSQL persistence. The core differentiator is a **shared `stat-engine`
package** containing the pure, deterministic stat/synergy/damage calculations. The same
package runs **client-side** for instant recalculation (meeting the <200ms interactive
budget) and **server-side** for authoritative validation, persisted-loadout
recomputation, and the on-demand damage calculation. The backend serves the bundled,
versioned reference dataset (characters, weapons, artifact sets) and persists user
loadouts/teams. The on-demand damage calc (FR-016) runs client-side via `stat-engine` for
instant feedback on unsaved teams (US3); the server exposes a parity
`POST /teams/{id}/calculate` for saved teams (US4) using the same engine.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS (backend + tooling); React 18
(frontend). ECMAScript modules throughout.

**Primary Dependencies**:
- Frontend: React 18, Vite (build/dev), React Router (navigation), TanStack Query
  (server-state/data fetching + caching), Zustand (local loadout/team editing state).
- Backend: Fastify (HTTP API), Prisma (ORM + migrations), Zod (request/response
  validation, shared with frontend).
- Shared: `@app/stat-engine` workspace package — pure TypeScript, no I/O; depended on by
  both frontend and backend. Zod schemas for the dataset and contracts live in a
  `@app/contracts` shared package.
- Monorepo tooling: pnpm workspaces + Turborepo (task orchestration/caching).

**Storage**: PostgreSQL 16. Two logical domains: (1) **reference data** (characters,
skills, weapons, artifact sets — read-mostly, seeded from versioned curated JSON in
`data/`), served via the API; (2) **user data** (saved loadouts, teams) — read/write.

**Testing**: Vitest (unit, incl. `stat-engine` golden-value tests; backend service/unit),
Supertest + Vitest (API contract/integration tests against a disposable Postgres),
Playwright (frontend E2E for the user-story journeys). Vitest `bench` (tinybench) for
performance assertions on recalculation and damage calc.

**Target Platform**: Evergreen desktop + mobile web browsers (frontend); Linux container
(backend API + Postgres).

**Project Type**: Web application (frontend + backend) with a shared calculation package
— a pnpm monorepo.

**Performance Goals** (from Success Criteria + Constitution Principle IV):
- Stat recalculation after any gear change reflected to the user in <200ms p95
  (interactive budget), well within the spec's 1s ceiling (SC-002).
- On-demand team damage calculation returns results + assumptions in <5s for a full
  4-character team (SC-009).
- Character roster → full character view reachable in <10s of user effort (SC-001).

**Constraints**:
- Stat outputs MUST match in-game values within ±0.5% (±1 for integer-displayed fields) for ≥99% of
  fields across a ≥30-case golden set (SC-003); resonance/reaction reporting 100% correct
  on its golden set (SC-005).
- Instant recalculation requires the stat engine to run client-side (no network round
  trip on the hot path).
- Reference dataset MUST cover 100% of the targeted game version's roster and be
  refreshable per version (SC-008, FR-021).

**Scale/Scope**: Single user per deployment (no auth/multi-user this version). Dataset on
the order of ~100 characters, ~150 weapons, ~40 artifact sets. Per user: up to a few
hundred saved loadouts/teams. ~5 primary screens (roster, character/loadout, team
builder, saved loadouts, saved teams).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against the four principles in `.specify/memory/constitution.md` (v1.0.0).

### I. Code Quality
- **Plan**: ESLint + Prettier across all packages; CI fails on any lint/format error
  (constitution Quality Gate). Shared logic centralized in `stat-engine`/`contracts` to
  avoid duplication. Functions kept single-responsibility; pure calculation isolated from
  I/O. Every PR reviewed.
- **Status**: ✅ PASS — no organizational-only modules; the shared package reduces, not
  adds, duplication.

### II. Testing Standards (NON-NEGOTIABLE)
- **Note**: The Spec Kit `tasks-template` marks tests "optional." The constitution
  overrides this: for this feature **tests are REQUIRED and test-first**. `/speckit.tasks`
  MUST emit test tasks before implementation tasks.
- **Plan**: Test-first (Red→Green→Refactor). Each functional requirement maps to at least
  one automated test. `stat-engine` driven by golden-value tests sourced from known
  in-game numbers (satisfies SC-003/SC-005). Contract tests for every API endpoint;
  integration tests at the API↔DB boundary; Playwright E2E per user story. Coverage MUST
  NOT decrease; CI keeps the suite green.
- **Status**: ✅ PASS.

### III. User Experience Consistency
- **Plan**: A single shared component library + design tokens for consistent interaction,
  terminology, and visual conventions across all screens. A standard actionable-error
  shape (`{ code, message, remedy }`) used by both API and UI. API is versioned (`/api/v1`)
  so interface changes are explicit, never silent (FR breaking-change rule). Every user
  action gives visible success/failure/progress feedback; accessibility (keyboard + ARIA)
  treated as a requirement. Invalid artifact assignments are blocked with an explanation
  (FR-007).
- **Status**: ✅ PASS.

### IV. Performance Requirements
- **Plan**: Explicit budgets declared above (Performance Goals/Constraints). Client-side
  stat engine guarantees the <200ms recalculation budget without network cost. Automated
  Vitest `bench` assertions guard the recalculation and damage-calc paths; regressions
  beyond budget fail the build. Optimization is measurement-driven only.
- **Status**: ✅ PASS.

**Initial Constitution Check: ✅ PASS** — proceed to Phase 0.
**Post-Design Constitution Check (after Phase 1): ✅ PASS** — the data model, REST
contracts, and quickstart introduce no new principle violations; the shared `stat-engine`
keeps calculation logic single-sourced and testable, and the contracts encode the
versioned-API and actionable-error conventions.

## Project Structure

### Documentation (this feature)

```text
specs/001-genshin-loadout-manager/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── openapi.yaml      #   REST API contract (v1)
│   └── stat-engine.md    #   Shared calculation-package contract
├── checklists/
│   └── requirements.md   # Spec quality checklist (/speckit.specify output)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created here)
```

### Source Code (repository root)

```text
packages/
├── stat-engine/                 # Pure, deterministic calculations (no I/O)
│   ├── src/
│   │   ├── stats/               # base-stat curves, weapon/artifact aggregation, set bonuses
│   │   ├── synergy/             # resonance, reaction matrix, role coverage (rule-based)
│   │   └── damage/              # on-demand quantitative damage model + assumptions
│   └── tests/                   # golden-value unit tests (SC-003, SC-005)
└── contracts/                   # Shared Zod schemas + generated types (dataset + API)
    ├── src/
    └── tests/

backend/
├── src/
│   ├── models/                  # Prisma schema + domain types
│   ├── services/                # loadout, team, dataset, damage-calc services
│   ├── api/                     # Fastify routes (v1): characters, weapons, sets, loadouts, teams, calculate
│   └── db/                      # prisma client, migrations, dataset seeding
└── tests/
    ├── contract/                # endpoint contract tests (Supertest)
    ├── integration/             # API ↔ Postgres integration
    └── unit/

frontend/
├── src/
│   ├── components/              # shared component library + design tokens
│   ├── pages/                   # roster, character/loadout, team-builder, saved-loadouts, saved-teams
│   ├── services/                # API client (typed via @app/contracts)
│   └── state/                   # Zustand stores + TanStack Query hooks
└── tests/
    ├── unit/
    └── e2e/                     # Playwright per user story (US1–US4)

data/
└── <game-version>/              # curated reference dataset (source of truth, seeds DB)
    ├── characters.json
    ├── weapons.json
    └── artifact-sets.json
```

**Structure Decision**: A pnpm + Turborepo **monorepo** with `frontend/`, `backend/`,
and two shared packages (`packages/stat-engine`, `packages/contracts`). The shared
`stat-engine` is the keystone: identical calculation code runs client-side (instant
recalculation, satisfying Principle IV's <200ms budget) and server-side (authoritative
validation + on-demand damage calc), and is the single place golden-value tests assert
in-game accuracy (Principle II, SC-003/SC-005). The `data/` directory holds the versioned
curated dataset (FR-021), seeded into Postgres and served via the versioned REST API.

## Complexity Tracking

> No Constitution Check violations. The two shared packages are documented here only for
> transparency; neither violates a principle (the constitution's four principles do not
> include a separate "simplicity" gate, and these packages *reduce* duplication).

| Decision | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|-------------------------------------|
| Shared `stat-engine` package (monorepo) | Identical calc must run on client (instant recalc, Principle IV) and server (authoritative damage calc/validation) | Duplicating calc per side would violate Code Quality (duplication) and risk client/server divergence in accuracy-critical math |
| Backend + Postgres (vs local-first SPA) | User explicitly chose full-stack for server-side persistence and future cross-device sync / multi-user | Local-first SPA rejected per the user's stack decision; revisit if requirements stay single-device |
