# Feature Specification: Genshin Impact Loadout & Team Builder

**Feature Branch**: `001-genshin-loadout-manager`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "build an application for the video game genshin impact. this will be a loadout manager, where we can select a character and it will show all the stats and skills. We can then give that character gear, weapon and artifacts(sets and stats), which would change the character's stats. We also must have a team builder as each team has 4 characters in it. showing synergy (or lack of) between characters."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and inspect a character (Priority: P1)

A player selects a character from the roster and immediately sees that character's
complete profile: base attributes (HP, ATK, DEF, Elemental Mastery, Crit Rate, Crit
DMG, Energy Recharge, and element-specific bonuses), the character's element and
weapon type, and their full skill set (normal attack, elemental skill, elemental
burst, and passive talents) with descriptions and per-level values.

**Why this priority**: Viewing accurate character information is the foundation of the
entire app. Nothing else (gearing, team building) has meaning until a player can
reliably find a character and read their stats and skills. This story alone delivers
a usable "character reference" product.

**Independent Test**: Can be fully tested by selecting any character and confirming the
displayed base stats, element, weapon type, and skill descriptions match the game's
reference values — with no gear equipped.

**Acceptance Scenarios**:

1. **Given** the character roster is displayed, **When** the player selects a
   character, **Then** the system shows that character's base stats at their current
   level, their element and weapon type, and all skills with descriptions.
2. **Given** a character is displayed, **When** the player changes the character's
   level (or ascension phase), **Then** the displayed base stats update to the values
   for that level.
3. **Given** a character is displayed, **When** the player opens a specific skill,
   **Then** the system shows the skill's effect and its scaling values at the selected
   talent level.

---

### User Story 2 - Build a loadout and see recalculated stats (Priority: P2)

A player equips a selected character with a weapon and a set of artifacts (each
artifact contributing a main stat, substats, and set membership), and the character's
final stats recalculate to reflect everything equipped, including any active artifact
set bonuses and weapon passive stat bonuses.

**Why this priority**: This is the headline "loadout manager" capability. It turns a
static character reference into a planning tool, letting players see exactly how gear
choices change a character's effective stats before committing resources in-game.

**Independent Test**: Can be fully tested by equipping a character with a known weapon
and a known set of 5 artifacts, then confirming the recalculated final stats (and any
2-piece/4-piece set bonus indicators) match expected values for that exact loadout.

**Acceptance Scenarios**:

1. **Given** a character with no gear, **When** the player equips a weapon, **Then**
   the character's stats update to include the weapon's base attack and its secondary
   stat / passive bonus.
2. **Given** a character with a weapon, **When** the player equips an artifact in each
   of the 5 slots (flower, plume, sands, goblet, circlet) with chosen main stats and
   substats, **Then** the character's final stats reflect the sum of all artifact main
   stats and substats.
3. **Given** equipped artifacts, **When** 2 or 4 pieces of the same set are present,
   **Then** the system indicates the active 2-piece and/or 4-piece set bonus and
   applies any stat portion of that bonus to the displayed stats.
4. **Given** a fully geared character, **When** the player removes or swaps a piece of
   gear, **Then** the displayed stats and active set bonuses recalculate immediately to
   reflect the change.
5. **Given** an artifact main stat or substat is invalid for its slot, **When** the
   player attempts to assign it, **Then** the system prevents the assignment and
   explains why.

---

### User Story 3 - Build a team and evaluate synergy (Priority: P3)

A player assembles a team of exactly 4 characters and sees an assessment of the team's
synergy — including elemental composition, active elemental resonance, the elemental
reactions the team can trigger, and role coverage — along with clear callouts where
the team lacks synergy.

**Why this priority**: Team synergy is a core part of how the game is actually played
and is the second headline capability the user requested. It builds on character
selection (P1) and is most valuable once loadouts (P2) exist, but can be delivered and
demonstrated on its own using base characters.

**Independent Test**: Can be fully tested by adding 4 specific characters to a team and
confirming the system reports the correct elemental resonance(s), the set of possible
elemental reactions, and at least one synergy or anti-synergy callout consistent with
those characters.

**Acceptance Scenarios**:

1. **Given** an empty team, **When** the player adds characters up to 4, **Then** the
   system accepts up to 4 and prevents adding a 5th.
2. **Given** a team with 2 or more characters of the same element, **When** the team is
   evaluated, **Then** the system reports the corresponding elemental resonance as
   active.
3. **Given** a team with multiple elements, **When** the team is evaluated, **Then** the
   system lists the elemental reactions the team is able to trigger.
4. **Given** a team whose members cover overlapping or missing roles, **When** the team
   is evaluated, **Then** the system surfaces a synergy assessment that highlights both
   strengths and gaps (e.g., "no healer", "no off-field damage source").
5. **Given** a team with fewer than 4 characters, **When** the player views it, **Then**
   the system still shows a partial assessment and indicates the team is incomplete.

---

### User Story 4 - Save and manage loadouts and teams (Priority: P4)

A player saves a configured character loadout or a team under a name, and later
retrieves, edits, duplicates, or deletes it, so that comparisons and plans persist
across sessions.

**Why this priority**: Persistence makes the tool a "manager" rather than a one-off
calculator, but the core analytic value (P1–P3) is usable without it. It is therefore
the lowest priority of the core stories.

**Independent Test**: Can be fully tested by saving a named loadout and a named team,
restarting the session, and confirming both are retrievable with all selections intact.

**Acceptance Scenarios**:

1. **Given** a configured loadout, **When** the player saves it with a name, **Then** it
   appears in the player's saved loadouts and can be reopened with all gear intact.
2. **Given** a saved team, **When** the player reopens it in a later session, **Then**
   all 4 character slots and their associated loadouts (if any) are restored.
3. **Given** a saved loadout or team, **When** the player duplicates it, **Then** an
   independent copy is created that can be edited without affecting the original.
4. **Given** a saved loadout or team, **When** the player deletes it, **Then** it is
   removed and no longer appears in the saved list.

---

### Edge Cases

- How does the system handle a character whose base stats vary by ascension phase at the
  same character level (the game has stat jumps at ascension breakpoints)?
- What happens when a team includes the same character twice — is it allowed? (Assumed
  not allowed; a character may occupy at most one slot in a team.)
- How does the system handle an incomplete loadout (fewer than 5 artifacts, or no
  weapon) when displaying final stats?
- How are conflicting or mutually exclusive artifact main stats handled per slot (e.g.,
  a flower must roll flat HP)?
- What happens when underlying game reference data is updated to a newer game version
  and previously saved loadouts reference a character, weapon, or set that changed?
- How does synergy evaluation behave for a team of off-meta or unconventional members
  for which no notable synergy exists (must still return a meaningful, non-empty
  assessment rather than a blank result)?

## Requirements *(mandatory)*

### Functional Requirements

**Character data & display**

- **FR-001**: System MUST present a browsable, searchable roster of playable characters.
- **FR-002**: System MUST display, for a selected character, their element, weapon type,
  rarity, and base attributes (HP, ATK, DEF, Elemental Mastery, Crit Rate, Crit DMG,
  Energy Recharge, and the character's ascension stat bonus).
- **FR-003**: System MUST allow the player to set a character's level/ascension and
  recompute displayed base stats accordingly.
- **FR-004**: System MUST display all of a character's skills (normal/charged attacks,
  elemental skill, elemental burst, and passive talents) with descriptions and the
  ability to view scaling values at a chosen talent level.

**Loadout / gear**

- **FR-005**: System MUST allow assigning one weapon (matching the character's weapon
  type) to a character, contributing the weapon's base attack and secondary stat.
- **FR-006**: System MUST allow assigning artifacts to the 5 artifact slots (flower,
  plume, sands, goblet, circlet), each with a main stat, up to four substats, and a set
  identity.
- **FR-007**: System MUST restrict each artifact slot's allowable main stats and
  substats to those valid for that slot, and prevent invalid assignments with an
  explanation.
- **FR-008**: System MUST recompute and display the character's final effective stats as
  the combination of base stats, weapon contribution, artifact main stats and substats,
  and any stat-granting set or weapon-passive bonuses.
- **FR-009**: System MUST detect active artifact set bonuses (2-piece and 4-piece) based
  on equipped pieces and indicate which bonuses are active.
- **FR-010**: System MUST update displayed final stats immediately whenever any gear
  element is added, removed, or changed.
- **FR-011**: System MUST support viewing a character with a partial or empty loadout
  and clearly indicate which slots are unequipped.
- **FR-022**: Equipment stat values MUST be chosen from the canonical set of valid values
  for each stat, never entered free-form. Specifically: a weapon's stats are fixed by the
  reference dataset; an artifact's main stat value is the fixed max-level value for that
  stat key; and an artifact's substat values are selected from that stat's allowed roll
  values. The build UI MUST present these as dropdowns (or fixed, read-only values), so an
  invalid value cannot be entered.

**Team building & synergy**

- **FR-012**: System MUST allow assembling a team of up to 4 distinct characters and
  MUST prevent adding more than 4 or adding the same character twice.
- **FR-013**: System MUST report active elemental resonance(s) based on the elemental
  composition of the team.
- **FR-014**: System MUST list the elemental reactions the team is capable of triggering
  given its members' elements.
- **FR-015**: System MUST produce, on the main team view by default, a qualitative
  rule-based synergy assessment that identifies both positive synergies and
  gaps/anti-synergies — covering elemental resonance, possible elemental reactions, and
  role coverage (damage, support, healing, shielding, energy generation) with
  scored/labeled ratings — and MUST return a meaningful assessment even when synergy is
  weak. This default assessment MUST NOT require running a full damage simulation.
- **FR-016**: System MUST provide an explicit, user-initiated action (e.g., a
  "calculate" button) that runs a quantitative analysis estimating team damage /
  reaction-damage output. This computation MUST be on-demand only — never required to
  view the default synergy assessment in FR-015 — and MUST present its assumptions
  (e.g., rotation, enemy baseline) alongside the results. The calculation is delivered
  client-side for unsaved teams; a server-side equivalent exists for saved teams.
- **FR-017**: System MUST allow associating each team member with a specific saved
  loadout so synergy, role, and quantitative assessments can account for geared stats
  where available.

**Persistence & management**

- **FR-018**: Users MUST be able to save, name, reopen, edit, duplicate, and delete
  character loadouts.
- **FR-019**: Users MUST be able to save, name, reopen, edit, duplicate, and delete
  teams, preserving each slot's character and associated loadout.
- **FR-020**: Saved loadouts and teams MUST persist across sessions for the same user.

**Reference data**

- **FR-021**: System MUST provide a bundled, curated reference dataset that populates
  characters, their base-stat curves and skills, weapons, and artifact sets and their
  bonuses, so a player can build loadouts without manually entering game data. The
  dataset MUST cover the full current roster of playable characters, weapons, and
  artifact sets for the targeted game version, and MUST be updatable so each new game
  version's additions and changes can be incorporated.

### Key Entities *(include if feature involves data)*

- **Character**: A playable unit. Attributes: name, element, weapon type, rarity, base
  stat curves by level/ascension, ascension bonus stat, and a set of skills. Relates to
  Skills and may be placed in a Team and given a Loadout.
- **Skill / Talent**: An ability belonging to a character (normal attack, elemental
  skill, elemental burst, or passive). Attributes: type, description, and scaling values
  by talent level.
- **Stat**: A named attribute value (e.g., HP, ATK, Crit Rate). Used for base stats,
  weapon stats, artifact main stats/substats, and computed final stats.
- **Weapon**: An equippable item with a weapon type, base attack curve, a secondary
  stat, and a passive effect (which may grant stats). Equipped to a Character within a
  Loadout.
- **Artifact**: An equippable piece tied to a slot (flower/plume/sands/goblet/circlet),
  with a main stat, substats, and membership in an Artifact Set.
- **Artifact Set**: A named collection of artifacts granting 2-piece and 4-piece bonuses
  when enough pieces are equipped.
- **Loadout**: A named configuration of one character plus an equipped weapon and up to
  five artifacts, producing a set of computed final stats.
- **Team**: A named collection of up to 4 distinct characters, each optionally tied to a
  Loadout, with derived synergy information.
- **Elemental Resonance**: A team-level bonus condition derived from the team's elemental
  composition.
- **Elemental Reaction**: An interaction between two elements that the team can trigger,
  derived from its members' elements.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can locate any character in the roster and view their complete
  base stats and skills in under 10 seconds from opening the app.
- **SC-002**: After any change to a character's gear, the recalculated final stats are
  reflected to the player within 1 second (perceived as instantaneous), satisfying the
  project's interactive-response performance budget.
- **SC-003**: For a curated test set of at least 30 known character+loadout
  combinations, the system's computed final stats match the game's actual values within
  a tolerance of ±0.5% (±1 for integer-displayed fields) for at least 99% of stat fields.
- **SC-004**: A player can assemble a complete 4-character team and receive a synergy
  assessment (resonance, possible reactions, and role-coverage callouts) for any valid
  combination, with no combination producing an empty or error result.
- **SC-005**: Elemental resonance and possible-reaction reporting is correct for 100% of
  a curated test set covering all single-element, dual-element, and mixed compositions.
- **SC-006**: A saved loadout or team is fully restored — every selection intact — in
  100% of save-then-reopen attempts across separate sessions.
- **SC-007**: At least 90% of first-time test users can build a full loadout (character +
  weapon + 5 artifacts) and create a team without external instructions.
  *(Post-launch usability metric — measured via moderated usability testing, not gated by
  an automated build task.)*
- **SC-008**: The bundled reference dataset covers 100% of the targeted game version's
  live roster of playable characters, weapons, and artifact sets, and can be refreshed to
  reflect each subsequent game version's additions and changes.
- **SC-009**: When a player triggers the on-demand quantitative calculation, the team's
  estimated damage result and the assumptions used are presented within 5 seconds for a
  complete 4-character team.

## Assumptions

- The application targets a single player managing their own loadouts and teams; no
  multi-user collaboration, sharing, or social features are in scope for this version.
- Saved loadouts and teams persist per user across sessions; account/identity mechanics
  beyond distinguishing one user's saved data are out of scope for this version.
- A character may occupy at most one slot within a single team (no duplicate characters
  in a team).
- Stat calculations aim to mirror the game's published mechanics (base-stat curves,
  weapon/artifact contributions, set and weapon-passive stat bonuses); non-stat combat
  mechanics (cooldowns, animations, in-combat timing) are out of scope.
- "Gear" in the user's description is interpreted as the character's equippable items —
  i.e., one weapon plus the five artifact slots — not a separate equipment category.
- The default synergy assessment focuses on team composition (elements, resonance,
  reactions, and roles); full quantitative damage simulation is available only on demand
  via an explicit user action (see FR-015 and FR-016).
- The on-demand quantitative calculation relies on documented, displayed assumptions
  (e.g., a standard rotation and a baseline enemy); it is an estimate, not a guarantee of
  in-game results.
- The product supplies a bundled, curated game reference dataset covering the full
  current roster, maintained and refreshed per game version (see FR-021).
- The on-demand damage estimate uses one generic v1 rotation — a single cast each of
  Elemental Burst and Elemental Skill plus a fixed normal/charged-attack string per
  member, at configured talent levels, against the baseline enemy (Lv 90, 10% RES);
  reaction multipliers apply when team elements enable a reaction. Per-character
  optimized rotations are out of scope for v1.

## Dependencies

- Availability of accurate Genshin Impact reference data (character base-stat curves,
  skills, weapons, artifact sets and bonuses, elemental resonance and reaction rules)
  sufficient to drive stat calculation and synergy evaluation (see FR-021), maintained
  and refreshed for each game version.
