---
description: "Task list for Genshin Impact Loadout & Team Builder"
---

# Tasks: Genshin Impact Loadout & Team Builder

**Input**: Design documents from `/specs/001-genshin-loadout-manager/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: REQUIRED for this feature. The project constitution (`.specify/memory/constitution.md`)
Principle II — *Testing Standards (NON-NEGOTIABLE)* — mandates test-first (Red→Green→Refactor),
overriding the Spec Kit template's "tests optional" default. Test tasks therefore precede their
implementation tasks within every user story.

**Organization**: Tasks are grouped by user story (US1–US4) for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story the task belongs to (US1, US2, US3, US4)
- Exact file paths are included in each description

## Path Conventions

Monorepo (pnpm + Turborepo) per plan.md:
- Shared: `packages/stat-engine/`, `packages/contracts/`
- Backend: `backend/src/`, `backend/tests/`
- Frontend: `frontend/src/`, `frontend/tests/`
- Dataset: `data/<game-version>/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo initialization and tooling (Constitution Quality Gates).

- [X] T001 Initialize pnpm + Turborepo monorepo at repo root: `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- [X] T002 [P] Add shared TypeScript config `tsconfig.base.json` and per-package `tsconfig.json` files
- [X] T003 [P] Configure ESLint + Prettier at repo root (`.eslintrc.cjs`, `.prettierrc`) with zero-error rule (Principle I)
- [X] T004 [P] Scaffold workspace packages with `package.json` each: `packages/contracts/`, `packages/stat-engine/`, `backend/`, `frontend/`
- [X] T005 [P] Configure Vitest workspace (unit + integration) and Vitest `bench` in `vitest.workspace.ts` (Principles II/IV)
- [X] T006 [P] Configure Playwright (`playwright.config.ts`) and install browsers for `frontend/tests/e2e`
- [X] T007 [P] Add `docker-compose.yml` for PostgreSQL 16 and `backend/.env.example` (DATABASE_URL)
- [X] T008 Add CI workflow `.github/workflows/ci.yml` running lint + test + bench, failing on any gate violation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schemas, the stat-engine skeleton, DB + dataset, API/frontend shells.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T009 [P] Define shared Zod schemas + inferred types for enums, `StatValue`, dataset entities, and the `{code,message,remedy}` error envelope in `packages/contracts/src/` (per contracts/openapi.yaml, data-model.md)
- [X] T010 [P] Define Zod schemas for API bodies (`Loadout`, `Team`, `SynergyAssessment`, `DamageEstimate`) in `packages/contracts/src/`
- [X] T011 Create `stat-engine` skeleton with public signatures/types (`computeBaseStats`, `computeFinalStats`, `validateArtifact`, `assessSynergy`, `estimateTeamDamage`) in `packages/stat-engine/src/` per contracts/stat-engine.md (stubs throw "not implemented")
- [ ] T012 Define Prisma schema for reference + user entities (Character, Skill, Weapon, ArtifactSet, rule tables, Loadout, Team, TeamSlot, User, DatasetMeta) in `backend/src/db/schema.prisma` per data-model.md
- [ ] T013 Generate initial Prisma migration and DB client module in `backend/src/db/`
- [X] T014 Author curated reference dataset covering the full current roster (FR-021/SC-008) in `data/<game-version>/{characters,weapons,artifact-sets}.json` plus slot-stat/resonance/reaction rule tables; validate against `@app/contracts`
- [ ] T015 Implement dataset seed script `backend/src/db/seed.ts` loading `data/<game-version>/` into Postgres and stamping `DatasetMeta`
- [X] T016 [P] Implement Fastify server skeleton (`/api/v1` prefix, health route, error-envelope handler, `GET /meta/dataset`) in `backend/src/api/`
- [X] T017 [P] Scaffold frontend shell: Vite + React Router routes, base layout, shared component library + design tokens, typed API client base in `frontend/src/` (Principle III)
- [X] T018 [P] Set up frontend state: TanStack Query provider + Zustand store scaffolding in `frontend/src/state/`

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 - Browse & inspect a character (Priority: P1) 🎯 MVP

**Goal**: Select any character and view base stats, element/weapon, and full skills; change level/ascension.

**Independent Test**: Select a character with no gear; displayed base stats, element, weapon type, and skill descriptions match reference values; changing level/ascension updates base stats.

### Tests for User Story 1 ⚠️ (write first, must fail before implementation)

- [X] T019 [P] [US1] Golden-value unit tests for `computeBaseStats` (incl. ascension breakpoints) in `packages/stat-engine/tests/base-stats.test.ts` (SC-003)
- [X] T020 [P] [US1] Contract tests for `GET /characters` and `GET /characters/{id}` in `backend/tests/contract/characters.contract.test.ts`
- [ ] T021 [P] [US1] Integration test for character list/detail against seeded Postgres in `backend/tests/integration/characters.int.test.ts`
- [ ] T022 [P] [US1] Playwright E2E: roster browse → select → view stats/skills → change level/ascension in `frontend/tests/e2e/us1-character.spec.ts`

### Implementation for User Story 1

- [X] T023 [US1] Implement `computeBaseStats` in `packages/stat-engine/src/stats/base-stats.ts` (D1) to pass T019
- [X] T024 [P] [US1] Implement character service (list/search/filter + detail with skills) in `backend/src/services/character.service.ts`
- [X] T025 [US1] Implement `GET /characters` and `GET /characters/{id}` routes in `backend/src/api/characters.ts` (FR-001/002/004)
- [X] T026 [P] [US1] Implement roster page with search/filter by name/element/weapon in `frontend/src/pages/Roster.tsx` (FR-001)
- [X] T027 [US1] Implement character detail page (base stats, element/weapon, skills, level/ascension control wired to client-side `computeBaseStats`) in `frontend/src/pages/Character.tsx` (FR-002/003/004)

**Checkpoint**: US1 fully functional and independently testable — MVP deliverable.

---

## Phase 4: User Story 2 - Build loadout & see recalculated stats (Priority: P2)

**Goal**: Equip weapon + 5 artifacts (sets/main/substats); final stats and active set bonuses recalculate instantly.

**Independent Test**: Equip a known weapon + 5 artifacts; recalculated final stats and 2pc/4pc indicators match expected values; invalid main stats are rejected; swaps recalc immediately. (Client-side; no persistence.)

### Tests for User Story 2 ⚠️

- [X] T028 [P] [US2] Golden-value tests for `computeFinalStats` (weapon + artifacts + set bonuses, D2 order) in `packages/stat-engine/tests/final-stats.test.ts` (SC-003)
- [X] T029 [P] [US2] Unit tests for `validateArtifact` per-slot rules in `packages/stat-engine/tests/validate-artifact.test.ts` (FR-007)
- [X] T030 [P] [US2] Bench: `computeFinalStats` <200ms for a full loadout in `packages/stat-engine/tests/final-stats.bench.ts` (Principle IV/SC-002)
- [X] T031 [P] [US2] Contract tests for `GET /weapons` and `GET /artifact-sets` in `backend/tests/contract/reference.contract.test.ts`
- [ ] T032 [P] [US2] Playwright E2E: equip weapon + 5 artifacts, invalid-stat rejection, swap/remove recalculation, partial-loadout display (missing weapon/slots, FR-011) in `frontend/tests/e2e/us2-loadout.spec.ts`

### Implementation for User Story 2

- [X] T033 [US2] Implement `computeFinalStats` + active set-bonus detection in `packages/stat-engine/src/stats/final-stats.ts` (FR-008/009) to pass T028/T030
- [X] T034 [US2] Implement `validateArtifact` using slot-stat rule tables in `packages/stat-engine/src/stats/validate-artifact.ts` (FR-006/007) to pass T029
- [X] T035 [P] [US2] Implement weapons & artifact-sets reference services in `backend/src/services/reference.service.ts`
- [X] T036 [US2] Implement `GET /weapons` and `GET /artifact-sets` routes in `backend/src/api/reference.ts` (FR-005/009)
- [X] T037 [US2] Implement loadout editor (weapon picker; 5 artifact slots with main/substat selectors + inline validation; immediate final-stat display; active set-bonus indicator; partial-loadout handling) in `frontend/src/pages/Character.tsx` loadout panel (FR-005..011)

**Checkpoint**: US1 + US2 both work independently.

---

## Phase 5: User Story 3 - Build team & evaluate synergy (Priority: P3)

**Goal**: Assemble 4 distinct characters; show resonance, possible reactions, role coverage/gaps; on-demand damage estimate with assumptions.

**Independent Test**: Add 4 distinct characters; resonance and reaction list are correct; role gaps surfaced; partial team shows partial assessment; Calculate returns estimate + assumptions. (Client-side over the loaded dataset; no persistence.)

### Tests for User Story 3 ⚠️

- [X] T038 [P] [US3] Golden tests for `assessSynergy` resonance + reaction matrix (full coverage) in `packages/stat-engine/tests/synergy.test.ts` (SC-005)
- [X] T039 [P] [US3] Unit tests for role-coverage gaps, non-empty assessment, and partial team in `packages/stat-engine/tests/role-coverage.test.ts` (FR-015)
- [X] T040 [P] [US3] Tests + bench for `estimateTeamDamage` (<5s, returns assumptions) in `packages/stat-engine/tests/damage.test.ts` (SC-009/FR-016)
- [ ] T041 [P] [US3] Playwright E2E: add 4 distinct (reject 5th/duplicate), resonance/reactions, gaps, partial team, per-slot loadout association (FR-017), Calculate shows estimate+assumptions in `frontend/tests/e2e/us3-team.spec.ts`

### Implementation for User Story 3

- [X] T042 [US3] Implement `assessSynergy` (resonance, reaction matrix, role coverage) in `packages/stat-engine/src/synergy/index.ts` (FR-013/014/015) to pass T038/T039
- [X] T043 [US3] Implement `estimateTeamDamage` with documented assumptions in `packages/stat-engine/src/damage/index.ts` (FR-016, D5) using the v1 generic rotation (see spec Assumptions / research D5) to pass T040
- [X] T044 [US3] Implement team builder UI (4 slots; distinct enforcement; associate per-slot loadout; synergy panel: resonance/reactions/role gaps; partial assessment) in `frontend/src/pages/TeamBuilder.tsx` (FR-012/013/014/015/017)
- [X] T045 [US3] Wire on-demand Calculate button to client-side `estimateTeamDamage`, rendering estimate + assumptions in `frontend/src/pages/TeamBuilder.tsx` (FR-016)

**Checkpoint**: US1–US3 all independently functional.

---

## Phase 6: User Story 4 - Save & manage loadouts and teams (Priority: P4)

**Goal**: Persist named loadouts/teams; reopen across sessions; duplicate; delete; server-backed CRUD + management UI.

**Independent Test**: Save a named loadout and team; restart session; both restore intact; duplicate creates an independent copy; delete removes it.

### Tests for User Story 4 ⚠️

- [X] T046 [P] [US4] Contract tests for loadouts CRUD + `/duplicate` in `backend/tests/contract/loadouts.contract.test.ts`
- [X] T047 [P] [US4] Contract tests for teams CRUD + server `/calculate` in `backend/tests/contract/teams.contract.test.ts`
- [X] T048 [P] [US4] Integration tests: save → reopen across sessions, duplicate independence, delete (loadouts & teams) in `backend/tests/integration/persistence.int.test.ts` (SC-006)
- [ ] T049 [P] [US4] Playwright E2E: save loadout+team, reload session, restore intact, duplicate, delete in `frontend/tests/e2e/us4-manage.spec.ts`

### Implementation for User Story 4

- [X] T050 [US4] Implement loadout service + CRUD/duplicate with server-side recompute via `stat-engine` in `backend/src/services/loadout.service.ts` (FR-018)
- [X] T051 [US4] Implement loadouts routes (GET/POST/PUT/DELETE + `/duplicate`) in `backend/src/api/loadouts.ts` (FR-018)
- [X] T052 [US4] Implement team service + CRUD with synergy derivation and server `/calculate` in `backend/src/services/team.service.ts` (FR-019/FR-016)
- [X] T053 [US4] Implement teams routes (GET/POST/PUT/DELETE + `/calculate`) in `backend/src/api/teams.ts` (FR-019)
- [X] T054 [P] [US4] Implement saved-loadouts & saved-teams management pages (list, open, duplicate, delete) + session restore in `frontend/src/pages/SavedLoadouts.tsx` and `frontend/src/pages/SavedTeams.tsx` (FR-018/019/020)

**Checkpoint**: All user stories independently functional and persistent.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Constitution gates, accessibility, coverage, acceptance.

- [X] T055 [P] Accessibility pass (keyboard nav + ARIA) across shared components in `frontend/src/components/` (Principle III)
- [X] T056 [P] Verify full-roster dataset coverage (100% of targeted version) and add a coverage check to `data/` tooling (SC-008)
- [X] T057 [P] Wire CI perf gate to run `stat-engine` benches and fail on budget regression (Principle IV)
- [X] T058 [P] Actionable-error consistency tests across the API surface (envelope shape) in `backend/tests/contract/errors.contract.test.ts` (Principle III)
- [X] T059 Run `quickstart.md` end-to-end and confirm SC-001..SC-009 (acceptance)
- [X] T060 [P] Root `README.md` with setup/run/test and the per-version dataset refresh procedure

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**.
- **User Stories (Phases 3–6)**: All depend on Foundational. Then orderable by priority (P1→P2→P3→P4) or in parallel by different developers (see independence notes).
- **Polish (Phase 7)**: Depends on the targeted user stories being complete.

### User Story Dependencies & Independence

- **US1 (P1)**: Depends only on Foundational. Pure MVP.
- **US2 (P2)**: Depends on Foundational. Reuses the character page shell from US1 but is testable on its own (client-side recalc; no persistence). If built before US1's page exists, create a minimal host page.
- **US3 (P3)**: Depends on Foundational + the seeded dataset. Independent of US2 (operates on base or geared characters; gear association optional). Client-side; no persistence.
- **US4 (P4)**: Depends on Foundational. Persists the loadouts/teams produced by US2/US3 but the backend CRUD + management UI are independently testable via API/E2E.

### Within Each User Story

- Tests are written and MUST FAIL before implementation (Principle II).
- `stat-engine` functions before the UI/services that consume them.
- Services before routes; routes before the frontend wiring that calls them.

---

## Parallel Execution Examples

```bash
# Setup — independent config tasks together:
T002, T003, T004, T005, T006, T007

# Foundational — shared schemas + shells in parallel (after T009/T010 land types):
T016, T017, T018   # server shell, frontend shell, state setup

# US1 tests (all [P], before implementation):
T019, T020, T021, T022

# US3 tests (all [P]):
T038, T039, T040, T041
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (browse + inspect a character) → deploy/demo.

### Incremental Delivery

- Foundation → **US1** (character reference, MVP) → **US2** (loadout recalc — the headline) → **US3** (team synergy + damage) → **US4** (persistence/management). Each adds value without breaking prior stories.

### Parallel Team Strategy

After Foundational: Dev A → US1, Dev B → US2, Dev C → US3, Dev D → US4 backend. The shared `stat-engine` functions are the only cross-cut — coordinate on `packages/stat-engine/src` to avoid file conflicts (each story owns distinct files there).

---

## Notes

- **[P]** = different files, no incomplete dependencies.
- **Tests are REQUIRED** here (Constitution Principle II) — do not skip; verify they fail before implementing.
- The shared `stat-engine` keeps accuracy-critical math single-sourced (Principle I) and runs client-side for instant recalc (Principle IV).
- Commit after each task or logical group; keep the suite green (Principle II).
- Total: **60 tasks** — Setup 8, Foundational 10, US1 9, US2 10, US3 8, US4 9, Polish 6.
