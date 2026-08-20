# Improvements Backlog 5 — Design Specs

Seventh batch, after six shipped batches (`improvements-backlog{,-2,-3,-4}.md` + two user-listed
refinement batches, PRs #11–#99) and the three follow-ups that preceded this doc:

- **#101** — curated-data refresh. Confirmed the dataset and both material generators are already
  current (genshin-db 5.2.12 is the latest published version; regenerating produced byte-identical
  output). Closed the coverage gaps it exposed: `talentPriority` 35/116 → 116/116, `erRequirements`
  25 → 59.
- **#102** — E2E reliability. Suite went from "needs `--workers=3/4`" to 8 consecutive green runs at
  `--workers=12`. Root causes: the dev server compiling lazy routes on demand under parallel load
  (now serves a production build via `vite preview`), a button whose `disabled` didn't mirror its
  handler's guard (silent no-op clicks), and Playwright adopting an unrelated app squatting on the
  readiness port.
- **#103** — engine gap closure. Per-hit DMG% (`talentDmgBonuses`, scoped to NA/CA/Skill/Burst) and
  enemy RES shred (`resShred`, de-duplicated by `source`) now apply, via
  `packages/stat-engine/src/stats/combat-effects.ts`. Enemy RES also moved from a linear factor to
  the game's piecewise curve (`resMultiplier`), which halves shred below 0%.

Same format per item: **Problem → Approach → Data → Files → Effort → Risks → Acceptance**.
Effort: **S** (hours), **M** (a day), **L** (multi-day). Sequenced smallest → largest.

Everything below was found by reading the current code, not by guessing at what might be missing;
each Problem cites the specific line or file that has the defect.

---

## Theme A — Correctness bugs (do these first)

### 1. Share links silently drop conditional buffs, notes and tags (S)

**Problem.** A shared build link does not reproduce the build. `LoadoutEditor.tsx` builds its
`?build=` payload from five fields only — `level`, `weaponId`, `constellation`, `refinement`,
`artifacts` — and the matching `?build=` hydration in `Character.tsx` restores exactly those. So
`activeConditionals`, `notes` and `tags` never travel. The recipient of a "here's my Hu Tao" link
sees **different Final Stats and different damage numbers** than the sender, with nothing
indicating anything was lost. #103 made this materially worse: conditional buffs now drive per-hit
DMG% and RES shred too, so a dropped buff can change a damage figure by 50%.

**Approach.** Add the three fields to the encoded payload and restore them on hydration. Keep the
payload backward-compatible — an old link simply carries no `activeConditionals`, so treat absence
as "apply the applicable defaults", which is what a fresh editor already does. Guard the restore
with the same applicability filter the editor uses, so a link that names a buff whose weapon/set
isn't in the payload can't enable an impossible buff.

**Data.** None.

**Files.** `frontend/src/components/LoadoutEditor.tsx` (payload), `frontend/src/pages/Character.tsx`
(`?build=` hydration effect), `frontend/src/share.ts` if the payload type is declared there.

**Effort.** S.

**Risks.** Longer share codes (base64 of a slightly bigger object) — measure, they should stay well
inside URL limits. Ordering: the hydration effect must run after the weapon/artifacts are set or
the applicability filter will prune everything.

**Acceptance.** A build with conditional buffs toggled, notes and tags, shared and opened in a
clean browser profile, reproduces identical Final Stats, identical per-talent damage, and the same
checked buffs. An older link (five-field payload) still opens without error.

### 2. Nothing enforces that modifier ids resolve (S)

**Problem.** `data/modifiers/*.json` reference dataset ids by hand — `weaponId`, `setId`, and
character ids in `constellations.json`. Nothing checks they exist. A renamed or removed id makes
the modifier **silently unreachable**: no error, no warning, the buff just never appears in the
editor and its damage is never applied. This is exactly the failure the #103 work had to check for
manually with a throwaway script.

**Approach.** A dataset-level test that loads the built `Dataset` and asserts every id referenced
by every modifier file resolves against `characters` / `weapons` / `artifactSets`. Also assert the
narrower invariants the schemas can't express: `minPieces` is 2 or 4, `resShred.pct` is positive,
and a buff declares at least one of `effects` / `talentDmgBonuses` / `resShred` (an entry with none
is a no-op that looks functional in the editor).

**Data.** None — a test over existing data.

**Files.** `packages/dataset/tests/dataset.test.ts` (or a new `modifiers.test.ts` alongside it).

**Effort.** S.

**Risks.** None meaningful. If it turns up existing dangling ids, fix them in the same PR — the
#103 check found none, so it should start green.

**Acceptance.** Deliberately renaming a `setId` in `conditional-buffs.json` fails `pnpm test` with
a message naming the buff and the missing id.

### 3. The optimizer ranks builds blind to conditional buffs (S–M)

**Problem.** `packages/optimizer/src/index.ts` hardcodes `activeConditionals: []` in its
`baseLoadout`, so every candidate build is scored **without** any 4-piece conditional effect. With
target `ATK` it cannot see Noblesse Oblige's +20% ATK or Vermillion Hereafter's ATK stacks; with
`CV` it cannot see Marechaussee Hunter's +36% CRIT Rate. The optimizer therefore systematically
under-rates exactly the 4-piece sets players actually build, and can recommend a mixed 2+2 over a
4-piece that would win once its conditional is counted.

**Approach.** Thread the applicable conditional buffs into the optimizer: for each candidate build,
derive which buffs its set counts and weapon unlock (the same predicate `LoadoutEditor` uses —
extract it to a shared helper so the two can't drift), enable the `defaultOn` ones, and pass them
as `activeConditionals`. Expose a query flag to score without them, since "what do these artifacts
give me bare" is a legitimate question. Note the applicable set changes per candidate, so this must
be computed inside the search loop; keep it cheap (a precomputed set-id → buff-ids map).

**Data.** None.

**Files.** `packages/optimizer/src/index.ts`, a shared applicability helper (new, in
`packages/stat-engine` or `packages/contracts`), `frontend/src/components/LoadoutEditor.tsx` to
consume the shared helper, `frontend/src/pages/Optimize.tsx` for the flag,
`packages/optimizer/tests/optimize.test.ts`.

**Effort.** S–M.

**Risks.** Search cost — the inner loop is already 5-nested; recomputing applicability per candidate
must not become the bottleneck. Precompute per set-id before the loop. Behaviour change: existing
optimizer results will shift, which is the point, but call it out in the UI.

**Acceptance.** With a Marechaussee-heavy inventory and target CV, the 4-piece build ranks above the
equivalent 2+2 that currently wins; a unit test pins that ordering. The bare-scoring flag reproduces
today's output exactly.

---

## Theme B — Damage accuracy

### 4. Per-talent levels instead of one slider (S–M)

**Problem.** `Character.tsx` holds a single `talentLevel` state driving **all three** talents, so
every damage figure on the page assumes the same level everywhere. Real builds are not uniform —
a crowned Burst at 10 with Skill at 9 and Normal Attack at 6 is the common shape — so the per-talent
numbers and the rotation total are wrong for essentially every real account.

**Approach.** Replace the single value with one level per combat talent (NA / Skill / Burst),
defaulting all three to the current value so nothing regresses visually. Persist them on the
loadout so a saved build keeps its talent levels. Keep a "set all" affordance — most users will
still want to move them together.

**Data.** Adding levels to `LoadoutInput` is a contract change; mind the **Zod `.default()`
gotcha** (a `.default()` field is optional in `z.input` but required in `z.infer`, so every
`LoadoutInput` literal must be updated — `LoadoutEditor.tsx`, `Character.tsx`,
`packages/optimizer/src/index.ts` baseLoadout, and the stat-engine test fixtures).

**Files.** `packages/contracts/src/index.ts`, `frontend/src/pages/Character.tsx`,
`frontend/src/state/loadoutStore.ts`, `frontend/src/components/LoadoutEditor.tsx`,
`frontend/src/teamDamage.ts` (`rotationInstances` currently hardcodes index 9 = Lv10).

**Effort.** S–M.

**Risks.** The contract change ripples (see the gotcha above). Saved loadouts predating the field
must default cleanly.

**Acceptance.** Setting Burst to 10 and NA to 6 changes only the Burst and NA figures, by the ratio
of their scaling rows; the values survive a save/reload round-trip.

### 5. Conditional buff values ignore weapon refinement (M)

**Problem.** Every weapon-passive conditional buff in `conditional-buffs.json` is a flat R1 value,
and `computeFinalStats` applies it unchanged regardless of `input.refinement`. Static refinement
bonuses already scale correctly (`dataset.weaponRefinements[id][rank]`), so the two halves of the
same weapon's passive disagree: an R5 The Catch contributes its R5 static stats but only its R1
conditional (+16% Burst DMG, when R5 is +32%). Users who read "R5" on the editor reasonably expect
the whole passive to be R5.

**Approach.** Let a conditional buff declare per-rank values — mirror the shape
`weaponRefinements` already uses (`{ "1": …, "2": … }`) rather than inventing a second convention.
Resolve against `input.refinement` at apply time, falling back to the flat value so the ~24 buffs
that don't need it stay as they are. Backfill ranks for the weapon-passive buffs; leave artifact
4pc buffs flat (sets have no refinement).

**Data.** Per-rank values for the weapon-passive entries in `data/modifiers/conditional-buffs.json`
— curated, approximate, and labelled as such like the rest of the file.

**Files.** `packages/contracts/src/index.ts` (`ConditionalBuffSchema`),
`packages/stat-engine/src/stats/final-stats.ts`, `packages/stat-engine/src/stats/combat-effects.ts`
(per-hit values scale too), `data/modifiers/conditional-buffs.json`, tests.

**Effort.** M.

**Risks.** Curation volume and accuracy — scope to the weapons already in the file rather than
every weapon in the game. Refinement values are the most error-prone curated data in the project;
cite the in-game passive text in the entry.

**Acceptance.** Changing refinement R1 → R5 on a weapon with a ranked conditional visibly changes
both Final Stats and the scoped damage figure; R1 output is unchanged from today.

### 6. Reaction and enemy controls on the character page (M)

**Problem.** The per-talent "≈ damage" figures and the rotation builder always assume **no
reaction** against a neutral Lv90 / 10% RES enemy (`DEFAULT_ENEMY_RES` in `Character.tsx`). The
team builder has had reaction presets, enemy presets and per-element RES since batch 4. So the
single-character view — the one a player actually tunes a build in — gives the least realistic
number in the app. For a Vaporize Hu Tao the honest figure is roughly double what the page shows.

**Approach.** Reuse the team builder's controls rather than build new ones: lift the reaction
picker and `ENEMY_PRESETS` into a shared component, drop it on the character page, and pass the
chosen reaction multiplier / enemy level / RES into `instanceAvgDamage`. `instanceAvgDamage`
already accepts `enemyLevel` and `enemyResistancePct`; it needs a reaction multiplier and the EM
bonus (`emReactionBonus`) that `estimateTeamDamage` already applies. Persist the choice per
character so it isn't re-picked on every visit.

**Data.** None — reuses `REACTIONS` and `ENEMY_PRESETS`.

**Files.** New shared `frontend/src/components/DamageAssumptions.tsx`,
`frontend/src/pages/Character.tsx`, `frontend/src/pages/TeamBuilder.tsx` (consume the shared
component), `packages/stat-engine/src/damage/index.ts` (`instanceAvgDamage` gains reaction args).

**Effort.** M.

**Risks.** Extracting the control out of `TeamBuilder.tsx` risks regressing the team damage card —
it is the most E2E-covered surface in the app, so lean on those tests. Don't let the character page
imply more precision than the estimate has; keep the "approx" framing.

**Acceptance.** Selecting Vaporize (2×) on Hu Tao's page raises every Pyro damage row by the amp
multiplier including the EM bonus; the enemy preset changes the figures the same way it does on the
team page; the choice survives navigation.

### 7. Team buffs can't express Elemental Mastery (M)

**Problem.** `TEAM_BUFFS` models flat ATK, DMG%, CRIT and RES shred — but not EM. The table says so
in its own data: `nahida: { note: "Nahida: team EM buff (not modeled in this ATK-based estimate)" }`
— an entry that contributes literally nothing. Since #103 the damage pipeline scales amplifying,
transformative and catalyze reactions off EM, so for reaction teams (the ones that pick Nahida,
Sucrose or Kazuha *for* their EM share) the estimate is materially low, and adding the buffer barely
moves the number.

**Approach.** Add an `em` field to `TeamBuff`, sum it in `teamBuffFor`, and add it to each member's
`em` before the reaction bonuses are computed in `computeTeamDamage`. Backfill the known EM sharers
(Nahida's C-less party EM, Sucrose's A4 EM share, Kazuha's A4, Instructor 4pc). Note EM share is
usually *scoped* to the buffer's own EM, so the values stay approximate like the rest of the table.

**Data.** Curated EM values for existing `TEAM_BUFFS` entries.

**Files.** `frontend/src/teamBuffs.ts`, `frontend/src/teamDamage.ts`, tests.

**Effort.** M.

**Risks.** Double-counting with Gilded Dreams / Elegy conditional buffs that already add sheet EM —
those are the *wearer's* EM and this is a team buff, so they legitimately stack, but verify against
a known reference build. Nahida's buff scales off her own EM, which we don't know at buff time;
document the assumed value.

**Acceptance.** Adding Nahida to a Hyperbloom team raises the transformative damage line by the EM
bonus curve; her `TEAM_BUFFS` note no longer says the buff isn't modelled.

---

## Theme C — Larger features

### 8. Constellation-gated conditional buffs (M–L)

**Problem.** `ConditionalBuffSchema` has supported `minConstellation` since batch 6, and **zero of
the 34 buffs use it**. `data/modifiers/constellations.json` deliberately covers only "sheet-wide,
always-on" bonuses, noting that almost every constellation is a talent-level increase, a mechanic
change, or a conditional. So the entire conditional half of the constellation system — the C1/C2/C4/
C6 effects that decide whether a constellation is worth pulling — is unmodelled, and the
constellation selector barely changes any number above C0.

**Approach.** Curate constellation conditionals as ordinary `ConditionalBuff` entries gated by
`minConstellation` — no new mechanism needed, and #103's `talentDmgBonuses` now covers the common
"C6: +X% Burst DMG" shape that previously had nowhere to go. Scope hard: start with the ~20 most
played characters rather than all 116, and label coverage honestly in the UI so an uncovered
character doesn't look like "this constellation does nothing".

**Data.** Curated additions to `data/modifiers/conditional-buffs.json`, sourced from genshin-db
constellation text (already imported as `Character.constellations[].description`).

**Files.** `data/modifiers/conditional-buffs.json`,
`frontend/src/components/LoadoutEditor.tsx` (group constellation buffs separately from gear ones),
possibly a coverage note in the constellations panel of `Character.tsx`.

**Effort.** M–L, dominated by curation.

**Risks.** Curation accuracy across many characters — the same risk the KQM recommendation work
carried. Partial coverage misreads as broken; the honest label matters. Some C-effects are genuinely
inexpressible (mechanic changes, extra hits) — omit them rather than approximating badly.

**Acceptance.** For a covered character, raising constellation past the gate makes the buff appear
and changes the damage figures; an uncovered character shows an explicit "not modelled" note rather
than silence.

### 9. Team rotations instead of one hit per talent (L)

**Problem.** Team damage uses `rotationInstances` in `frontend/src/teamDamage.ts`: the single
strongest DMG row of each talent, once. That is not a rotation — it ignores NA strings, multi-hit
skills, burst uptime and field time, and it weights a 4-member team as 12 hits regardless of who is
actually on field. The character page has had a real rotation builder since batch 6 (#91); the team
view never got one, so the app's headline number is its least realistic.

**Approach.** Reuse the character-page rotation rather than inventing a second model: let each team
slot use its saved rotation when one exists, falling back to today's illustrative instances. Add a
team-level rotation duration so the total becomes a comparable DPS. This needs rotations persisted
on the loadout first (they are currently component state in `Character.tsx`), which is the real cost
of this item.

**Data.** Persist rotations on `LoadoutInput` (contract change — mind the `.default()` gotcha
again).

**Files.** `packages/contracts/src/index.ts`, `frontend/src/pages/Character.tsx` (persist instead of
local state), `frontend/src/state/loadoutStore.ts`, `frontend/src/teamDamage.ts`,
`frontend/src/pages/TeamBuilder.tsx`, `frontend/src/pages/TeamCompare.tsx`,
`packages/stat-engine/src/damage/index.ts`.

**Effort.** L.

**Risks.** Team damage totals change substantially, which invalidates saved comparisons and several
E2E assertions. Rotation length dominates DPS, so a bad default makes teams look wildly different;
ship with the fallback as the default and make opting in explicit. Sequence this **after** item 4
(per-talent levels), since a persisted rotation should record the talent levels it was computed at.

**Acceptance.** A team whose members have saved rotations reports a total built from them, with a
visible per-member breakdown and a rotation duration; teams without saved rotations produce exactly
today's numbers.

---

## Suggested sequencing

Smallest → largest, and dependency-ordered:

| # | Item | Effort | Notes |
|---|------|--------|-------|
| 1 | Share links drop conditionals/notes/tags | S | Pure bug fix, no contract change |
| 2 | Modifier-id integrity test | S | Guards every later data edit — do it early |
| 3 | Optimizer applies conditional buffs | S–M | Extracts the shared applicability helper item 8 also wants |
| 4 | Per-talent levels | S–M | Contract change; item 9 depends on it |
| 5 | Refinement-scaled conditional values | M | |
| 6 | Reaction + enemy controls on the character page | M | Extracts the shared assumptions control |
| 7 | EM in team buffs | M | |
| 8 | Constellation-gated conditionals | M–L | Curation-heavy; wants item 3's helper |
| 9 | Team rotations | L | Do last; depends on item 4 |

Items 1–3 are defect fixes and worth landing regardless. Items 4–7 are where the accuracy gain is.
Items 8–9 are the ambitious end and should only start once the earlier contract changes have settled.
