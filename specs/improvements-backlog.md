# Improvements Backlog — Design Specs

Future-improvement specs for the Genshin Impact Loadout & Team Builder, following the initial
feature (`specs/001-genshin-loadout-manager/`) and the shipped enhancement passes. Each item is
self-contained: **Problem → Approach → Data → Files → Effort → Risks → Acceptance**. Effort is
**S** (≲½ day), **M** (~1–2 days), **L** (multi-day).

Nothing here is committed to being built — this is the menu. Suggested sequencing is at the end.

---

## Theme A — Accuracy (make the numbers real)

The stat/damage math is honest but coarse: constellations & refinements are display-only, team
damage sums characters in isolation, and reactions are a flat multiplier. These four close that gap.

### A1. Apply constellations & weapon refinements to stats/damage ⭐ (L)

**Problem.** C1–C6 and weapon refinements are imported and *displayed* but never affect
`computeFinalStats`/`estimateTeamDamage`. A C6 Hu Tao and a C0 Hu Tao show identical stats.

**Approach.** genshin-db has no *structured* modifiers, so introduce a curated modifier table.
- New contract type `StatModifier { stat: StatKey; value: number; kind: "flat" | "pct" }` plus
  `ConstellationEffect { level; modifiers: StatModifier[] }` and `RefinementEffect { rank; modifiers }`.
- Curate the subset that grants **static** stat/CRIT/DMG bonuses (≈20–30 constellations, ≈40
  weapons) in `data/modifiers/{constellations,weapon-refinements}.json`; leave conditional/rotational
  effects out of v1 (flag them as "not modeled" in the UI).
- Extend `computeFinalStats` to accept `constellation: number` and `refinement: number` and fold the
  matching modifiers into the existing stat pools (same routing as artifact 2pc/4pc bonuses).
- Loadout gains `constellation` (0–6) and `refinement` (1–5); add selectors in `LoadoutEditor`.

**Data.** Curated modifier tables (author from the game/KQM). Start with the highest-impact units.

**Files.** `packages/contracts/src/index.ts`, `packages/stat-engine/src/stats/final-stats.ts`,
`data/modifiers/*`, `packages/dataset/src/index.ts` (load tables), `frontend/src/components/LoadoutEditor.tsx`,
`frontend/src/state/loadoutStore.ts`.

**Risks.** Curation scope creep; conditional effects (Furina Fanfare, Hu Tao C1) can't be static.
Mitigate: v1 = static bonuses only, clearly labeled; grow the table over time.

**Acceptance.** Selecting C1/C2/… and R1–R5 changes Final Stats for the curated set; golden tests
for ≥10 constellations/refinements; unmodeled effects render a "conditional — not in stats" note.

### A2. Teammate buffs in team damage ⭐ (M)

**Problem.** `estimateTeamDamage` treats each member independently, so Bennett/Kazuha/Furina add
nothing to teammates — team totals are "sum of solos" and badly understate real output.

**Approach.** Add a team-buff layer before the per-character calc.
- Define `TeamBuff { source; appliesTo: "all" | Element; flatATK?; atkPct?; dmgBonusPct?; critRate?; critDmg?; emShred?; resShredPct? }`.
- Curated buff table keyed by character id for the common enablers (Bennett flat ATK, Kazuha/Sucrose
  EM-based shred+VV, Furina Fanfare %, Nahida EM, Yelan/Xingqiu, Zhongli RES shred).
- `estimateTeamDamage` aggregates active buffs from the assembled team and applies them to each
  member (respecting element filters), extending `DamageMember` inputs.
- Surface active buffs in the assumptions/output ("+ Bennett ATK, + Kazuha VV −40% RES").

**Data.** Curated per-character team-buff table (~20 enablers cover most teams).

**Files.** `packages/contracts/src/index.ts`, `packages/stat-engine/src/damage/index.ts`,
`data/team-buffs.json` (or a frontend module), `frontend/src/pages/TeamBuilder.tsx`.

**Risks.** Buff snapshotting/uptime is nuanced (assume 100% uptime in v1); some buffs scale off the
buffer's stats (Kazuha EM) — needs the buffer's sheet, so compute buffers first.

**Acceptance.** A Bennett/Kazuha team shows materially higher per-member and total damage than the
same characters without them; assumptions list the applied buffs; golden test for one canonical team.

### A3. EM-based reaction formula (M)

**Problem.** Reactions are a flat 1.5×/2× preset; EM builds gain nothing, which is backwards.

**Approach.** Replace the flat multiplier with the real amplifying formula:
`amp = base(1.5 Melt-fwd / 2.0 Vape-fwd …) × (1 + 2.78·EM/(EM+1400))`. Pull each member's EM from
their final sheet. Extend to transformative reactions (Overload/Bloom/Aggravate/Spread) as a second
step if desired (level-scaled base × reaction multiplier × EM bonus).

**Files.** `packages/stat-engine/src/damage/index.ts` (+ an `emReactionBonus` helper),
`frontend/src/pages/TeamBuilder.tsx` (reaction picker already exists).

**Risks.** Transformative reactions need enemy-level base values (a small table). Keep v1 to
amplifying reactions; add transformative behind the same picker later.

**Acceptance.** Raising a member's EM raises the reaction-boosted estimate; golden test at EM 0/200/1000.

### A4. Damage breakdown (M)

**Problem.** The estimate is a single opaque number — not inspectable or trustworthy.

**Approach.** Return a per-instance breakdown from `estimateTeamDamage`
(`instances: { label; damage }[]` per character: NA / Charged / Skill / Burst using the talent
`scaling` rows we already import), and render an expandable breakdown per character in the damage panel.

**Files.** `packages/contracts/src/index.ts` (extend `DamageEstimate`), `packages/stat-engine/src/damage/index.ts`,
`frontend/src/pages/TeamBuilder.tsx`.

**Risks.** Mapping talent scaling rows → a rotation is approximate; label it "illustrative rotation".

**Acceptance.** Each character row expands to show labeled instances that sum to its total.

---

## Theme B — Features

### B1. Artifact optimizer ⭐ (L)

**Problem.** The app builds one loadout at a time; it can't answer "given my artifacts, what's the
best 5-piece for this character?" — the core value of tools like genshin-optimizer.

**Approach.**
- **Inventory:** import artifacts via the **GOOD** JSON format (Genshin Open Object Description) —
  paste/upload; store to FileStore/localStorage as an `Artifact[]` inventory.
- **Optimizer:** given a character + target formula (reuse the damage/stat model) + constraints
  (set, main stats, min ER), search combinations for the best result. Prune with per-slot top-K and
  a branch-and-bound on an upper bound; run in a Web Worker to keep the UI responsive.
- **UI:** an "Optimize" tab that shows the top-N builds and one-click applies to the loadout editor.

**Data.** User inventory (GOOD import). No external data.

**Files.** New `packages/optimizer/` (pure search), `packages/contracts` (Artifact/GOOD types),
backend inventory routes + FileStore, `frontend/src/pages/Optimize.tsx`, a Web Worker.

**Risks.** Combinatorics (5 slots × dozens each). Mitigate with top-K pruning + worker + a capped
result set; be explicit it's a heuristic optimum, not exhaustive, when capped.

**Acceptance.** Import a GOOD file → pick a character + set/main constraints → get ranked builds within
a few seconds → apply one; unit tests on the search with a small fixed inventory.

### B2. Build compare (M)

**Problem.** No way to compare two builds; you have to eyeball two tabs.

**Approach.** A compare view that takes two loadouts (saved ids or share codes) and renders their
Final Stats side-by-side with deltas (green/red), plus the on-demand damage delta. Reuse
`computeFinalStats`; new `/compare?a=<>&b=<>` route.

**Files.** `frontend/src/pages/Compare.tsx`, `App.tsx` (route/nav), reuse `share.ts` + stat-engine.

**Risks.** Low. Mostly presentational.

**Acceptance.** Two builds render side-by-side with per-stat deltas; deep-linkable via share codes.

### B3. Weapon / artifact detail pages (S–M)

**Problem.** Weapons/Artifacts pages are flat lists; clicking does nothing.

**Approach.** `/weapon/:id` and `/artifact/:id` detail routes: full passive/refinement text, base-ATK
curve, and a **"used by"** reverse lookup computed from `recommendations.ts` (which characters
recommend it). Make the list cards links.

**Files.** `frontend/src/pages/Weapon.tsx`, `Artifact.tsx`, `App.tsx`, small reverse-index helper over
`RECOMMENDATIONS`.

**Risks.** Low. Refinement text needs the A1 curation for full value (otherwise description-only).

**Acceptance.** Clicking a weapon/set opens a detail page listing its recommending characters.

### B4. Roster upgrades (S)

**Problem.** Roster filters are name/element/weapon only; no sort, rarity filter, region, or favorites.

**Approach.** Add rarity + region filters and a sort control (name / rarity / element / release) to
`Roster.tsx`; add a "favorite" toggle (localStorage) with a favorites-first sort. Region needs no new
data (already imported).

**Files.** `frontend/src/pages/Roster.tsx`, a tiny `favorites.ts` (localStorage).

**Risks.** None notable.

**Acceptance.** Roster can be filtered by rarity/region and sorted; favorites persist and float to top.

---

## Theme C — Polish & correctness

### C1. Refine build-suggestion heuristics (S)

**Problem.** `suggestBuild` misses known edge cases: no-crit healers (Kokomi) get a CRIT DMG circlet;
battery supports don't get an ER sands.

**Approach.** Add small curated override maps in `suggestBuild.ts`: `NO_CRIT` (→ HP%/Healing circlet,
drop CRIT from substats) and `ER_HUNGRY` (→ ER sands). Keep the heuristic as the default.

**Files.** `frontend/src/suggestBuild.ts` (+ a unit test).

**Risks.** None.

**Acceptance.** Kokomi suggests HP%/Healing (no CRIT); an ER-hungry unit suggests ER sands; others unchanged.

### C2. Refresh genshin-db (S)

**Problem.** The pinned genshin-db predates 4 chars' lore (aloy/nicole/skirk/zibai show playstyle-only)
and any newer characters.

**Approach.** Bump the `genshin-db` dependency, re-run the importer + `pnpm export:dataset`, review the
diff (counts, new fields), update tests/counts. Re-verify the KQM recommendation ids still map.

**Files.** `package.json`/lockfile, regenerated `data/genshindb/*` + `dataset.json`, dataset test counts.

**Risks.** Data churn / new characters missing role/recommendation entries — fill `ROLE_OVERRIDES` and
re-run the KQM fetch for any new ids.

**Acceptance.** Importer runs clean; the 4 chars gain lore (if present upstream); tests green.

### C3. Bundle/perf — route-level code splitting (S)

**Problem.** The JS bundle is ~350 KB (gzip ~100 KB); the vendored `recommendations.ts` and all pages
load up front.

**Approach.** `React.lazy` + `Suspense` for the page routes in `App.tsx`; consider splitting the
recommendations data behind the loadout editor. Measure with `vite build` before/after.

**Files.** `frontend/src/App.tsx` (lazy routes), possibly `recommendations.ts` (dynamic import).

**Risks.** Loading states between routes — add a lightweight fallback.

**Acceptance.** Initial JS chunk drops meaningfully; routes still work; E2E green.

---

## Suggested sequencing

1. **C1** (heuristic tuning) — quick, removes visible wrongness. **S**
2. **A2** (teammate buffs) — highest value-per-effort; makes the team feature real. **M**
3. **A3** (EM reactions) — pairs naturally with A2. **M**
4. **B3 / B4 / B2** — user-facing wins that reuse existing data. **S–M**
5. **A1** (constellations/refinements) — high value but curation-heavy; do as its own phase. **L**
6. **B1** (artifact optimizer) — the flagship; its own project with a design pass. **L**
7. **A4** (damage breakdown), **C2** (db refresh), **C3** (perf) — opportunistic. **S–M**

Each of A1/A2/B1 warrants its own `specs/NNN-*/` feature folder + task breakdown before implementation.
