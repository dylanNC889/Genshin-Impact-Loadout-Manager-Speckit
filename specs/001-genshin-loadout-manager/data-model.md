# Phase 1 Data Model: Genshin Impact Loadout & Team Builder

**Feature**: `001-genshin-loadout-manager` | **Date**: 2026-06-23

Derived from the spec's Key Entities and Functional Requirements. Two domains:
**Reference data** (read-mostly, seeded from `data/<version>/`, served by the API) and
**User data** (read/write, persisted per user). Field types are conceptual (the
authoritative shapes live in `@app/contracts` Zod schemas and the Prisma schema).

## Enumerations

- **Element**: `Pyro | Hydro | Electro | Cryo | Anemo | Geo | Dendro`
- **WeaponType**: `Sword | Claymore | Polearm | Bow | Catalyst`
- **ArtifactSlot**: `Flower | Plume | Sands | Goblet | Circlet`
- **StatKey**: `HP | HP_PCT | ATK | ATK_PCT | DEF | DEF_PCT | EM | CRIT_RATE | CRIT_DMG |
  ER | HEAL_BONUS | PYRO_DMG | HYDRO_DMG | ELECTRO_DMG | CRYO_DMG | ANEMO_DMG | GEO_DMG |
  DENDRO_DMG | PHYS_DMG`
- **TalentType**: `NormalAttack | ElementalSkill | ElementalBurst | Passive`
- **Role**: `MainDPS | SubDPS | Healer | Shielder | Buffer | Battery`
- **Rarity**: `4 | 5` (star)

## Reference entities

### Character
- `id` (stable slug, e.g. `hu-tao`), `name`, `element` (Element), `weaponType`
  (WeaponType), `rarity` (Rarity)
- `baseStats`: { `baseHP`, `baseATK`, `baseDEF` } at level 1
- `growthCurveId`: reference to the shared level-growth curve (D1)
- `ascension`: ordered list of 6 phases, each { `hpAdd`, `atkAdd`, `defAdd`,
  `ascensionStat`: { key: StatKey, value } }
- `ascensionStatKey`: StatKey (the dedicated bonus stat, e.g. CRIT_RATE)
- `roles`: Role[] (drives synergy role coverage, D4)
- `talents`: Skill[]
- **Validation**: `weaponType` constrains which weapons can be equipped (FR-005);
  `element` feeds resonance/reaction (FR-013/FR-014).

### Skill / Talent
- `id`, `characterId` (FK Character), `type` (TalentType), `name`, `description`
- `scaling`: per talent level (1–N) → list of labeled multipliers/values
- **Validation**: every Character has at least NormalAttack, ElementalSkill,
  ElementalBurst (FR-004).

### Weapon
- `id`, `name`, `weaponType` (WeaponType), `rarity`
- `baseATKCurveId`, `baseATK` (at level 1)
- `secondaryStat`: { key: StatKey, value } (the substat line)
- `passive`: { `description`, `statBonuses`: { key: StatKey, value }[] } — only the
  **stat-granting** portion is applied to final stats (FR-008); non-stat effects are
  descriptive.
- **Validation**: assignable only to a Character whose `weaponType` matches (FR-005).

### ArtifactSet
- `id`, `name`
- `bonus2`: { `description`, `statBonuses`: { key, value }[] }
- `bonus4`: { `description`, `statBonuses`: { key, value }[] } (stat portion applied; other
  effects descriptive)
- **Validation**: 2-piece active at ≥2 equipped pieces, 4-piece at =4 (FR-009).

### SlotStatRules (data table)
- `slot` (ArtifactSlot) → `allowedMainStats`: StatKey[]
- global `allowedSubStats`: StatKey[]
- **Validation**: enforces FR-007 (flower=HP flat, plume=ATK flat, etc.) on both client and
  server.

### StatValuesTable (data table)
- `mainStatValues`: Record<StatKey → number> — the fixed max-level (5★ +20) main stat
  value per stat key (e.g., `Flower HP=4780`, `ATK_PCT=46.6`, `CRIT_DMG=62.2`).
- `subStatValues`: Record<StatKey → number[]> — the allowed per-roll substat values per
  stat (e.g., `CRIT_DMG=[5.4,6.2,7.0,7.8]`).
- **Validation**: enforces FR-022 — the build UI offers only these values (dropdowns /
  fixed), so artifact stat values cannot be entered free-form.

### ResonanceRule / ReactionMatrix (data tables)
- ResonanceRule: `element` (Element) → { `name`, `description`, `requiresCount`: 2 }
- ReactionMatrix: unordered `{elementA, elementB}` → `reactionName` (drives FR-014).

### DatasetMeta
- `gameVersion` (e.g. `4.6`), `datasetVersion`, `generatedAt`
- **Validation**: exactly one active dataset; exposed via API (FR-021/SC-008).

## User entities

### Artifact (embedded within a Loadout — user-entered piece)
- `slot` (ArtifactSlot), `setId` (FK ArtifactSet)
- `mainStat`: { key: StatKey, value }
- `subStats`: up to 4 × { key: StatKey, value }
- **Validation**: `mainStat.key ∈ SlotStatRules[slot].allowedMainStats`; subStat keys ∈
  allowed pool, ≤4, no duplicate keys, none equal to the main stat (FR-006/FR-007).

### Loadout
- `id`, `name`, `characterId` (FK Character)
- `level`, `ascensionPhase` (0–6), `talentLevels` per talent
- `weaponId` (FK Weapon, nullable — partial loadout allowed, FR-011)
- `artifacts`: Artifact[0..5] (slots may be unfilled — partial, FR-011)
- `computedFinalStats`: derived (NOT persisted as source of truth; recomputed by
  `stat-engine`); may be cached for display
- **Validation**: `weaponId` weaponType must match character (FR-005); at most one Artifact
  per slot. Final stats recomputed on any change (FR-008/FR-010).
- **State**: Draft (in editor) → Saved (FR-018). Editable/duplicable/deletable.

### Team
- `id`, `name`
- `slots`: ordered list of up to 4 × { `characterId` (FK Character), `loadoutId` (FK
  Loadout, nullable) } (FR-012/FR-017)
- `synergy`: derived (resonances, possible reactions, role coverage — `stat-engine`, D4)
- **Validation**: ≤4 slots; `characterId` values MUST be distinct (no duplicate character —
  spec assumption); a slot's `loadoutId`, if set, MUST reference a Loadout for that slot's
  character.
- **State**: Draft → Saved (FR-019). Partial team (<4) permitted with partial assessment
  (FR-015 / US3 scenario 5).

### User
- `id`, `displayName`
- Owns Loadouts and Teams.
- **Note**: single-user this version (one implicit/local user); entity exists so saved data
  is scoped and the model extends cleanly if multi-user is added later (no auth in scope).

## Relationships (summary)

```text
User 1───* Loadout *───1 Character 1───* Skill
                  │            ▲
                  └─0..1 Weapon│ (weaponType must match)
                  └─0..5 Artifact *───1 ArtifactSet
User 1───* Team 1───* TeamSlot *───1 Character
                              └─0..1 Loadout
DatasetMeta 1───1 (active reference dataset: Characters, Weapons, ArtifactSets, rule tables)
```

## Derived / computed (owned by `stat-engine`, never hand-stored as truth)

- **Loadout.computedFinalStats** — base (D1) + weapon + artifacts + active set/weapon
  stat bonuses, in the D2 aggregation order.
- **Team.synergy** — active resonances, triggerable reactions, role coverage + gaps (D4).
- **Team damage estimate** — on-demand only, returned with assumptions (D5, FR-016).

## Requirement → entity traceability

| FR | Entities/fields |
|----|-----------------|
| FR-001/002/003 | Character, Skill, growth curve, ascension |
| FR-004 | Skill.scaling, talentLevels |
| FR-005 | Weapon.weaponType ↔ Character.weaponType |
| FR-006/007 | Artifact, SlotStatRules |
| FR-008/010 | computedFinalStats (stat-engine) |
| FR-009 | ArtifactSet.bonus2/bonus4 |
| FR-011 | Loadout.weaponId nullable, artifacts[0..5] |
| FR-012 | Team.slots (≤4, distinct) |
| FR-013/014 | ResonanceRule, ReactionMatrix |
| FR-015 | Team.synergy (role coverage) |
| FR-016 | on-demand damage estimate |
| FR-017 | Team.slots.loadoutId (per-slot loadout association) |
| FR-018/019/020 | Loadout/Team saved state, User ownership |
| FR-021 | DatasetMeta + reference dataset |
