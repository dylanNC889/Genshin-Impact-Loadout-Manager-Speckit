# Improvements Backlog 3 — Design Specs

Third batch, after `improvements-backlog.md` (11 items) and `improvements-backlog-2.md` (7 items),
both fully shipped. Same format per item: **Problem → Approach → Data → Files → Effort → Risks →
Acceptance**. Effort: S (hours), M (a day), L (multi-day).

Context: the app has reference pages (characters/weapons/artifacts with signatures, pieces, domains,
lore, materials), a loadout editor, a team damage estimate (amplifying + transformative + catalyze
reactions, teammate buffs, per-instance breakdown), build/weapon compare, a GOOD optimizer, global
search, export/import, per-talent damage numbers, and rarity-tinted cards.

---

## Theme E — Account planning (turn the reference tool into *your* account)

### E1. Ownership tracking (S–M)

**Problem.** The app shows every character/weapon, but not which ones *you own*. Team building,
optimizing, and browsing all mix owned and unowned.

**Approach.** A local "owned" set (localStorage), toggled from an ✓ badge on roster/weapon cards
(like the existing favourite toggle). Add an "Owned only" filter to the roster, the optimizer's
character picker, and the team-builder picker. Constellation/refinement level can piggyback later.

**Data.** localStorage only (`glm.owned.characters`, `glm.owned.weapons`); include in the
export/import backup (B6).

**Files.** `frontend/src/ownership.ts` (new, mirrors `favorites.ts`), `Roster.tsx`, `Weapons.tsx`,
`pages/Optimize.tsx`, `pages/TeamBuilder.tsx`, `backup.ts`, `styles.css`.

**Risks.** Scope creep into full account import (GOOD character data) — keep v1 to a manual toggle.

**Acceptance.** Toggle owned on a card; "Owned only" filters the roster + team/optimizer pickers;
owned set survives reload and round-trips through export/import.

### E2. Multi-character build planner (M)

**Problem.** The character/weapon pages show materials one at a time (D1). Players plan *several*
builds per patch and want the **combined** shopping list.

**Approach.** A "Planner" page: pick a wishlist of characters (+ optionally their weapons), and
aggregate the totals — Mora, ascension gems by element, local specialties, mob drops, talent books,
weekly-boss mats — into one grouped list. Reuse the D1 `ascensionMaterials` / `talentMaterials`
already on Character/Weapon. Optionally scope by "current → target" level later; v1 = full build.

**Data.** Existing `Character.ascensionMaterials` / `talentMaterials` + `Weapon.ascensionMaterials`.

**Files.** `frontend/src/pages/Planner.tsx` (new), `frontend/src/materials.ts` (aggregation helper),
`App.tsx` (route + nav), reuse `MaterialList`, `styles.css`.

**Risks.** Talent totals assume "one talent to 10" (or ×3) — carry the D1 labelling. Same-named mats
across characters must sum, not duplicate.

**Acceptance.** Adding 2–3 characters produces a single combined material list whose per-item totals
equal the sum of each character's page; wishlist persists (localStorage) and is deep-linkable.

---

## Theme A — Accuracy (the damage model)

### A8. Enemy presets + per-element resistance (S–M)

**Problem.** The estimate assumes one enemy (Lv 90, 10% RES to everything). Real targets have
per-element RES and different levels, which the reaction work (A3/A6) is sensitive to.

**Approach.** Add an enemy **preset** dropdown (e.g. "Standard 10%", "Abyss Lv 100", a few named
bosses/hilichurls with per-element RES) plus a per-element RES override. Extend `DamageCalcOptions`
so `enemyResistancePct` can be a per-element map; the engine picks the member's element (and the
reaction's element for transformative) when computing `resFactor`.

**Data.** Curated enemy presets (level + per-element RES); small, well-known table.

**Files.** `packages/contracts/src/index.ts` (DamageCalcOptions), `packages/stat-engine/src/damage/
index.ts` (per-element resFactor), `frontend/src/pages/TeamBuilder.tsx`, `data/enemies.json` (or a
frontend module).

**Risks.** RES negative/high branches (VV shred can push RES < 0) — handle the standard resFactor
piecewise. Keep the default identical to today so existing behaviour is unchanged.

**Acceptance.** Selecting a preset changes the estimate; a Pyro-resistant enemy lowers Pyro members'
damage but not Electro's; golden test for the piecewise resFactor.

### A9. Auto-detect reactions from the team (S)

**Problem.** The reaction + transformative dropdowns are manual, even though the synergy panel
already computes the team's **possible reactions** from its elements.

**Approach.** Offer an "Auto" mode that reads `synergy.possibleReactions` and applies the most
representative reaction (amplifying if available, else the strongest transformative) without manual
selection — with a note on what it chose. Manual override still available.

**Data.** Existing `assessSynergy(...).possibleReactions` (string[]).

**Files.** `frontend/src/pages/TeamBuilder.tsx` (+ maybe a tiny mapping of reaction name → preset).

**Risks.** "Most representative" is a heuristic (a team enables several reactions) — surface the
choice and let the user override.

**Acceptance.** With Auto on, a Pyro+Hydro team defaults to Vaporize and an Electro+Dendro team to
Aggravate/Quicken, shown in the assumptions; manual selection overrides it.

### A10. Energy / ER requirements (L)

**Problem.** The estimate ignores energy — a team may not actually be able to cast its bursts, which
is often the real constraint.

**Approach.** A rough **ER-requirement** indicator per character: burst energy cost (already in the
talent data as "Energy Cost") vs a curated particle-generation assumption for the rotation, yielding
"needs ~X% ER". Flag members below their requirement. v1 is a heuristic, clearly labelled.

**Data.** Burst cost from talent scaling; **particle generation is not in genshin-db** → a small
curated per-character particle/rotation table (the hard part).

**Files.** `packages/stat-engine/src/energy/*` (new), `data/particles.json` (curated),
`frontend/src/pages/TeamBuilder.tsx`.

**Risks.** Particle/energy modelling is genuinely complex and data-sparse; keep it a labelled
estimate for the curated set and skip the rest, or defer if the curation proves unreliable (cf. A5).

**Acceptance.** A low-ER build shows an "ER short" flag that clears when ER is raised; curated for a
handful of popular bursts with a clear "approximate" caveat.

---

## Theme B — Features

### B8. Character compare (S)

**Problem.** We compare weapons and builds, but not characters — "Hu Tao vs Arlecchino" base stats,
element, weapon, roles side-by-side.

**Approach.** Mirror the compare pages. `/character-compare?a=&b=` with two character pickers; show
base HP/ATK/DEF at Lv 90, ascension stat, element, weapon type, roles, rarity, and their KQM top
weapon/set. Reuse `.compare-table`.

**Data.** Existing character data + `computeBaseSheet`.

**Files.** `frontend/src/pages/CharacterCompare.tsx` (new), `App.tsx` (route), a link on the roster,
`styles.css`.

**Risks.** Stats aren't fully apples-to-apples across roles — present factually, delta only the base
stats.

**Acceptance.** Two characters render side-by-side with base-stat deltas; deep-linkable via `?a=&b=`.

### B10. Loadout notes & tags (S–M)

**Problem.** Saved builds are just a name; no way to note "for abyss 12" or group by character/role.

**Approach.** Add an optional `notes` string and `tags` string[] to `LoadoutInput`; edit them in the
loadout editor; show + filter by tag on the Saved page. Included in export/import.

**Data.** Extends the loadout contract; persisted by the existing store.

**Files.** `packages/contracts/src/index.ts` (LoadoutInput), `components/LoadoutEditor.tsx`,
`pages/Saved.tsx`, `backup.ts`, `styles.css`.

**Risks.** Contract change ripples to the backend/static providers — both already spread unknown
fields, so low risk; add defaults.

**Acceptance.** A saved build keeps its note/tags across reload; the Saved page filters by tag;
notes/tags survive export/import.

---

## Theme D — Reference & content

### D2. Food buffs reference (S–M)

**Problem.** No cooking/food info — players ask "what food gives ATK/CRIT?" genshin-db has 385 foods
with effect text we don't surface.

**Approach.** Import stat-buff foods (ATK/CRIT/DEF/HP/revive/adventure), parse the `effect` for the
buff, and add a `/food` reference page with search + a type filter and the buff text/icons.

**Data.** genshin-db `foods()` (`effect`, `foodtype`, `rarity`, `images`, `ingredients`).

**Files.** `packages/dataset/scripts/import.mts` (+ a `foods.json` output), `packages/contracts`
(FoodSchema), loader, `frontend/src/pages/Food.tsx` (new), `api` + `static-api` fetchers, `App.tsx`.

**Risks.** Effect text is freeform — show it as text; only categorize by the obvious buff keyword.
Scope to buff/revive foods (skip pure-heal spam) to keep the list useful.

**Acceptance.** A Food page lists buff dishes with their effects, searchable + filterable by type;
works in HTTP and static modes.

### D3. Release timeline (S)

**Problem.** We now have debut `version` on characters, weapons, and sets, but nothing visualises it.

**Approach.** A `/timeline` page grouping characters/weapons by version (newest first), each linking
to its detail page — a quick "what came when" reference (and it showcases the signature pairings).

**Data.** Existing `version` fields.

**Files.** `frontend/src/pages/Timeline.tsx` (new), `App.tsx` (route/nav), `styles.css`.

**Risks.** Minimal; purely presentational.

**Acceptance.** Versions are listed newest-first with the characters/weapons that debuted in each,
linking through to detail pages.

---

## Theme C — Polish / UX

### C4. Light theme toggle (M)

**Problem.** Dark-only. Some users want light mode; the palette is already centralised in CSS vars.

**Approach.** Define a light palette under `[data-theme="light"]`, a toggle in the top bar persisted
to localStorage (default: system preference). Audit the hard-coded colours (a few `rgba(0,0,0,…)`
shadows, `#1a1a1a` on badges) to use variables.

**Data.** None.

**Files.** `frontend/src/styles.css` (light vars + audit), `frontend/src/App.tsx` (toggle),
`frontend/src/theme.ts` (new).

**Risks.** Contrast on rarity tints / accent-on-light; needs a visual pass. Some absolute colours
(gradients, shadows) need theming.

**Acceptance.** Toggle flips the whole app to a readable light theme and back; choice persists;
default follows `prefers-color-scheme`.

### C5. Shareable roster filter state (S)

**Problem.** Roster filters (element/weapon/rarity/region/sort) reset on reload and aren't linkable.

**Approach.** Mirror them into the URL query (like `/compare?a=&b=`), so a filtered view is
bookmarkable/shareable and survives reload.

**Data.** None.

**Files.** `frontend/src/pages/Roster.tsx` (useSearchParams).

**Risks.** Keep the URL clean (omit defaults).

**Acceptance.** Setting filters updates the URL; opening that URL restores the same filtered/sorted
view.

### C6. Character splash hero on the detail page (S)

**Problem.** The weapon detail has a splash-art hero, but the character page has a small icon — even
though we already import `splashArt` (used in the team builder).

**Approach.** Add a rarity-tinted hero to the character page using `character.splashArt`, mirroring
the weapon hero (name, element, weapon type, rarity, region).

**Data.** Existing `Character.splashArt`.

**Files.** `frontend/src/pages/Character.tsx`, `styles.css`.

**Risks.** A few beta/collab characters lack splash art — fall back to the icon.

**Acceptance.** The character page shows a rarity-tinted splash hero; characters without art fall
back cleanly.

---

## Suggested sequencing

| Order | Item | Theme | Effort | Why here |
|-------|------|-------|--------|----------|
| 1 | B8 Character compare | Feature | S | Mirrors existing compare; quick win |
| 2 | C6 Character splash hero | Polish | S | Reuses imported art; visual lift |
| 3 | C5 Shareable roster filters | Polish | S | Small, self-contained |
| 4 | E1 Ownership tracking | Planning | S–M | Upgrades roster/optimizer/team at once |
| 5 | A9 Auto-detect reactions | Accuracy | S | Reuses synergy's possibleReactions |
| 6 | D3 Release timeline | Reference | S | Purely presentational; uses version data |
| 7 | B10 Loadout notes & tags | Feature | S–M | Organizes saved builds |
| 8 | E2 Multi-character planner | Planning | M | High value; builds on D1 data |
| 9 | A8 Enemy presets + per-elem RES | Accuracy | S–M | Improves reaction realism |
| 10 | D2 Food buffs reference | Reference | S–M | One import; new page |
| 11 | C4 Light theme | Polish | M | Nice-to-have; needs a colour audit |
| 12 | A10 Energy / ER requirements | Accuracy | L | Meatiest + data-sparse (curation risk) |

Smallest-first. Items are independent except E2 (leans on D1, already shipped). A10 is the risky one
(particle data isn't in genshin-db) — treat like A5: build only what's confidently curatable, or defer.
