# Phase 0 Research: Genshin Impact Loadout & Team Builder

**Feature**: `001-genshin-loadout-manager` | **Date**: 2026-06-23

This document resolves the unknowns implied by the Technical Context and records the key
technology and domain-model decisions. Each entry: **Decision / Rationale / Alternatives
considered**.

## Domain decisions

### D1. Character base-stat model (level + ascension)

- **Decision**: Model each character's base HP/ATK/DEF as a (base value × level-growth
  curve) plus discrete **ascension-phase bonuses** applied at the 6 ascension breakpoints,
  plus the character's dedicated **ascension stat** (e.g., Crit Rate, Elemental Mastery)
  that accrues across phases. Store per-character base values and the shared growth-curve
  multipliers in the dataset; compute the value for any (level, ascension phase) in
  `stat-engine`.
- **Rationale**: Mirrors the game's actual mechanic, including the stat jump at ascension
  breakpoints (an explicit spec edge case). Keeps per-character data small (base + curve
  id) while remaining exact enough for SC-003.
- **Alternatives considered**: Precomputing every (level, ascension) row per character —
  rejected as bloated and harder to keep correct across versions. A single linear
  approximation — rejected: fails accuracy at ascension breakpoints.

### D2. Final-stat aggregation order

- **Decision**: Compute final stats as: base (D1) → **+ flat additions** (weapon base
  ATK, artifact flat main/substats) → **+ percentage bonuses** (artifact %, set bonuses,
  weapon passive %) applied to the relevant base → **+ direct stats** (Crit, EM, ER, DMG
  bonuses). ATK% applies to (character base ATK + weapon base ATK) per game rules.
  Implement as an explicit, ordered, documented pipeline in `stat-engine/src/stats`.
- **Rationale**: The percentage-applies-to-base-plus-weapon rule is the single most common
  source of calculator inaccuracy; making the order explicit and unit-tested protects
  SC-003.
- **Alternatives considered**: Naive "sum everything" — rejected: produces wrong ATK%
  behavior.

### D3. Artifact slot/main-stat/substat validity

- **Decision**: Encode per-slot allowed main stats (flower→flat HP, plume→flat ATK only;
  sands/goblet/circlet→a fixed allowed set) and the global substat pool as data-driven
  tables in the dataset, validated by Zod in `@app/contracts`. Invalid assignments are
  rejected both client-side (immediate UX, FR-007) and server-side (authoritative).
- **Rationale**: Satisfies FR-006/FR-007 and the "conflicting main stats" edge case; data
  tables keep it maintainable per version.
- **Alternatives considered**: Hard-coded validity in UI only — rejected: server must also
  enforce; duplicated logic violates Code Quality.

### D4. Synergy model (default, rule-based — FR-015)

- **Decision**: Three deterministic rule modules in `stat-engine/src/synergy`:
  (1) **Resonance** — map element counts to active resonances (≥2 same element);
  (2) **Reactions** — derive the set of triggerable reactions from the unordered pairs of
  distinct elements present, via a static reaction matrix; (3) **Role coverage** — tag each
  character in the dataset with roles (DPS/sub-DPS/healer/shielder/buffer/battery) and
  report coverage + gaps. Always returns a non-empty assessment (spec edge case).
- **Rationale**: Fully deterministic and testable to 100% on a golden set (SC-005); no
  damage simulation required for the default view (FR-015 constraint).
- **Alternatives considered**: ML/heuristic "tier" scoring — rejected: non-deterministic,
  untestable, out of scope.

### D5. On-demand quantitative damage model (FR-016)

- **Decision**: A documented standard damage formula in `stat-engine/src/damage`:
  `hit = talentMultiplier × scalingStat × (1 + dmgBonus%) × critFactor ×
  reactionMultiplier × enemyDefFactor × enemyResFactor`, run only when the user invokes
  it. The computation returns the estimate **together with its assumptions** (rotation,
  enemy level/RES baseline, reaction type), surfaced in the UI (FR-016).
- **v1 rotation model**: one generic rotation — a single cast each of Elemental Burst and
  Elemental Skill plus a fixed normal/charged-attack string per member, at configured
  talent levels, vs. a Lv 90 / 10% RES baseline; reaction multipliers applied when team
  elements enable a reaction. Per-character optimized rotations are out of scope for v1.
- **Rationale**: Keeps the headline default view cheap while offering depth on demand;
  explicit assumptions make the estimate honest and reproducible. Pure function → unit
  testable and benchmarkable (SC-009, <5s).
- **Alternatives considered**: Full frame-by-frame rotation simulator — rejected: massive
  scope, not requested. No damage at all — rejected: user explicitly requested option C.

### D6. Reference dataset sourcing & versioning (FR-021 / SC-008)

- **Decision**: Maintain a **curated, versioned JSON dataset** under `data/<game-version>/`
  as the source of truth, validated by Zod schemas in `@app/contracts`, and seeded into
  Postgres. Each dataset is stamped with a `datasetVersion`/game-version; the API exposes
  the active version. A documented refresh procedure regenerates the dataset for each new
  game version.
- **Rationale**: Self-contained and reproducible; covers the full roster (SC-008) and keeps
  saved loadouts referencing stable IDs across versions (spec edge case re: data updates).
- **Alternatives considered**: Live third-party API at runtime — rejected: external
  availability/coupling risk, breaks offline determinism of tests. User-imported data —
  rejected per Q2 (must ship full roster).

## Technology decisions

### T1. Monorepo tooling — pnpm workspaces + Turborepo
- **Decision**: pnpm workspaces for the `frontend`/`backend`/`packages/*` layout; Turborepo
  for cached build/test/lint task graphs.
- **Rationale**: First-class support for a shared `stat-engine` consumed by both client and
  server; fast incremental CI (supports the always-green suite requirement).
- **Alternatives**: npm/yarn workspaces (weaker caching), Nx (heavier than needed).

### T2. Backend framework — Fastify
- **Decision**: Fastify with a versioned `/api/v1` prefix.
- **Rationale**: High throughput, first-class JSON-schema/Zod validation, low overhead;
  supports the actionable-error envelope and API versioning (Principle III).
- **Alternatives**: Express (slower, less schema-native), NestJS (more ceremony than this
  single-user scope needs).

### T3. ORM & DB — Prisma + PostgreSQL 16
- **Decision**: Prisma for schema, migrations, and typed access; Postgres for reference +
  user data.
- **Rationale**: Type-safe DB layer aligns with the end-to-end TypeScript types; migrations
  give a controlled path for per-version dataset reseeds.
- **Alternatives**: Drizzle (newer, fewer guardrails for this team), raw SQL (more
  boilerplate, weaker type-safety).

### T4. Frontend state — TanStack Query + Zustand
- **Decision**: TanStack Query for server data (roster, saved loadouts/teams) with caching;
  Zustand for transient in-editor loadout/team state driving the client-side stat engine.
- **Rationale**: Clean split of server-cache vs local-edit state; enables instant,
  network-free recalculation (Principle IV).
- **Alternatives**: Redux Toolkit (heavier), Context-only (re-render/perf issues on the hot
  recalculation path).

### T5. Shared validation — Zod in `@app/contracts`
- **Decision**: Single Zod schema set for dataset shapes and API request/response bodies,
  shared by client and server, with inferred TypeScript types.
- **Rationale**: One source of truth for contracts → no client/server drift (Code Quality),
  enforced validity (FR-007), basis for contract tests (Principle II).
- **Alternatives**: Hand-written types + separate validators — rejected: duplication/drift.

### T6. Test stack — Vitest + Supertest + Playwright + Vitest bench
- **Decision**: Vitest for unit/golden tests, Supertest+Vitest for API contract/integration
  (disposable Postgres), Playwright for E2E per user story, Vitest `bench` for perf gates.
- **Rationale**: One runner across the monorepo; covers every layer the constitution
  mandates (unit, contract, integration, E2E, perf). Golden tests anchor SC-003/SC-005.
- **Alternatives**: Jest (slower in ESM/TS), Cypress (heavier than Playwright here).

### T7. UI consistency — shared component library + design tokens
- **Decision**: A small in-repo component library and design-token set; standard
  `{ code, message, remedy }` error component; accessibility (keyboard/ARIA) baked into
  base components.
- **Rationale**: Directly implements Principle III (consistent patterns, actionable errors,
  a11y as requirement) across all screens.
- **Alternatives**: Ad-hoc per-page styling — rejected: violates UX consistency.

## Resolved unknowns

All Technical Context items are concrete; **no `NEEDS CLARIFICATION` markers remain**. The
two spec-level clarifications (synergy depth, reference-data source) were resolved during
`/speckit.specify` (FR-015/FR-016, FR-021) and are reflected in D4/D5/D6 above.
