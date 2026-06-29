# Backlog

Tracked backlog for the Genshin Impact Loadout & Team Builder. **Bugs are higher priority
than improvements** — fix bugs first, and add any new bug at the top of the Bugs section.

## 🐞 Bugs

_None open._

### Fixed
- **Substat values / multi-roll** — substats now model a base roll + 4 shared upgrade rolls
  (`Upgrades: X/4`), each roll independently any canonical value (line total = sum), plus a
  "set total" slider that auto-fills rolls. Fixed CRIT DMG showing twice in Final Stats.
- **Duplicate doesn't work** — `sendJson` set `content-type: application/json` on bodyless
  POSTs (`/duplicate`), so Fastify rejected the empty body with 400. Now only sets the header
  when there's a body.

## ✨ Improvements

1. **Weapons page + Artifacts page** — browsable list pages for all weapons and all
   artifact sets, mirroring the character roster (`frontend/src/pages/Roster.tsx`). Data +
   icons already exist via `GET /api/v1/weapons` and `/artifact-sets`. Add routes
   `/weapons` and `/artifacts` + nav links in `App.tsx`.

2. **Character level + talent level: sliders, not dropdowns** — on the character page,
   replace the Level `<select>` (`LEVEL_ANCHORS` 1/20/40/50/60/70/80/90) and the
   Talent-level `<select>` (1–15) with range sliders. The engine already interpolates, so
   the level slider could be continuous 1–90.

3. **Build (loadout editor) at the top** — move `<LoadoutEditor>` above the stats/skills on
   the character page (currently below `char-body`). Order: header → build → stats + skills.

4. **Character intro panel** — small intro per character (lore + playstyle/roles) on the
   right side, above stats/build. Lore from genshin-db (`title`/`description`/`affiliation`/
   `region`/`constellation`/`cv`) via new contract fields + importer. **Decision needed:**
   playstyle text isn't in genshin-db — author short blurbs vs template from role/element/weapon.

5. **Team screen redesign (Genshin-style)** — rework `TeamBuilder.tsx` from cramped dropdowns
   to: **left** a grid of character icons to pick from, **right** portraits of the selected
   team (up to 4). Keep distinct-character enforcement + per-slot loadout association.
   Likely needs a larger portrait/splash image (enka `UI_Gacha_AvatarImg_<name>` — verify).

6. **Recommended weapons/artifacts at top of dropdowns** — surface recommended weapons and
   artifact sets at the top of the loadout-editor dropdowns (e.g. a "Recommended" optgroup).
   **Decision needed:** genshin-db has no build-rec data — curated per-character recs vs
   heuristics (element/role/stat-based), or a community build-data source.

7. **Show scaling stat in skill/talent rows** — talent scaling rows show e.g. "1-Hit DMG →
   83.7%" but not the stat it scales off. Add it: "1-Hit DMG: 83.7% of ATK" (ATK / Max HP /
   DEF / EM). Derive by parsing the talent `description` or a curated per-character map.

8. **Skill/talent icons** — icon per skill (NA / Skill / Burst) next to the name in
   `Character.tsx`, from genshin-db talent image filenames via enka, like the other icons.
   Add a `Skill.icon` contract field + populate in the importer.
