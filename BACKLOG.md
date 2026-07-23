# Backlog

Tracked backlog for the Genshin Impact Loadout & Team Builder. **Bugs are higher priority
than improvements** — fix bugs first, and add any new bug at the top of the Bugs section.

## 🐞 Bugs

_None open._

### Fixed
- **Character roles inaccurate (everyone defaulted to Main DPS)** — the importer's
  `ROLE_OVERRIDES` only curated ~17 characters and defaulted the rest to `["MainDPS"]`, so
  supports/healers like Barbara showed as Main DPS. Expanded to a full 115-character role map
  (e.g. Barbara → Healer/Sub-DPS, Qiqi → Healer, Gorou → Buffer). Data regenerated.
- **3★ weapons missing from the db** — the importer excluded rarity 3, so the Weapons page's
  3★ filter was empty and 3★ build options (Thrilling Tales, Harbinger of Dawn, etc.) weren't
  selectable. Now imports 3–5★ weapons (skips 1–2★ trash); `RaritySchema` accepts 3; +24 weapons
  (200 → 224). Recommendations regenerated so 3★ budget picks map through.
- **"Prized Isshin Blade" duplicated on the Weapons page** — genshin-db lists the story-variant
  sword 3× under the same id, so the importer wrote 3 identical entries. On the Weapons grid the
  shared React `key={w.id}` made the stale card mis-reconcile and linger under the wrong filters.
  Fixed by de-duplicating by id in the loader (`packages/dataset/src/index.ts`, the single funnel)
  and the importer, + a dataset test asserting no duplicate weapon/set ids. Data regenerated
  (202 → 200 weapons).
- **Substat values / multi-roll** — substats now model a base roll + 4 shared upgrade rolls
  (`Upgrades: X/4`), each roll independently any canonical value (line total = sum), plus a
  "set total" slider that auto-fills rolls. Fixed CRIT DMG showing twice in Final Stats.
- **Duplicate doesn't work** — `sendJson` set `content-type: application/json` on bodyless
  POSTs (`/duplicate`), so Fastify rejected the empty body with 400. Now only sets the header
  when there's a body.

## ✨ Improvements

1. ✅ **DONE** — **Weapons page + Artifacts page** — browsable list pages for all weapons and
   all artifact sets, mirroring the character roster. New `frontend/src/pages/Weapons.tsx`
   (search + weapon-type + rarity filters; shows base ATK + secondary stat) and
   `Artifacts.tsx` (search; shows 2pc/4pc bonuses). Routes `/weapons` + `/artifacts` and nav
   links added in `App.tsx`; supporting CSS (`.grid.wide`, `.ref-stats`, `.set-*`) in `styles.css`.

2. ✅ **DONE** — **Character level + talent level: sliders, not dropdowns** — replaced both
   `<select>`s in `Character.tsx` with range sliders. Level is now **continuous 1–90** (engine
   interpolates), talent 1–15; each shows a live "Lv N" value. `.slider`/`.slider-value` CSS
   added. (Ascension phase still fixed at 6, unchanged from prior behavior.)

3. ✅ **DONE** — **Build (loadout editor) at the top** — `<LoadoutEditor>` moved above
   `char-body` in `Character.tsx`. Order is now header → build → base stats + skills.

4. ✅ **DONE** — **Character intro panel** — intro card (title + playstyle + lore + region/
   affiliation/constellation/CV) renders below the header in `Character.tsx`. Lore fields
   (`title`/`description`/`affiliation`/`region`/`constellation`/`cv`) added to `CharacterSchema`,
   populated by the importer, threaded through the loader, and regenerated into `data/genshindb`
   + `frontend/public/dataset.json`. Playstyle = **curated blurbs with template fallback**
   (`frontend/src/playstyle.ts`; ~16 curated, rest generated from role/element/weapon).
   4 collab/beta chars (aloy, nicole, skirk, zibai) have no genshin-db lore → show playstyle only.

5. ✅ **DONE** — **Team screen redesign (Genshin-style)** — `TeamBuilder.tsx` reworked to
   **left** = searchable icon grid picker (click to add to first empty slot / click again to
   remove), **right** = 4 vertical portrait slots with per-slot loadout `<select>`, remove
   button, and view link. Distinct-character rule preserved. Added a `splashArt` contract
   field sourced from genshin-db `filename_gachaSlice` (enka `UI_Gacha_AvatarIcon_<name>`,
   320×1024 vertical portrait — verified 200/image-png; chosen over the wide gachaSplash).
   Data regenerated. New CSS `.team-builder/.team-picker/.picker-*/.portrait-*`.

6. ✅ **DONE** — **Recommended weapons/artifacts at top of dropdowns** — weapon + artifact-set
   pickers in `LoadoutEditor.tsx` now show a "★ Recommended (KQM)" `<optgroup>` above an "All …"
   group. **Source: KeqingMains quick guides** — extracted per character (parallel research
   agents over `keqingmains.com/q/<char>-quickguide/`), mapped to our dataset ids (95% weapons /
   94% sets matched; unmatched are 3★ weapons / 4★ sets we don't stock). Vendored to
   `frontend/src/data/recommendations.ts` (114/115 chars, top 6 weapons / 5 sets, ranked);
   `frontend/src/recommendations.ts` exposes `recommendedFor()` with an element-set heuristic
   fallback for the 1 uncovered char (nicole). No live/runtime dependency on KQM.

7. ✅ **DONE** — **Show scaling stat in skill/talent rows** — DMG rows now read "Skill DMG:
   46.6% of Max HP" / "1-Hit DMG: 83.7% of ATK". Derived in `Character.tsx` (`describeScaling`):
   genshin-db already appends the stat to non-ATK rows ("… DMG Max HP", "… DMG DEF"), so we
   extract + strip that suffix and default suffix-less DMG rows to ATK. Non-damage rows
   (healing, buffs, cooldowns) are left un-annotated to avoid wrong claims. Frontend-only.

8. ✅ **DONE** — **Skill/talent icons** — icon per skill (NA / Skill / Burst) next to the name
   in `Character.tsx`. Added `Skill.icon` to the contract, populated in the importer from
   genshin-db `talents().images.filename_combat1/2/3` (enka URLs), threaded through the loader.
   Data regenerated (345/345 skills have icons). New `.skill-head` layout + `.skill-icon` CSS.

---

## Later batches (spec'd in `specs/improvements-backlog{,-2,-3}.md`) — ✅ ALL DONE

- **Batch 2** (`improvements-backlog.md`, 11 items, A1–A4 / B1–B4 / C1–C3) — EM reactions,
  per-instance damage breakdown, teammate buffs, constellations + weapon refinements, roster
  filters/favourites, weapon/artifact detail pages, build compare, and the artifact optimizer
  (`/optimize`, `@app/optimizer`). Merged (PRs #11–#22).
- **Batch 3** (`improvements-backlog-2.md`, 7 items) — export/import backup, weapon compare,
  constellation-modifier correction, global search, ascension/talent materials, per-talent
  damage numbers, transformative + catalyze reactions. Merged (PRs #38–#46).
- **Batch 4** (`improvements-backlog-3.md`, 12 items) — character compare, splash hero,
  shareable roster filters, ownership tracking, auto-detect reactions, release timeline,
  loadout notes & tags, multi-character material planner, enemy presets (per-element RES),
  food buffs page, light theme, and approximate per-member ER requirements. Merged (PRs #51–#62).
