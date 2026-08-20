# Genshin Impact Loadout & Team Builder — project guide

A local-first web app for building Genshin Impact character loadouts and teams, with a client-side
stat/damage engine, an artifact optimizer, and a pile of planning/reference tools. Spec-Kit project
(`specs/`), deployed to GitHub Pages (static mode) but normally run locally against a Fastify backend.

Remote: `https://github.com/dylanNC889/Genshin-Impact-Loadout-Manager-Speckit`

---

## Stack & layout (pnpm + Turborepo monorepo)

- `packages/contracts` — Zod schemas + TS types (single source of truth). `Dataset`, `LoadoutInput`,
  `Character`, `Weapon`, `ArtifactSet`, `Food`, `ConditionalBuff`, etc.
- `packages/stat-engine` — pure calc: `computeBaseSheet`, `computeFinalStats`, `estimateTeamDamage`,
  `instanceAvgDamage`, `assessSynergy`. No I/O. Vitest tests in `packages/stat-engine/tests/`.
- `packages/dataset` — loads `data/genshindb/*.json` + `data/modifiers/*.json` into a `Dataset`.
  Also holds the build-time generators in `packages/dataset/scripts/`.
- `packages/optimizer` — GOOD-inventory artifact optimizer (`@app/optimizer`).
- `backend` — Fastify + JSON `FileStore` (`backend/.data/store.json`, gitignored). Routes under
  `/api/v1` (e.g. `/api/v1/characters`, `/api/v1/meta/modifiers`, `/api/v1/foods`). `/health`.
- `frontend` — React + Vite, TanStack Query + Zustand. Pages in `frontend/src/pages/`.

**Two runtime modes** (switched by a build flag): **HTTP** (dev — hits the backend `/api`) and
**static** (`PAGES=true` — bundles `frontend/public/dataset.json` + uses `localStorage`; see
`frontend/src/static-api.ts`). Any new data on the `Dataset` must be threaded through **both** the
backend route (`backend/src/api/*`) and the static provider.

---

## Running it

```bash
pnpm dev          # backend :3001 + frontend :5174 (concurrently)
```

- Frontend: **http://localhost:5174** (only URL you open; it proxies `/api` → backend).
- Backend: **http://localhost:3001** (`PORT=3001`; default is 3000). Frontend proxy target is
  `VITE_PROXY_TARGET` (defaults to `http://localhost:3000`, so dev sets it to `:3001`).
- Backend dev is `tsx watch --watch-path=../data` — reloads on `data/` changes; a route/src change
  may need a restart.

**⚠️ Do NOT kill dev servers with `lsof -ti :PORT | xargs kill`.** On macOS that once cascaded and
revoked this process's `~/Documents` (TCC) folder access, making the whole project `EPERM` until the
session was restarted. Restart cleanly instead:
```bash
PORT=3001 pnpm --filter @app/backend start
cd frontend && VITE_PROXY_TARGET=http://localhost:3001 pnpm exec vite --port 5174 --strictPort
```
(Run vite **from `frontend/`** — running it from the repo root roots it wrong and serves 404s.)

To drive/screenshot the app, write a Playwright script **inside `frontend/`** (so `@playwright/test`
resolves) importing `chromium`, e.g. `frontend/shot.mjs`, then `cd frontend && node shot.mjs`.

---

## Verify (do this before every commit)

```bash
pnpm typecheck          # tsc -b across the workspace
pnpm test               # vitest (unit) — 75 tests
cd frontend && npx playwright test --workers=4   # E2E — 46 tests
npx eslint <changed files>
```

- **E2E runs its own isolated servers** (backend `:3100`, frontend `:5199`) via
  `frontend/playwright.config.ts` — independent of the `:3001/:5174` dev servers.
- The E2E store is wiped in the backend web-server **command**
  (`rm -f backend/.data/e2e-store.json && …`) — `globalSetup` alone races startup.
- **Parallel flakiness**: the suite shares one backend store across workers, and heavy pages under
  full load can time out. If a full run flakes, re-run with `--workers=3/4` — that's the tell it's
  contention, not a regression. Robust-test rules learned here:
  - Tests that create/delete loadouts/teams **loop-delete all** matching rows to clean up.
  - Other tests seed builds into the shared store, so anything that assumes "empty account" must
    handle the populated case (e.g. Farmable checks "Show everything" when present).
  - Scope ambiguous locators (`getByLabel("Character", { exact: true })`; scope nav clicks to
    `.compare-nav` / primary `nav`).

---

## Data pipeline

Source is the **`genshin-db`** npm package (build-time only). Icons come from CDNs:
- **enka.network** (`https://enka.network/ui/<filename>.png`) for most assets. Sends CORS `*`.
- **Project Amber** (`https://gi.yatta.moe/assets/UI/<filename>.png`) for **food icons** — enka 404s
  ~1/3 of them. Also CORS `*`.

Generators (run manually, then commit the outputs; `frontend/public/dataset.json` is **gitignored**):
```bash
npx tsx packages/dataset/scripts/import.mts              # → data/genshindb/*.json (characters/weapons/sets/foods)
npx tsx packages/dataset/scripts/gen-material-sources.mts # → frontend/src/data/materialSources.ts (farm hints)
npx tsx packages/dataset/scripts/gen-material-domains.mts # → frontend/src/data/materialDomains.ts (domain+weekdays; char & weapon)
pnpm export:dataset                                       # → frontend/public/dataset.json (static mode)
```
When you regenerate `data/genshindb/*.json`, **verify the diff is additive** (only the new field
changes per record) before committing — the files are one-record-per-line.

**Asset gotchas** (fixed, but recur with new patches):
- Newest characters: the vertical gacha slice (`UI_Gacha_AvatarIcon_*`, our `splashArt`) isn't on any
  CDN yet. The importer **HEAD-checks each slice and falls back to the wide splash** (`wideSplashArt`,
  `UI_Gacha_AvatarImg_*`) — self-healing, fail-safe (keeps the slice on network error).
- Burst skill icons: genshin-db returns `Skill_E_<name>_01_HD` but new chars only have the **non-`_HD`**
  variant; the importer strips `_HD`.
- The `<Icon>` component degrades a failed image to a neutral placeholder tile (no broken glyph).

**Curated data** (hand-maintained, in `frontend/src/data/`): `recommendations.ts` (KQM weapons/sets),
`talentPriority.ts`, `teamTemplates.ts`, `versionDates.ts` (patch dates 1.0–6.7), `erRequirements.ts`,
`realDishes.ts` (fantasy→real dish), plus `data/modifiers/conditional-buffs.json`. These are
**approximate/meta-dependent** — expect to update them, and label them as approximate in the UI.

---

## Engine / contract notes

- **Zod `.default()` gotcha**: a field with `.default()` is optional in `z.input` but **required** in
  `z.infer` (the output type = `LoadoutInput`). So every `LoadoutInput` literal must include all
  defaulted fields (`notes: ""`, `tags: []`, `activeConditionals: []`, `constellation`, `refinement`…).
  Places to update when adding one: `LoadoutEditor.tsx`, `Character.tsx` (finalStats calc),
  `packages/optimizer/src/index.ts` baseLoadout, and stat-engine test fixtures.
- **Modifiers** (`data/modifiers/`) are applied additively via `route(pools, key, value)` in
  `packages/stat-engine/src/stats/final-stats.ts`: constellation bonuses, weapon refinements, and
  **conditional buffs** (opt-in via `LoadoutInput.activeConditionals`, keyed to weapon id / set+pieces).
  The engine only folds **sheet-additive** stats (ATK%/CRIT/EM/ER/HP%/DEF%/element & physical DMG) —
  per-hit-only (NA/CA/Skill/Burst DMG%) and RES-shred effects are intentionally out of scope.
- Damage: amplifying reactions (`teamDamage.ts` `REACTIONS`), transformative + catalyze
  (Aggravate/Spread add to the hit), EM scaling. Team buffs + **element-scoped RES shred** live in
  `frontend/src/teamBuffs.ts` (`resShredForElement` — VV shreds swirlable only, Zhongli universal).
  `frontend/src/teamDamage.ts` `computeTeamDamage` is shared by the team builder and team compare.

---

## Feature map (where things live)

- Roster (`Roster.tsx`) — filters (element/weapon/rarity/region/owned/has-build, URL-persisted),
  favourites, ownership (`ownership.ts`), recently-viewed strip (`recent.ts`).
- Character (`Character.tsx`) — wide-splash hero, intro+playstyle+talent-priority, owned toggle,
  saved-builds picker, "In your teams", loadout editor, base stats (level slider), skills
  (per-talent damage), **rotation builder**, constellations, materials (farm tooltips).
- Loadout editor (`components/LoadoutEditor.tsx`) — weapon/artifact pickers (KQM optgroups), suggested
  build, refinement/constellation, **conditional buff checkboxes**, final stats, share link.
- Team builder (`TeamBuilder.tsx`) — icon picker, portraits, **templates**, synergy, LIVE damage
  (bars + effective-RES readout + enemy presets + auto-react + ER check), shareable PNG card.
- Reference: Weapons/Artifacts/Food lists + detail pages (Food detail has real-recipe mapping).
- Compare: build (`Compare.tsx`), character, weapon, team — all linked by `components/CompareNav.tsx`.
- Planner (`Planner.tsx`), Optimize (`Optimize.tsx`, GOOD import → `inventory.ts`), Inventory
  (`Inventory.tsx`, CV grading), Timeline (`Timeline.tsx`), Farmable (`Farmable.tsx`, talent+weapon
  domains by weekday), Wishes (`Wishes.tsx`, pity/pull planner + target picker), Saved (`Saved.tsx`).
- Shareable PNG cards: `cardImage.ts` (canvas; CDN CORS makes it untainted). Backup: `backup.ts`
  (export/import all localStorage + saved data). Skeletons: `components/Skeleton.tsx`.

---

## Conventions

- **Branch before editing** (never commit straight to `main`). One PR per backlog item, smallest→largest.
- Squash-merge and delete the branch; then `git checkout main && git pull --ff-only`.
- **Do NOT commit**: `.claude/settings.local.json`, `frontend/public/dataset.json`,
  `backend/.data/*store*.json` (all gitignored — confirm with `git status --short | grep -v ...`).
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- PR bodies end with: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- Every UI change: typecheck + lint + relevant E2E + a screenshot to eyeball it.

---

## Backlog / history

Six batches, all shipped (specs in `specs/improvements-backlog{,-2,-3,-4}.md`, tracked in `BACKLOG.md`):
1. Pages & polish (8). 2. Accuracy/features (11, PRs #11–22). 3. Backup/search/materials (7, #38–46).
4. Compare/timeline/food/theme (12, #51–62). 5. User-listed refinements + image fixes (#64–77).
6. `improvements-backlog-4.md` — 14 items J,N,L,C,D,M,F,E,K,I,G,H,B,A (#79–92), then feedback
   refinements (#94–99: team-card crop, farmable weapon icons, wish target picker, compare sub-nav,
   talent-priority in intro, current-meta templates, expanded conditional buffs).

**Workflow when the user gives new work**: they usually say "brainstorm" → "spec them out" (write a
`specs/improvements-backlog-N.md` with Problem→Approach→Data→Files→Effort→Risks→Acceptance +
smallest→largest sequencing, commit as a docs PR) → "start smallest to largest" (implement each as its
own PR). If they just list concrete items, skip the spec and build directly, smallest first.
