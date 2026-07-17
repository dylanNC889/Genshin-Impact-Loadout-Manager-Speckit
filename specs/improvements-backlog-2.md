# Improvements Backlog 2 — Design Specs

Second batch, after the A/B/C batch in `improvements-backlog.md` (all shipped). Same format per
item: **Problem → Approach → Data → Files → Effort → Risks → Acceptance**. Effort is rough:
S (hours), M (a day), L (multi-day).

Context: the app already has character/weapon/artifact reference pages (with signatures, pieces,
domains, lore), a loadout editor with C0–6 / R1–5 selectors, an on-demand team damage estimate
(EM-based amplifying reactions, teammate buffs, per-instance breakdown), build compare, and a
GOOD-inventory artifact optimizer.

---

## Theme D — Reference data (surface what genshin-db already has)

### D1. Ascension & talent materials — "what to farm" (M)

**Problem.** The character and weapon pages describe *what* something is but not what it costs to
build. Players constantly ask "what do I need to farm for this?" — we already show the artifact
farming domain, but not the ascension gems / boss drops / talent books.

**Approach.** Import genshin-db `costs` and surface an aggregated "Materials" card.
- Characters: `costs.ascend1..ascend6` (ascension) + talent `costs.lvl2..lvl10` (from
  `genshindb.talents(name).costs`). Weapons: `costs.ascend1..ascend6`.
- Aggregate to a **total-to-max** list: sum `{name, count}` across all tiers, drop Mora into its
  own line, group the rest. Store per entity as `ascensionMaterials: {name; count}[]` and (for
  characters) `talentMaterials: {name; count}[]` (one talent to 10, or ×3 for all talents — note
  which in the label).
- Render a "Materials to ascend / max talents" card on the character page and a "Materials to
  ascend" card on the weapon page. Optionally link the talent-book/boss to its source text.

**Data.** genshin-db `costs` (characters/weapons) + `talents().costs`. Item icons available via
enka (`UI_ItemIcon_<id>`) if we want icons; text-only is fine for v1.

**Files.** `packages/dataset/scripts/import.mts` (aggregate costs), `packages/contracts/src/index.ts`
(`ascensionMaterials`, `talentMaterials` on Character; `ascensionMaterials` on Weapon),
`packages/dataset/src/index.ts` (thread through `normalizeCharacter`), `frontend/src/pages/
Character.tsx`, `frontend/src/pages/Weapon.tsx`, `styles.css`. Regenerate data.

**Risks.** Talent totals: three talents share book/boss counts — decide "one talent to 10" vs
"all three" and label clearly. Material naming varies by rarity tier (Sliver/Fragment/Chunk/Gemstone)
— keep them as distinct lines rather than collapsing.

**Acceptance.** Character page lists ascension gems + local specialty + mob drops and talent books +
weekly boss with totals; weapon page lists its ascension mats; golden test on one aggregation
(e.g. Hu Tao ascension Mora total).

---

## Theme A — Accuracy (make the numbers real)

### A5. Expand constellation stat modifiers (S–M)

**Problem.** The A1 mechanism already folds `constellationBonuses` into `computeFinalStats` and the
loadout editor has a C0–6 selector — but the curated table (`data/modifiers/constellations.json`)
only has ~3 entries, so C-level rarely changes stats.

**Approach.** Data curation, no new mechanism. Expand `constellations.json` with the constellations
that grant **static sheet stats** (flat/%, CRIT, EM, ER, elemental DMG) — e.g. many C1/C2/C4/C6
that give unconditional +stat. Keep the "static only" rule: skip talent-level-up and conditional
effects (already noted in the UI). Aim for the well-known damage-relevant ones first.

**Data.** Curated `data/modifiers/constellations.json` (charId → level → `StatValue[]`), validated
against dataset ids (like `signatureWeapons` validation).

**Files.** `data/modifiers/constellations.json` (+ regen bundling via `export:dataset`); no code
changes (engine + UI already support it).

**Risks.** Accuracy of hand-curated values (mitigate: validate ids, cite each, keep to confident
static effects). Many impactful cons are conditional/talent-level and stay out of scope — the C
selector is honest about this.

**Acceptance.** Selecting C1..C6 changes Final Stats for the expanded set; a golden test per added
character (Nx entries); ids all resolve.

### A6. Transformative reactions in the damage estimate (M)

**Problem.** `estimateTeamDamage` only models **amplifying** reactions (Vaporize/Melt). Overload,
Superconduct, Electro-Charged, Swirl, Shatter, and the Dendro reactions (Aggravate/Spread/Bloom/
Burning) do nothing, so Electro/Dendro/Anemo teams are understated.

**Approach.** Add a transformative-reaction term.
- Formula: `base = reactionCoeff × levelMultiplier(charLevel) × (1 + 16·EM/(EM+2000) + resShred?)`,
  where `levelMultiplier` is the standard reaction level table and `reactionCoeff` per reaction
  (Overload 2.0, Superconduct 1.5, EC 2.0, Swirl 0.6, Shatter 1.5, plus Aggravate/Spread as
  additive-to-hit catalyze reactions with their own 1.15/1.25 coeff).
- Extend the reaction preset list in `TeamBuilder` (currently none/vaporize/melt) with the
  transformative set; the engine returns the transformative damage as its own line in the
  breakdown (it's not a multiplier on the hit, it's separate damage).
- Aggravate/Spread are the exception — they add flat DMG to the triggering hit, so apply them like
  the amplifying path (to the instance) rather than as a separate line.

**Data.** Reaction level-multiplier table (well-known constants) + per-reaction coefficients.

**Files.** `packages/stat-engine/src/damage/index.ts`, `packages/contracts/src/index.ts`
(DamageMember/estimate output), `frontend/src/pages/TeamBuilder.tsx`.

**Risks.** Transformative damage doesn't crit and ignores DEF/DMG% (different pipeline than the
hit) — must branch the calc, not reuse the amplifying path. Level multiplier must key off character
level. Keep uptime/trigger assumptions explicit.

**Acceptance.** Selecting Overload/Superconduct/Aggravate produces a positive, EM-scaling
contribution shown as its own breakdown line (or added to the hit for catalyze); golden tests at
EM 0/200 and two character levels.

### A7. Per-talent damage numbers on the character page (M)

**Problem.** The skills card shows scaling **percentages** ("Skill DMG: 46.6% of ATK") but not the
actual damage at the character's current stats — players have to do the math themselves.

**Approach.** Reuse the engine. For the character's base (or a chosen loadout's) final stats, compute
each talent instance's non-crit / crit / average damage using the same DEF/RES/DMG% pipeline as
`estimateTeamDamage`, driven by the talent's `scaling` rows at the selected talent level.
- Add a compact "≈ damage" column to each scaling row (or a toggle), honoring the page's existing
  level/talent sliders and any equipped loadout.
- Optional enemy Lv/RES inputs mirroring the team page assumptions.

**Data.** Existing `character.skills[].scaling` (valuesByLevel, percent) + the damage engine.

**Files.** `packages/stat-engine/src/damage/index.ts` (export a small per-instance helper if needed),
`frontend/src/pages/Character.tsx`, `styles.css`.

**Risks.** Scaling stat isn't always ATK (HP/DEF scalers) — reuse the existing `describeScaling`
stat detection so the base value matches the scaling stat. Non-damage rows (heal/shield) must be
skipped. Keep assumptions visible so numbers aren't mistaken for exact in-game values.

**Acceptance.** Each damage scaling row shows an avg-crit estimate that rises with ATK/CRIT and
with talent level; a golden test for one talent at fixed stats.

---

## Theme B — Features

### B5. Weapon compare (S)

**Problem.** We have Build Compare for loadouts, but no way to compare two weapons head-to-head
(base ATK, secondary, passive, refinement scaling) — a common "which should I pull/use" question.

**Approach.** Mirror the compare page. `/weapon-compare?a=<id>&b=<id>` with two weapon pickers
(optionally filtered to a weapon type). Show base ATK, secondary stat, and the passive text at a
selectable refinement side-by-side; highlight the numeric deltas where comparable.

**Data.** Existing weapon data (base ATK, secondary, passive template + refinements from the weapon
enrichment work).

**Files.** `frontend/src/pages/WeaponCompare.tsx` (new), `frontend/src/App.tsx` (route + nav),
`styles.css` (reuse `.compare-table`).

**Risks.** Passive effects aren't directly numerically comparable — present them as text per weapon,
only delta the base ATK / secondary. Weapon-type mismatch is fine (informational).

**Acceptance.** Picking two weapons shows their stats side-by-side with a base-ATK delta and each
passive at the chosen refinement; deep-linkable via `?a=&b=`.

### B6. Export / import your data (S)

**Problem.** All saved loadouts and teams live in localStorage (static mode) or the local file store
— there's no backup. Clearing browser data loses everything, and there's no way to move data between
browsers/devices.

**Approach.** Add Export (download a JSON of all saved loadouts + teams + favourites + inventory) and
Import (upload/merge) on the Saved page. Version the payload (`{ format: "glm-backup", version, ... }`).
Import validates against the Zod contracts and merges (new ids) rather than clobbering; report a
summary ("imported N loadouts, M teams").

**Data.** Existing localStorage keys (`glm.*`) / saved entities.

**Files.** `frontend/src/pages/Saved.tsx`, a new `frontend/src/backup.ts` (serialize/parse/validate),
possibly `frontend/src/api.ts` for a bulk-import path in HTTP mode.

**Risks.** Id collisions on import (mitigate: re-id imported entities). Contract drift between backup
versions (mitigate: version field + tolerant parse). HTTP mode needs a bulk write path or per-item
create.

**Acceptance.** Export downloads a JSON that Import round-trips (same loadouts/teams reappear); import
into a fresh profile restores them; malformed files are rejected with a clear message.

### B7. Global search (S–M)

**Problem.** Search is per-page (roster, weapons, artifacts each have their own box). There's no
single "jump to anything" search.

**Approach.** A top-bar search (or `/search?q=`) that queries characters, weapons, and artifact sets
together and shows grouped results linking to each detail page. Debounced; reuses existing fetchers.
Optional keyboard shortcut ("/").

**Data.** Existing `fetchCharacters` / `fetchWeapons` / `fetchArtifactSets`.

**Files.** A new `frontend/src/components/GlobalSearch.tsx` (or `pages/Search.tsx`),
`frontend/src/App.tsx` (mount in the top bar), `styles.css`.

**Risks.** Result ranking across types (keep simple: name-contains, grouped by type). Static vs HTTP
providers both already expose the fetchers, so no backend change.

**Acceptance.** Typing a name surfaces matching characters/weapons/sets in grouped results, each
navigating to the right detail page; works in both HTTP and static modes.

---

## Suggested sequencing

| Order | Item | Theme | Effort | Why here |
|-------|------|-------|--------|----------|
| 1 | B6 Export/import | Feature | S | Safety net for user data; self-contained |
| 2 | B5 Weapon compare | Feature | S | Mirrors existing compare; quick win |
| 3 | A5 Expand constellation stats | Accuracy | S–M | Pure data on an existing mechanism |
| 4 | D1 Ascension & talent materials | Reference | M | High value; data-grounded; one import |
| 5 | A7 Per-talent damage | Accuracy | M | Shows off the engine on the character page |
| 6 | B7 Global search | Feature | S–M | Nice-to-have; no data work |
| 7 | A6 Transformative reactions | Accuracy | M | Broadens damage model; own calc branch |

Smallest-first within value tiers; the two data-import items (D1) and the modeling item (A6) are the
meatiest. None depend on each other, so they can ship in any order.
