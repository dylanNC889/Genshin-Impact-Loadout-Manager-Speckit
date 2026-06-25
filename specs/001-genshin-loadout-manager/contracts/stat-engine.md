# Contract: `@app/stat-engine` (shared calculation package)

**Feature**: `001-genshin-loadout-manager` | **Date**: 2026-06-23

The `stat-engine` is a **pure, deterministic, I/O-free** TypeScript package consumed by
both the frontend (instant client-side recalculation — Principle IV) and the backend
(authoritative validation + on-demand damage calc). This file is the behavioral contract;
the same function signatures back the contract tests (Principle II). All functions are
**pure**: identical inputs → identical outputs, no side effects, no clock/network.

## Inputs

All reference data (curves, ascension tables, set bonuses, slot rules, resonance/reaction
matrices) is passed in explicitly from the dataset — the engine holds no global state.

## Functions

### `computeBaseStats(character, level, ascensionPhase): StatValue[]`
- Returns HP/ATK/DEF plus the ascension stat at the given level + ascension phase (D1).
- **Contract**: applies the ascension-breakpoint additions; result for a known
  (character, level, phase) matches the in-game value within rounding tolerance (SC-003).

### `computeFinalStats(input): { stats: StatValue[], activeSetBonuses: SetBonus[] }`
- `input`: { character, level, ascensionPhase, weapon?, artifacts[0..5] }.
- Returns final effective stats in the **D2 aggregation order** (base → flat → percent →
  direct), plus which 2pc/4pc set bonuses are active (FR-008/FR-009).
- **Contract**:
  - ATK% applies to (character baseATK + weapon baseATK), not artifact flat ATK.
  - Partial loadouts (missing weapon/slots) compute without error (FR-011).
  - Deterministic; benchmarked under the <200ms interactive budget for a full loadout.

### `validateArtifact(artifact, slotRules): ValidationResult`
- **Contract**: rejects a main stat not allowed for the slot, duplicate substats, a
  substat equal to the main stat, or >4 substats — each with an actionable
  `{ code, message, remedy }` (FR-007). Same function used client- and server-side.

### `assessSynergy(team, dataset): SynergyAssessment`
- `team`: up to 4 { character, loadout? }.
- Returns active resonances, the set of triggerable reactions, and role coverage + gaps;
  `complete=false` when <4 members (FR-013/14/15, US3 scenario 5).
- **Contract**: never returns an empty/error assessment (spec edge case); resonance &
  reaction outputs are 100% correct on the golden set (SC-005); distinct-character
  precondition assumed (enforced at the Team boundary).

### `estimateTeamDamage(team, options): DamageEstimate`
- **On-demand only** (FR-016). Returns total + per-character estimates **with the
  assumptions used** (enemy level/RES, rotation, reaction types) echoed back.
- **Contract**: pure given options; documented standard formula (D5); completes well within
  the 5s budget for 4 characters (SC-009). Result object always carries `assumptions`.

## Non-goals
- No persistence, no HTTP, no dataset loading (callers supply data).
- No frame-by-frame rotation simulation (out of scope — D5).

## Test obligations (Principle II)
- Golden-value unit tests for `computeBaseStats` / `computeFinalStats` (≥30 cases, SC-003).
- Full-coverage tests for `assessSynergy` resonance/reaction matrices (SC-005).
- Validity tests for every slot rule in `validateArtifact` (FR-007).
- Benchmark assertions: `computeFinalStats` <200ms; `estimateTeamDamage` <5s.
