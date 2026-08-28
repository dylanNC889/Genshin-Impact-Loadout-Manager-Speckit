import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  computeBaseSheet,
  computeFinalStats,
  conditionalCombatEffects,
  instanceAvgDamage,
  statRecord,
  totalResShred,
} from "@app/stat-engine";
import {
  fetchArtifactSets,
  fetchCharacterDetail,
  fetchModifiers,
  fetchRules,
  fetchStatValues,
  fetchWeapons,
  getLoadout,
  listLoadouts,
  listTeams,
} from "../api";
import { Card, StatRow, ElementBadge, Icon, RarityStars } from "../components/ui";
import { DetailSkeleton } from "../components/Skeleton";
import { MaterialList } from "../components/MaterialList";
import { LoadoutEditor } from "../components/LoadoutEditor";
import { formatStat, statLabel } from "../format";
import { playstyleFor } from "../playstyle";
import { talentAdviceFor } from "../data/talentPriority";
import { decodeShare } from "../share";
import { getOwned, toggleOwned } from "../ownership";
import { pushRecent } from "../recent";
import { downloadCharacterCard } from "../cardImage";
import { EnemyFieldset, resolveEnemy } from "../components/DamageAssumptions";
import { REACTIONS } from "../teamDamage";
import { getDamagePrefs, setDamagePrefs, DEFAULT_DAMAGE_PREFS, type DamagePrefs } from "../damagePrefs";
import { useLoadoutStore } from "../state/loadoutStore";
import type { ArtifactSlot, Dataset, Element, LoadoutInput } from "@app/contracts";

const PRIMARY_ORDER = ["HP", "ATK", "DEF", "CRIT_RATE", "CRIT_DMG", "EM", "ER"];
const ASCENSION_FOR_LEVEL: Record<number, number> = { 1: 0, 20: 1, 40: 2, 50: 3, 60: 4, 70: 5, 80: 6, 90: 6 };
const SCALE_STAT_TO_KEY: Record<string, string> = { ATK: "ATK", "Max HP": "HP", DEF: "DEF" };
/** The three combat talents, in the order the skills are listed. */
const TALENT_CONTROLS = [
  { key: "NormalAttack", label: "Normal Attack" },
  { key: "ElementalSkill", label: "Elemental Skill" },
  { key: "ElementalBurst", label: "Elemental Burst" },
] as const;

/** Format a talent scaling value at the chosen talent level (FR-004). */
function fmtScale(row: { valuesByLevel: number[]; percent: boolean }, level: number): string {
  const v = row.valuesByLevel[level - 1] ?? row.valuesByLevel[row.valuesByLevel.length - 1] ?? 0;
  return row.percent ? `${v.toFixed(1)}%` : String(v);
}

// genshin-db appends the scaling stat to a row's label for non-ATK scalers ("Skill DMG Max HP",
// "… DMG DEF"); ATK-scaling DMG rows carry no suffix. Extract that trailing stat (or default a
// DMG row to ATK) so a row can read "Skill DMG: 46.6% of Max HP" (#7).
const SCALE_STAT_RX = /\s*:?\s*(Max HP|HP|DEF|ATK|Elemental Mastery|EM)\s*[+/]*\s*$/i;
function normScaleStat(s: string): string {
  const u = s.toUpperCase();
  if (u.includes("HP")) return "Max HP";
  if (u === "DEF") return "DEF";
  if (u === "ATK") return "ATK";
  return "EM";
}
function describeScaling(label: string, percent: boolean): { label: string; stat: string | null } {
  if (!percent || !/DMG/i.test(label)) return { label, stat: null };
  const m = label.match(SCALE_STAT_RX);
  if (m) {
    const cleaned = label.slice(0, m.index).replace(/[\s:/+]+$/, "").trim();
    return { label: cleaned || label, stat: normScaleStat(m[1] ?? "") };
  }
  return { label, stat: "ATK" };
}

export function CharacterPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const loadoutParam = searchParams.get("loadout");
  const buildParam = searchParams.get("build");
  const [level, setLevel] = useState(90);

  // Rotation builder (B): ordered talent-hit lines + a rotation length for DPS.
  const [rotation, setRotation] = useState<{ instId: string; count: number }[]>([]);
  const [rotSec, setRotSec] = useState(20);
  const [addId, setAddId] = useState("");
  const resetLoadout = useLoadoutStore((s) => s.reset);
  const setWeapon = useLoadoutStore((s) => s.setWeapon);
  const setArtifact = useLoadoutStore((s) => s.setArtifact);
  const setConstellation = useLoadoutStore((s) => s.setConstellation);
  const setRefinement = useLoadoutStore((s) => s.setRefinement);
  const setNotes = useLoadoutStore((s) => s.setNotes);
  const setTags = useLoadoutStore((s) => s.setTags);
  const hydrateConditionals = useLoadoutStore((s) => s.hydrateConditionals);
  // Equipped-build state, for per-talent damage (A7).
  const weaponId = useLoadoutStore((s) => s.weaponId);
  const artifacts = useLoadoutStore((s) => s.artifacts);
  const constellation = useLoadoutStore((s) => s.constellation);
  const refinement = useLoadoutStore((s) => s.refinement);
  const activeConditionals = useLoadoutStore((s) => s.activeConditionals);
  // Reaction + enemy the per-talent figures are read against (batch 7 #6), remembered per
  // character — Hu Tao is read on Vaporize, a Physical carry on nothing.
  const [dmgPrefs, setDmgPrefs] = useState<DamagePrefs>(DEFAULT_DAMAGE_PREFS);
  useEffect(() => {
    if (id) setDmgPrefs(getDamagePrefs(id));
  }, [id]);
  const updatePrefs = (patch: Partial<DamagePrefs>) => {
    setDmgPrefs((prev) => {
      const next = { ...prev, ...patch };
      if (id) setDamagePrefs(id, next);
      return next;
    });
  };

  // Per-talent levels (batch 7 #4) — a crowned Burst with a lower Skill/NA is the normal shape.
  const talentLevels = useLoadoutStore((s) => s.talentLevels);
  const setTalentLevel = useLoadoutStore((s) => s.setTalentLevel);
  const setAllTalentLevels = useLoadoutStore((s) => s.setAllTalentLevels);
  const setTalentLevels = useLoadoutStore((s) => s.setTalentLevels);

  const detail = useQuery({
    queryKey: ["character", id],
    queryFn: () => fetchCharacterDetail(id ?? ""),
    enabled: Boolean(id),
  });

  const character = detail.data?.character;
  const weaponsQ = useQuery({
    queryKey: ["weapons", character?.weaponType],
    queryFn: () => fetchWeapons(character?.weaponType),
    enabled: Boolean(character),
  });
  const setsQ = useQuery({ queryKey: ["artifact-sets"], queryFn: fetchArtifactSets });
  const rulesQ = useQuery({ queryKey: ["rules"], queryFn: fetchRules });
  const statValsQ = useQuery({ queryKey: ["stat-values"], queryFn: fetchStatValues });
  const modifiersQ = useQuery({ queryKey: ["modifiers"], queryFn: fetchModifiers });
  const savedLoadoutQ = useQuery({
    queryKey: ["saved-loadout", loadoutParam],
    queryFn: () => getLoadout(loadoutParam ?? ""),
    enabled: Boolean(loadoutParam),
  });
  // This character's saved builds, to load into the editor (#10).
  const loadoutsQ = useQuery({ queryKey: ["loadouts"], queryFn: listLoadouts });
  const savedBuilds = (loadoutsQ.data ?? []).filter((l) => l.characterId === id);
  // Saved teams that include this character (N — reverse lookup).
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: listTeams });
  const inTeams = (teamsQ.data ?? []).filter((t) => t.slots.some((s) => s.characterId === id));

  // Record this character as recently viewed (L).
  const characterForRecent = detail.data?.character;
  useEffect(() => {
    if (characterForRecent) {
      pushRecent({ id: characterForRecent.id, name: characterForRecent.name, icon: characterForRecent.icon });
    }
  }, [characterForRecent]);

  // Ownership toggle (E1) — also available here, mirroring the roster.
  const [owned, setOwned] = useState<boolean>(false);
  useEffect(() => {
    if (id) setOwned(getOwned("characters").has(id));
  }, [id]);
  const onToggleOwned = () => {
    if (!id) return;
    setOwned(toggleOwned("characters", id).has(id));
  };

  // Reset the loadout editor whenever the character changes.
  useEffect(() => {
    resetLoadout();
  }, [id, resetLoadout]);

  // Hydrate the editor from a shared build link (?build=<code>, B3) — no backend needed.
  // Links predating the fuller payload simply carry no conditionals/notes/tags; treat that as
  // "use the editor's defaults", which is what an unhydrated editor already does.
  useEffect(() => {
    if (!buildParam) return;
    const b = decodeShare<Partial<LoadoutInput>>(buildParam);
    if (!b) return;
    resetLoadout();
    if (typeof b.level === "number") setLevel(b.level);
    setWeapon(b.weaponId ?? null);
    if (typeof b.constellation === "number") setConstellation(b.constellation);
    if (typeof b.refinement === "number") setRefinement(b.refinement);
    for (const a of b.artifacts ?? []) {
      setArtifact(a.slot, { setId: a.setId, mainStat: a.mainStat, subStats: a.subStats });
    }
    setNotes(b.notes ?? "");
    setTags(b.tags ?? []);
    if (b.talentLevels) setTalentLevels(b.talentLevels);
    if (b.activeConditionals) hydrateConditionals(b.activeConditionals);
  }, [
    buildParam,
    resetLoadout,
    setWeapon,
    setArtifact,
    setConstellation,
    setRefinement,
    setNotes,
    setTags,
    setTalentLevels,
    hydrateConditionals,
  ]);

  // Hydrate the editor from a saved loadout when opened via ?loadout=<id> (FR-018 reopen).
  useEffect(() => {
    const saved = savedLoadoutQ.data;
    if (!saved) return;
    resetLoadout();
    setLevel(saved.level);
    setWeapon(saved.weaponId ?? null);
    setConstellation(saved.constellation ?? 0);
    setRefinement(saved.refinement ?? 1);
    setNotes(saved.notes ?? "");
    setTags(saved.tags ?? []);
    hydrateConditionals(saved.activeConditionals ?? []);
    if (saved.talentLevels) setTalentLevels(saved.talentLevels);
    for (const a of saved.artifacts) {
      setArtifact(a.slot, { setId: a.setId, mainStat: a.mainStat, subStats: a.subStats });
    }
  }, [
    savedLoadoutQ.data,
    resetLoadout,
    setWeapon,
    setArtifact,
    setConstellation,
    setRefinement,
    setNotes,
    setTags,
    setTalentLevels,
    hydrateConditionals,
  ]);

  if (detail.isLoading) return <div className="character"><DetailSkeleton /></div>;
  if (detail.error) return <p className="error">Failed to load: {(detail.error as Error).message}</p>;
  if (!detail.data) return <p className="muted">Not found.</p>;

  const { character: char, curves } = detail.data;
  const advice = talentAdviceFor(char.id, char.roles); // talent priority + how-to-play (M)

  // Shareable build card (K).
  function downloadCard() {
    const keys = ["HP", "ATK", "DEF", "CRIT_RATE", "CRIT_DMG", "EM", "ER"];
    const stats = keys.map((k) => ({ label: statLabel(k), value: formatStat(k, finalStats[k] ?? 0) }));
    const elKey = `${char.element.toUpperCase()}_DMG`;
    if (finalStats[elKey]) stats.push({ label: `${char.element} DMG`, value: formatStat(elKey, finalStats[elKey]!) });
    const weaponName = weaponsQ.data?.find((w) => w.id === weaponId)?.name;
    const counts = new Map<string, number>();
    for (const a of Object.values(artifacts)) if (a?.setId) counts.set(a.setId, (counts.get(a.setId) ?? 0) + 1);
    const topSetId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const setName = setsQ.data?.find((s) => s.id === topSetId)?.name;
    void downloadCharacterCard({
      name: char.name,
      element: char.element,
      level,
      splashUrl: char.wideSplashArt || char.splashArt || char.icon,
      stats,
      weapon: weaponName,
      set: setName,
    });
  }
  // Client-side recalculation — instant on level change (Principle IV / FR-003).
  const sheet = statRecord(computeBaseSheet(char, level, 6, curves));
  const extras = Object.entries(sheet).filter(
    ([key, value]) => !PRIMARY_ORDER.includes(key) && key.endsWith("_DMG") && value !== 0,
  );

  // Modifiers (A1) are additive extras: if that request is unavailable, the gear editor still
  // loads — it just applies no constellation/refinement bonuses (graceful degradation).
  const modifiers = modifiersQ.data ?? { constellationBonuses: {}, weaponRefinements: {}, conditionalBuffs: [] };
  const gearReady = weaponsQ.data && setsQ.data && rulesQ.data && statValsQ.data;

  // Final stats from the currently-equipped build (A7) — for per-talent damage. Falls back to
  // base stats when nothing is geared. Never throws (e.g. mid-edit invalid weapon).
  let finalStats: Record<string, number> = sheet;
  if (gearReady) {
    try {
      const clientDataset: Dataset = {
        meta: { gameVersion: "client", datasetVersion: "client", generatedAt: "" },
        curves,
        characters: [char],
        weapons: weaponsQ.data,
        artifactSets: setsQ.data,
        slotStatRules: rulesQ.data,
        constellationBonuses: modifiers.constellationBonuses,
        weaponRefinements: modifiers.weaponRefinements,
        conditionalBuffs: modifiers.conditionalBuffs,
      };
      const loadout: LoadoutInput = {
        name: "",
        characterId: char.id,
        level,
        ascensionPhase: ASCENSION_FOR_LEVEL[level] ?? 6,
        weaponId,
        constellation,
        refinement,
        notes: "",
        tags: [],
        activeConditionals,
        talentLevels,
        artifacts: (Object.entries(artifacts) as [ArtifactSlot, (typeof artifacts)[ArtifactSlot]][])
          .filter(([, d]) => d)
          .map(([slot, d]) => ({ slot, setId: d!.setId, mainStat: d!.mainStat, subStats: d!.subStats })),
      };
      finalStats = statRecord(computeFinalStats(loadout, clientDataset).stats);
    } catch {
      /* keep base sheet */
    }
  }

  /** The configured level for a talent, defaulting non-combat rows to the Normal Attack level. */
  const levelForTalent = (talentType: string): number =>
    talentType === "ElementalSkill"
      ? talentLevels.ElementalSkill
      : talentType === "ElementalBurst"
        ? talentLevels.ElementalBurst
        : talentLevels.NormalAttack;

  // Combat effects the enabled conditional buffs contribute that the stat sheet can't hold:
  // per-hit DMG% scoped to one talent, and enemy RES shred (both were previously dropped).
  const combat = conditionalCombatEffects(activeConditionals, modifiers.conditionalBuffs, refinement);
  const enemy = resolveEnemy(dmgPrefs.enemyPreset, dmgPrefs.enemyLevel, dmgPrefs.enemyRes);
  // A preset can raise RES for one element specifically (the "-resistant" presets).
  const baseRes = enemy.byElement?.[char.element] ?? enemy.res;
  const enemyRes = baseRes - totalResShred(combat.resShred, char.element as Element);
  const reactionMultiplier = REACTIONS[dmgPrefs.reaction]?.mult ?? 1;

  /** The per-hit DMG% that applies to a given talent row — Charged Attack rows live under the
   *  Normal Attack talent but are buffed by different passives, so scope by the row's label. */
  const rowTalentBonus = (talentType: string, rowLabel: string): number => {
    if (talentType === "NormalAttack") {
      return /charged/i.test(rowLabel) ? combat.talentDmgPct.ChargedAttack : combat.talentDmgPct.NormalAttack;
    }
    if (talentType === "ElementalSkill") return combat.talentDmgPct.ElementalSkill;
    if (talentType === "ElementalBurst") return combat.talentDmgPct.ElementalBurst;
    return 0;
  };

  // Average (crit-weighted) damage of a talent scaling row at the current build, or null when
  // it's not a computable ATK/HP/DEF-scaling DMG row.
  const rowDamage = (
    row: { valuesByLevel: number[]; percent: boolean; label: string },
    scaleStat: string | null,
    talentType: string,
  ): number | null => {
    const key = scaleStat ? SCALE_STAT_TO_KEY[scaleStat] : undefined;
    if (!key) return null;
    const lvl = levelForTalent(talentType);
    const mult = row.valuesByLevel[lvl - 1] ?? row.valuesByLevel[row.valuesByLevel.length - 1] ?? 0;
    if (!row.percent || !mult) return null;
    return instanceAvgDamage({
      multiplier: mult,
      statValue: finalStats[key] ?? 0,
      critRate: finalStats.CRIT_RATE ?? 0,
      critDmg: finalStats.CRIT_DMG ?? 0,
      dmgBonusPct: finalStats[`${char.element.toUpperCase()}_DMG`] ?? 0,
      talentDmgBonusPct: rowTalentBonus(talentType, row.label),
      reactionMultiplier,
      em: finalStats.EM ?? 0,
      charLevel: level,
      enemyLevel: enemy.level,
      enemyResistancePct: enemyRes,
    });
  };

  // Every computable DMG hit across the talents, for the rotation builder (B).
  const TYPE_ABBR: Record<string, string> = { NormalAttack: "NA", ElementalSkill: "Skill", ElementalBurst: "Burst" };
  const damageInstances: { id: string; type: string; label: string; perHit: number }[] = [];
  for (const s of char.skills) {
    s.scaling.forEach((row, i) => {
      const { label, stat } = describeScaling(row.label, row.percent);
      const perHit = rowDamage(row, stat, s.type);
      if (perHit != null) {
        damageInstances.push({ id: `${s.id}-${i}`, type: s.type, label: `${TYPE_ABBR[s.type] ?? s.type} · ${label}`, perHit });
      }
    });
  }
  const instById = new Map(damageInstances.map((d) => [d.id, d]));
  const rotTotal = rotation.reduce((sum, l) => sum + (instById.get(l.instId)?.perHit ?? 0) * l.count, 0);

  const addLine = () => {
    if (addId) setRotation((r) => [...r, { instId: addId, count: 1 }]);
  };
  // A quick generic rotation: best Skill hit, best Burst hit, and 6× the best Normal-attack hit.
  const quickFill = () => {
    const best = (type: string) =>
      damageInstances.filter((d) => d.type === type).sort((a, b) => b.perHit - a.perHit)[0];
    const lines: { instId: string; count: number }[] = [];
    const skill = best("ElementalSkill");
    const burst = best("ElementalBurst");
    const na = best("NormalAttack");
    if (skill) lines.push({ instId: skill.id, count: 1 });
    if (burst) lines.push({ instId: burst.id, count: 1 });
    if (na) lines.push({ instId: na.id, count: 6 });
    setRotation(lines);
  };

  return (
    <div className="character">
      <Link to="/" className="back">
        ← Back to roster
      </Link>

      <header className={`char-hero rarity-${char.rarity}${char.wideSplashArt ? " has-splash" : ""}`}>
        {char.wideSplashArt ? (
          <img className="char-hero-bg" src={char.wideSplashArt} alt="" aria-hidden="true" loading="lazy" />
        ) : null}
        <div className="char-hero-info">
          <div className="char-tags">
            <ElementBadge element={char.element} />
            <span className="badge muted-badge">{char.weaponType}</span>
            <RarityStars rarity={char.rarity} />
            <button
              type="button"
              className={`own-btn${owned ? " owned" : ""}`}
              onClick={onToggleOwned}
              aria-pressed={owned}
              aria-label={owned ? `Mark ${char.name} not owned` : `Mark ${char.name} owned`}
              title={owned ? "Owned" : "Not owned"}
            >
              {owned ? "✓ Owned" : "＋ Own"}
            </button>
            <button type="button" className="own-btn card-btn" onClick={downloadCard} title="Download a shareable build card">
              📷 Card
            </button>
          </div>
          <h1>{char.name}</h1>
          {char.region ? <p className="char-hero-region muted small">{char.region}</p> : null}
          {char.roles.length ? <div className="muted small">Roles: {char.roles.join(", ")}</div> : null}
        </div>
        {!char.wideSplashArt ? (
          char.splashArt ? (
            <img className="char-hero-art" src={char.splashArt} alt={char.name} loading="lazy" />
          ) : (
            <Icon src={char.icon} alt={char.name} size={96} />
          )
        ) : null}
      </header>

      <section className="card char-intro">
        {char.title ? <div className="intro-title">“{char.title}”</div> : null}
        <p className="intro-playstyle">{playstyleFor(char)}</p>
        <div className="intro-advice">
          <span className="ta-label">Talents</span> <strong>{advice.priority}</strong>
          <span className="muted"> · {advice.note}</span>
        </div>
        {char.description ? <p className="intro-lore">{char.description}</p> : null}
        {char.region || char.affiliation || char.constellation || char.cv ? (
          <dl className="intro-meta">
            {char.region ? (
              <div>
                <dt>Region</dt>
                <dd>{char.region}</dd>
              </div>
            ) : null}
            {char.affiliation ? (
              <div>
                <dt>Affiliation</dt>
                <dd>{char.affiliation}</dd>
              </div>
            ) : null}
            {char.constellation ? (
              <div>
                <dt>Constellation</dt>
                <dd>{char.constellation}</dd>
              </div>
            ) : null}
            {char.cv ? (
              <div>
                <dt>CV (EN)</dt>
                <dd>{char.cv}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </section>

      {savedBuilds.length ? (
        <section className="card saved-builds">
          <div className="saved-builds-head">
            <h3>Your saved builds</h3>
            <span className="muted small">Load one into the editor below</span>
          </div>
          <ul className="saved-builds-list">
            {savedBuilds.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/character/${id}?loadout=${b.id}`}
                  className={`saved-build-chip${loadoutParam === b.id ? " active" : ""}`}
                >
                  <span className="saved-build-name">{b.name || "Untitled build"}</span>
                  <span className="muted small">Lv {b.level}</span>
                  {b.tags?.length ? (
                    <span className="saved-build-tags">{b.tags.map((t) => `#${t}`).join(" ")}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {inTeams.length ? (
        <section className="card in-teams">
          <h3>In your teams</h3>
          <ul className="in-teams-list">
            {inTeams.map((t) => (
              <li key={t.id}>
                <Link to={`/team?team=${t.id}`} className="in-team-chip">
                  <span className="in-team-name">{t.name}</span>
                  <span className="muted small">
                    {t.slots.filter((s) => s.characterId).length}/4
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {gearReady ? (
        <LoadoutEditor
          character={char}
          curves={curves}
          weapons={weaponsQ.data ?? []}
          artifactSets={setsQ.data ?? []}
          rules={rulesQ.data!}
          statValues={statValsQ.data!}
          modifiers={modifiers}
          level={level}
          editingLoadoutId={loadoutParam}
        />
      ) : (
        <p className="muted">Loading gear options…</p>
      )}

      <div className="char-body">
        <Card title="Base Stats">
          <div className="ascension-control">
            <label htmlFor="level">Level</label>
            <input
              id="level"
              className="slider"
              type="range"
              min={1}
              max={90}
              step={1}
              value={level}
              aria-valuetext={`Level ${level}`}
              onChange={(e) => setLevel(Number(e.target.value))}
            />
            <span className="slider-value">Lv {level}</span>
          </div>
          {PRIMARY_ORDER.map((key) => (
            <StatRow key={key} label={statLabel(key)} value={formatStat(key, sheet[key] ?? 0)} />
          ))}
          {extras.map(([key, value]) => (
            <StatRow key={key} label={statLabel(key)} value={formatStat(key, value)} />
          ))}
        </Card>

        <Card title="Skills">
          <div className="talent-advice">
            <div>
              <span className="ta-label">Level priority</span>
              <span className="ta-priority">{advice.priority}</span>
            </div>
            <p className="ta-note">{advice.note}</p>
          </div>
          <div className="dmg-assumptions">
            <div className="dmg-form">
              <EnemyFieldset
                preset={dmgPrefs.enemyPreset}
                onPreset={(enemyPreset) => updatePrefs({ enemyPreset })}
                level={dmgPrefs.enemyLevel}
                onLevel={(enemyLevel) => updatePrefs({ enemyLevel })}
                res={dmgPrefs.enemyRes}
                onRes={(enemyRes) => updatePrefs({ enemyRes })}
              />
              <fieldset className="dmg-group">
                <legend>Reaction</legend>
                <label>
                  <span>Amplifying</span>
                  <select
                    value={dmgPrefs.reaction}
                    onChange={(e) => updatePrefs({ reaction: e.target.value })}
                    aria-label="Reaction"
                  >
                    {Object.entries(REACTIONS).map(([key, r]) => (
                      <option key={key} value={key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>
            </div>
            <p className="muted small">
              The "≈" figures below use these assumptions — approximate, and before any team buffs.
            </p>
          </div>
          <div className="talent-controls">
            {TALENT_CONTROLS.map(({ key, label }) => (
              <div className="talent-control" key={key}>
                <label htmlFor={`talent-${key}`}>{label}</label>
                <input
                  id={`talent-${key}`}
                  className="slider"
                  type="range"
                  min={1}
                  max={15}
                  step={1}
                  value={talentLevels[key]}
                  aria-valuetext={`${label} level ${talentLevels[key]}`}
                  onChange={(e) => setTalentLevel(key, Number(e.target.value))}
                />
                <span className="slider-value">Lv {talentLevels[key]}</span>
              </div>
            ))}
            <div className="talent-set-all">
              <span className="muted small">Set all</span>
              {[1, 6, 8, 9, 10, 13].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="btn small ghost"
                  onClick={() => setAllTalentLevels(n)}
                  aria-label={`Set all talents to level ${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <ul className="skills">
            {char.skills.map((s) => (
              <li key={s.id}>
                <div className="skill-head">
                  <Icon src={s.icon} alt="" size={32} className="skill-icon" />
                  <div className="skill-head-text">
                    <span className="skill-type">{s.type}</span>
                    <span className="skill-name">{s.name}</span>
                  </div>
                </div>
                {s.description ? <span className="skill-desc">{s.description}</span> : null}
                {s.scaling.length ? (
                  <table className="scaling">
                    <tbody>
                      {s.scaling.map((row, i) => {
                        const { label, stat } = describeScaling(row.label, row.percent);
                        const dmg = rowDamage(row, stat, s.type);
                        return (
                          <tr key={i}>
                            <td>{label}</td>
                            <td>
                              {fmtScale(row, levelForTalent(s.type))}
                              {stat ? <span className="scale-stat"> of {stat}</span> : null}
                            </td>
                            <td className="scale-dmg">{dmg != null ? `≈ ${Math.round(dmg).toLocaleString()}` : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="muted small">≈ average crit damage for the equipped build vs a Lv 90 enemy (10% RES).</p>
        </Card>
      </div>

      {damageInstances.length ? (
        <Card title="Rotation damage">
          <div className="rot-add">
            <select value={addId} onChange={(e) => setAddId(e.target.value)} aria-label="Add a talent hit">
              <option value="">— add a hit —</option>
              {damageInstances.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label} (≈{Math.round(d.perHit).toLocaleString()})
                </option>
              ))}
            </select>
            <button type="button" className="mini" onClick={addLine} disabled={!addId}>
              Add
            </button>
            <button type="button" className="mini" onClick={quickFill}>
              Quick fill
            </button>
            {rotation.length ? (
              <button type="button" className="mini" onClick={() => setRotation([])}>
                Clear
              </button>
            ) : null}
          </div>
          {rotation.length ? (
            <>
              <ul className="rot-list">
                {rotation.map((line, i) => {
                  const inst = instById.get(line.instId);
                  if (!inst) return null;
                  return (
                    <li key={i}>
                      <span className="rot-label">{inst.label}</span>
                      <input
                        type="number"
                        min={1}
                        value={line.count}
                        onChange={(e) =>
                          setRotation((r) =>
                            r.map((l, idx) => (idx === i ? { ...l, count: Math.max(1, Number(e.target.value) || 1) } : l)),
                          )
                        }
                        aria-label={`${inst.label} count`}
                        className="rot-count"
                      />
                      <span className="rot-total">≈ {Math.round(inst.perHit * line.count).toLocaleString()}</span>
                      <button
                        type="button"
                        className="rot-remove"
                        onClick={() => setRotation((r) => r.filter((_, idx) => idx !== i))}
                        aria-label={`Remove ${inst.label}`}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="rot-summary">
                <div>
                  <span className="wish-big">{Math.round(rotTotal).toLocaleString()}</span>
                  <span className="muted"> total / rotation</span>
                </div>
                <label className="rot-dur">
                  <span className="muted small">Rotation length</span>
                  <input
                    type="number"
                    min={1}
                    value={rotSec}
                    onChange={(e) => setRotSec(Math.max(1, Number(e.target.value) || 1))}
                    aria-label="Rotation length seconds"
                  />
                  <span className="muted small">s →</span>
                  <strong>{Math.round(rotTotal / rotSec).toLocaleString()} DPS</strong>
                </label>
              </div>
            </>
          ) : (
            <p className="muted small">
              Add talent hits (or “Quick fill”) to estimate a rotation. Numbers use the equipped build + talent level.
            </p>
          )}
        </Card>
      ) : null}

      {char.constellations.length ? (
        <Card title="Constellations">
          <ul className="skills">
            {char.constellations.map((con) => (
              <li key={con.level}>
                <div className="skill-head">
                  <Icon src={con.icon} alt="" size={32} className="skill-icon" />
                  <div className="skill-head-text">
                    <span className="skill-type">C{con.level}</span>
                    <span className="skill-name">{con.name}</span>
                  </div>
                </div>
                {con.description ? <span className="skill-desc">{con.description}</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {char.ascensionMaterials.length || char.talentMaterials.length ? (
        <Card title="Materials — what to farm">
          <div className="mat-cols">
            <div>
              <h4 className="mat-title">Ascension (Lv 90)</h4>
              <MaterialList items={char.ascensionMaterials} />
            </div>
            <div>
              <h4 className="mat-title">One talent → Lv 10</h4>
              <MaterialList items={char.talentMaterials} />
              <p className="muted small">×3 for all talents (books/boss shared).</p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
