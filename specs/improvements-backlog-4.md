# Improvements Backlog 4 — Design Specs

Fourth spec batch, after `improvements-backlog.md` (11), `improvements-backlog-2.md` (7) and
`improvements-backlog-3.md` (12) — all shipped, plus a user-listed refinement batch (roster/light
theme/splash hero/timeline dates/planner/compare-builds/food details/team-damage UX) and image
fixes (food icons via Project Amber, `_HD` skill-icon fix, self-healing splash verification →
0 dead image URLs).

Same format per item: **Problem → Approach → Data → Files → Effort → Risks → Acceptance**.
Effort: S (hours), M (a day), L (multi-day).

Current state to build on: reference pages (characters/weapons/artifacts/food with lore, pieces,
domains, materials + "where to farm" tooltips), a loadout editor with KQM recommendations + GOOD
optimizer, a team builder with live damage (amplifying + transformative + catalyze reactions,
teammate buffs, enemy presets, auto-react, sorted damage bars), character/build/weapon compare,
release timeline + curated version dates, a persisted material planner, saved builds/teams with
notes & tags, global search, light/dark theme, and export/import backup.

---

## Theme F — Damage accuracy (from "stat sheet" toward a real damage tool)

### C. Reaction & resistance realism — RES-shred / amp sources + effective RES readout (S–M)

**Problem.** The team-buff model covers a few enablers (Bennett ATK field, Zhongli −20% RES) but
misses common **RES-shred / DMG-amp** sources — Viridescent Venerer 4pc (−40% swirled element),
Superconduct (−40% Physical RES), Kaedehara Kazuha's EM→DMG A4, Frozen/def-ignore effects — and
the damage card never shows the *effective* per-element enemy RES after shred.

**Approach.** Extend `teamBuffs.ts` with more curated shred/amp entries (element-scoped where
relevant, e.g. VV only shreds the swirled element). In the damage card, add a small "Effective RES"
line per relevant element = base preset RES − applied shred, so the assumptions are legible.

**Data.** Curated additions to the existing team-buff table; no dataset change.

**Files.** `frontend/src/teamBuffs.ts`, `frontend/src/pages/TeamBuilder.tsx` (readout),
`packages/stat-engine/src/damage/index.ts` (already accepts `enemyResistanceByElement`), `styles.css`.

**Risks.** Double-counting shred (e.g. VV + Superconduct on the same element) — cap total shred and
document it. Keep entries conservative/approximate (labelled).

**Acceptance.** Adding a VV-holder / Superconduct enabler visibly lowers the effective RES for the
right element and raises damage; the damage card shows the effective per-element RES it used.

### B. Rotation-based damage for a build (L)

**Problem.** Team damage uses a "v1 generic rotation" — it sums each talent's average hit once,
which isn't how real damage works (NA strings, multi-hit skills, burst uptime).

**Approach.** On the character page, let the user assemble an explicit **rotation**: an ordered list
of talent instances (talent + hit label + count), computed with the existing `instanceAvgDamage`
against the equipped build. Show per-line and total damage, and a rough "per second" if a rotation
duration is entered. Ship character-scoped v1; a full team rotation is a later extension. Provide a
couple of preset rotations (e.g. "Standard: Skill → Burst → NA×6").

**Data.** Existing per-talent scaling (`Character.skills[].scaling`) + equipped-build final stats
(already used for A7 per-talent numbers).

**Files.** `frontend/src/pages/Character.tsx` (or a new `RotationCard` component),
`packages/stat-engine` (a `rotationDamage` helper), `frontend/src/state/loadoutStore.ts` (persist the
rotation with the build, optional), `styles.css`.

**Risks.** Complexity creep (cooldowns, energy, ICD). Keep v1 as a manual damage-per-rotation sum,
not a simulator. Reaction assignment per line adds UI — default to the build's element/off.

**Acceptance.** Build a rotation on a geared character; each line and the total update live; a preset
populates a sensible sequence; the numbers reconcile with the per-talent estimates.

### A. Conditional buff toggles — weapon passives, artifact 4-set, constellation DMG effects (L)

**Problem.** Only *unconditional, sheet-wide* stat bonuses feed the damage math (base stats +
ascension + curated constellation/refinement stat modifiers). Conditional effects — weapon passives
("+20% DMG after using a skill"), artifact **4-piece** set bonuses (Crimson Witch +Pyro on reaction),
and constellation damage effects — are shown as text but never applied.

**Approach.** Mirror the existing `data/modifiers/` mechanism (constellation/refinement stat
modifiers already applied by the engine). Add a curated `data/modifiers/conditional-buffs.json`
keyed by source id (weapon id / set id / `char:cN`), each entry = `{ id, label, effects: StatValue[],
defaultOn }`. Persist enabled ids on the loadout; render grouped checkboxes in the `LoadoutEditor`;
the engine folds enabled effects into Final Stats. Start with the highest-impact ~30–40 entries
(meta weapons, common 4pc sets, key cons), clearly labelled "conditional / approximate".

**Data.** New `data/modifiers/conditional-buffs.json` (curated). `LoadoutInput.activeConditionals:
string[]` (contract, `.default([])`). Loader passes the table through like `constellationBonuses`.

**Files.** `packages/contracts` (schema + `LoadoutInput` field), `packages/dataset` (load the table),
`packages/stat-engine` (apply enabled modifiers in `computeFinalStats`), `components/LoadoutEditor.tsx`
(+ store), `data/modifiers/conditional-buffs.json`, `styles.css`; thread through backend/static.

**Risks.** Curation scope + correctness; conditional stacking. Cap to sheet-additive stat effects
(no per-hit multipliers) in v1 — that's what the engine already models. Snapshot values, attribute
KQM-style sources.

**Acceptance.** Toggling a weapon passive / 4pc set on a build changes Final Stats and the damage
estimate; enabled toggles persist with the saved build and round-trip through export/import.

---

## Theme G — Team & content planning

### F. Team compare (M)

**Problem.** There's character/build/weapon compare, but no way to compare two **teams** — the exact
decision players make ("national vs hyperbloom for this floor").

**Approach.** A `/team-compare?a=&b=` page (or a compare mode in the team builder): pick two saved
teams, show side-by-side synergy grade, resonances, possible reactions, role coverage/gaps, and the
estimated damage total under shared assumptions. Reuse `assessSynergy` + the team damage helper.

**Data.** Existing saved teams + synergy/damage engine.

**Files.** `frontend/src/pages/TeamCompare.tsx` (new), `App.tsx` (route + nav/link from Saved),
reuse `.compare-table`, `styles.css`.

**Risks.** Damage comparability (different rotations/assumptions) — use identical assumptions for
both and label it. Keep it read-only.

**Acceptance.** Pick two saved teams; a table shows both teams' grade, resonance, reactions, gaps and
damage; the higher total is highlighted.

### E. Team templates / meta presets (M)

**Problem.** Building a team from scratch is a blank page. Players start from known archetypes
(National, Hyperbloom, Freeze, Aggravate, Mono-Pyro…).

**Approach.** A curated set of team **templates** (elements/roles + a couple of exemplar characters
each) surfaced as one-click starters in the team builder — clicking populates the slots (with
exemplars the user owns where possible). The synergy engine then evaluates the assembled team.

**Data.** Curated `frontend/src/data/teamTemplates.ts` (name, description, slot archetypes + example
character ids); reuse ownership to prefer owned exemplars.

**Files.** `frontend/src/data/teamTemplates.ts` (new), `frontend/src/pages/TeamBuilder.tsx` (a
"Templates" strip), `styles.css`.

**Risks.** Templates go stale with the meta — keep them archetype-level and few. Respect the
distinct-character rule when filling slots.

**Acceptance.** Choosing a template fills the team-builder slots; synergy/damage recompute; owned
exemplars are preferred when available.

### D. "Farmable today" calendar (S–M)

**Problem.** Talent books and weapon-ascension mats rotate by weekday and region, but the app never
answers "what can I farm **today**?" — even though it already stores each material's domain + days.

**Approach.** A `/farmable` view (or a home widget) that, for the current weekday, lists the talent/
weapon domains open today and which of *your* built/owned characters need them. Reuse the domain +
`daysOfWeek` data already snapshotted in `materialSources.ts`; map characters → their talent books via
`talentMaterials`.

**Data.** Existing `frontend/src/data/materialSources.ts` (domain + weekdays) + `Character.talentMaterials`
+ ownership/saved builds. Note: date-of-week is a runtime `Date` (fine in the app; not in importer).

**Files.** `frontend/src/pages/Farmable.tsx` (new), `App.tsx` (route + nav), a small weekday helper,
reuse `MaterialList`/chips, `styles.css`.

**Risks.** Sunday = all domains open (handle the "daily" case). Region grouping needs the material's
domain string — already present.

**Acceptance.** On a given weekday the page shows the domains open today and the built/owned
characters whose talent books drop there; Sunday shows everything.

### H. Artifact inventory + Crit Value grading (M)

**Problem.** GOOD import exists but is optimizer-only and not persisted. Players want to keep their
inventory and see piece quality (Crit Value) and best-in-inventory per character.

**Approach.** Persist the imported GOOD inventory (localStorage), add an `/inventory` page that lists
artifacts with computed **CV** (`2·CR% + CD%`), a quality grade, and filters (set/slot/main stat).
Optionally surface "best CV piece per slot" for a chosen character. Include inventory in the backup.

**Data.** GOOD artifact shape already parsed by the optimizer; CV is derived from substats.

**Files.** `frontend/src/inventory.ts` (persist + CV helpers), `frontend/src/pages/Inventory.tsx`
(new), `pages/Optimize.tsx` (save on import / read persisted), `backup.ts`, `App.tsx`, `styles.css`.

**Risks.** GOOD substat rolls vs displayed values (CV uses roll values). Large inventories → keep the
list virtualized/paginated if needed.

**Acceptance.** Import a GOOD file; the inventory persists across reloads, shows CV + grade per piece,
filters work, and it round-trips through export/import.

### G. Wish / pity planner (M)

**Problem.** No account-planning for pulls. Players track primogems + pity and plan against upcoming
banners; the app already has curated version release dates.

**Approach.** A `/wishes` page: inputs for current primogems, saved-per-day, and current pity
(character + weapon), computing pulls available by a target date and rough odds to a 5★ given pity
(soft-pity model). List upcoming versions from `versionDates.ts` with a countdown.

**Data.** `frontend/src/data/versionDates.ts` (dates) + localStorage for the user's numbers; a small
soft-pity probability table (curated constants).

**Files.** `frontend/src/pages/Wishes.tsx` (new), `frontend/src/wishes.ts` (pull/odds math),
`App.tsx`, `backup.ts` (persist), `styles.css`.

**Risks.** Probability model is an approximation (soft pity, 50/50, capturing radiance) — label it.
Banner *contents* aren't known ahead — list versions/dates, not specific banners.

**Acceptance.** Enter primos/day/pity; the page shows pulls-by-date and an approximate 5★ chance, plus
upcoming version dates with countdowns; inputs persist.

---

## Theme H — UX & polish

### J. Loading skeletons (S)

**Problem.** Pages show a plain "Loading…" string; the layout jumps when data arrives.

**Approach.** A reusable `<Skeleton>` (shimmer) and skeleton variants for the roster grid and detail
cards, shown while queries are pending instead of the text.

**Data.** None.

**Files.** `frontend/src/components/Skeleton.tsx` (new), `Roster.tsx`, `Character.tsx`, other list
pages, `styles.css` (shimmer keyframes, light + dark).

**Risks.** Keep skeleton shapes close to real content to avoid layout shift.

**Acceptance.** Roster and a detail page render skeletons while loading, then swap to content with no
visible jump; works in both themes.

### N. "Appears in these teams" reverse lookup (S)

**Problem.** From a character page you can't see which of *your* saved teams use them.

**Approach.** On the character detail page, query saved teams and list any that include this character,
each linking to the team (`/team?team=<id>`).

**Data.** Existing saved teams.

**Files.** `frontend/src/pages/Character.tsx` (a small "In your teams" section), reuse team fetch,
`styles.css`.

**Risks.** None material.

**Acceptance.** A character on ≥1 saved team shows those teams as links; a character on none shows
nothing (or a subtle empty state).

### L. Recently viewed (S)

**Problem.** No quick path back to characters you were just looking at.

**Approach.** Track the last N viewed characters (localStorage, pushed on the character page), show a
"Recently viewed" strip on the roster/home.

**Data.** localStorage `glm.recent.characters`.

**Files.** `frontend/src/recent.ts` (new), `Character.tsx` (record), `Roster.tsx` (strip), `styles.css`.

**Risks.** None material; de-dupe + cap length.

**Acceptance.** Visiting characters adds them to a capped, de-duped recent list shown on the roster;
survives reload.

### K. Shareable build/team image card (M)

**Problem.** Sharing today is a URL (B3). Players like posting a **visual** build/team card.

**Approach.** A "Download card" action on the character build and team that renders a PNG via canvas
(character art + key stats + weapon/artifacts, or the 4 team portraits + synergy grade). No external
service — draw on an offscreen `<canvas>` and trigger a download.

**Data.** Existing build/team data + already-loaded art.

**Files.** `frontend/src/cardImage.ts` (canvas render), `Character.tsx` / `TeamBuilder.tsx` (button),
`styles.css`.

**Risks.** Cross-origin canvas taint from CDN images — fetch as blob / set `crossOrigin`; verify the
CDNs send CORS headers, else proxy or embed a smaller icon set. Font/layout work.

**Acceptance.** "Download card" produces a PNG with the build's/team's art + key info; no broken
(tainted) canvas.

### I. Mobile / responsive pass (M)

**Problem.** The two-column team builder, detail masonry, and compare tables are cramped on narrow
screens.

**Approach.** A responsive audit: stack the team builder (picker above portraits), single-column the
detail masonry, make compare tables horizontally scrollable, and ensure the nav collapses gracefully.
Add breakpoints; test at ~375/768px.

**Data.** None.

**Files.** `frontend/src/styles.css` (breakpoints), minor layout tweaks in `TeamBuilder.tsx`,
`App.tsx` (nav), compare pages.

**Risks.** Regressing desktop layouts — verify at multiple widths with screenshots.

**Acceptance.** At 375px and 768px the team builder, a character page, and a compare page are usable
with no horizontal overflow; desktop is unchanged.

---

## Theme I — Reference & data

### M. Talent priority + "how to play" note (S–M)

**Problem.** The character page shows talents/scaling but not **which to level first** or a one-line
playstyle/rotation cue.

**Approach.** Curated per-character talent priority (e.g. "Burst > Skill > NA") and a short rotation
note, shown on the detail page near Skills. Reuse the existing curated `playstyle.ts` pattern; source
priorities from KQM-style guidance (the same vendored approach as `recommendations.ts`).

**Data.** Curated `frontend/src/data/talentPriority.ts` (char id → { priority, note }); fall back to a
generic line when absent.

**Files.** `frontend/src/data/talentPriority.ts` (new), `frontend/src/pages/Character.tsx`, `styles.css`.

**Risks.** Coverage/accuracy — curate confidently, generic fallback otherwise; attribute source.

**Acceptance.** A character page shows a talent-priority line and a rotation note; uncovered characters
show a sensible generic priority without breaking.

---

## Suggested sequencing

| Order | Item | Theme | Effort | Why here |
|-------|------|-------|--------|----------|
| 1 | J Loading skeletons | Polish | S | Self-contained; instant UX lift |
| 2 | N "Appears in these teams" | Reference | S | Tiny reverse lookup on existing data |
| 3 | L Recently viewed | Polish | S | Small localStorage feature |
| 4 | C RES-shred / amp + RES readout | Accuracy | S–M | Extends existing team-buff model |
| 5 | D "Farmable today" calendar | Planning | S–M | Cheap; reuses domain/weekday data |
| 6 | M Talent priority / how-to-play | Reference | S–M | Curated, mirrors playstyle.ts |
| 7 | F Team compare | Planning | M | Mirrors existing compare pages |
| 8 | E Team templates / meta presets | Planning | M | Curated starters; uses synergy engine |
| 9 | K Shareable image card | Polish | M | Canvas render; CORS caveat |
| 10 | I Mobile / responsive pass | Polish | M | Cross-cutting CSS audit |
| 11 | G Wish / pity planner | Planning | M | New view; reuses version dates |
| 12 | H Artifact inventory + CV | Planning | M | Persists GOOD import; new page |
| 13 | B Rotation-based damage | Accuracy | L | Meaty; character-scoped v1 |
| 14 | A Conditional buff toggles | Accuracy | L | Biggest accuracy win; curation-heavy |

Smallest-first. Most items are independent; **A** and **B** are the heaviest (curation + engine + UI)
and move the app from "stat sheet" toward a real damage tool — treat like A10/A5: build only what's
confidently curatable and label conditional/approximate effects. **H** persists the GOOD data the
optimizer already parses; **F/G/K** reuse compare/version-date/art assets already in the app.
