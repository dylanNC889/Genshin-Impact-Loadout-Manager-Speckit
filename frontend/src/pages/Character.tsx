import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { computeBaseSheet, statRecord } from "@app/stat-engine";
import {
  fetchArtifactSets,
  fetchCharacterDetail,
  fetchRules,
  fetchStatValues,
  fetchWeapons,
  getLoadout,
} from "../api";
import { Card, StatRow, ElementBadge, Icon, RarityStars } from "../components/ui";
import { LoadoutEditor } from "../components/LoadoutEditor";
import { formatStat, statLabel } from "../format";
import { playstyleFor } from "../playstyle";
import { decodeShare } from "../share";
import { useLoadoutStore } from "../state/loadoutStore";
import type { LoadoutInput } from "@app/contracts";

const PRIMARY_ORDER = ["HP", "ATK", "DEF", "CRIT_RATE", "CRIT_DMG", "EM", "ER"];

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
  const [talentLevel, setTalentLevel] = useState(10);
  const resetLoadout = useLoadoutStore((s) => s.reset);
  const setWeapon = useLoadoutStore((s) => s.setWeapon);
  const setArtifact = useLoadoutStore((s) => s.setArtifact);

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
  const savedLoadoutQ = useQuery({
    queryKey: ["saved-loadout", loadoutParam],
    queryFn: () => getLoadout(loadoutParam ?? ""),
    enabled: Boolean(loadoutParam),
  });

  // Reset the loadout editor whenever the character changes.
  useEffect(() => {
    resetLoadout();
  }, [id, resetLoadout]);

  // Hydrate the editor from a shared build link (?build=<code>, B3) — no backend needed.
  useEffect(() => {
    if (!buildParam) return;
    const b = decodeShare<Partial<LoadoutInput>>(buildParam);
    if (!b) return;
    resetLoadout();
    if (typeof b.level === "number") setLevel(b.level);
    setWeapon(b.weaponId ?? null);
    for (const a of b.artifacts ?? []) {
      setArtifact(a.slot, { setId: a.setId, mainStat: a.mainStat, subStats: a.subStats });
    }
  }, [buildParam, resetLoadout, setWeapon, setArtifact]);

  // Hydrate the editor from a saved loadout when opened via ?loadout=<id> (FR-018 reopen).
  useEffect(() => {
    const saved = savedLoadoutQ.data;
    if (!saved) return;
    resetLoadout();
    setLevel(saved.level);
    setWeapon(saved.weaponId ?? null);
    for (const a of saved.artifacts) {
      setArtifact(a.slot, { setId: a.setId, mainStat: a.mainStat, subStats: a.subStats });
    }
  }, [savedLoadoutQ.data, resetLoadout, setWeapon, setArtifact]);

  if (detail.isLoading) return <p className="muted">Loading character…</p>;
  if (detail.error) return <p className="error">Failed to load: {(detail.error as Error).message}</p>;
  if (!detail.data) return <p className="muted">Not found.</p>;

  const { character: char, curves } = detail.data;
  // Client-side recalculation — instant on level change (Principle IV / FR-003).
  const sheet = statRecord(computeBaseSheet(char, level, 6, curves));
  const extras = Object.entries(sheet).filter(
    ([key, value]) => !PRIMARY_ORDER.includes(key) && key.endsWith("_DMG") && value !== 0,
  );

  const gearReady = weaponsQ.data && setsQ.data && rulesQ.data && statValsQ.data;

  return (
    <div className="character">
      <Link to="/" className="back">
        ← Back to roster
      </Link>

      <div className="char-header">
        <div className="char-header-top">
          <Icon src={char.icon} alt={char.name} size={72} />
          <h1>{char.name}</h1>
        </div>
        <div className="char-tags">
          <ElementBadge element={char.element} />
          <span className="badge muted-badge">{char.weaponType}</span>
          <RarityStars rarity={char.rarity} />
        </div>
        {char.roles.length ? <div className="muted small">Roles: {char.roles.join(", ")}</div> : null}
      </div>

      <section className="card char-intro">
        {char.title ? <div className="intro-title">“{char.title}”</div> : null}
        <p className="intro-playstyle">{playstyleFor(char)}</p>
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

      {gearReady ? (
        <LoadoutEditor
          character={char}
          curves={curves}
          weapons={weaponsQ.data ?? []}
          artifactSets={setsQ.data ?? []}
          rules={rulesQ.data!}
          statValues={statValsQ.data!}
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
          <div className="talent-control">
            <label htmlFor="talent">Talent level</label>
            <input
              id="talent"
              className="slider"
              type="range"
              min={1}
              max={15}
              step={1}
              value={talentLevel}
              onChange={(e) => setTalentLevel(Number(e.target.value))}
            />
            <span className="slider-value">Lv {talentLevel}</span>
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
                        return (
                          <tr key={i}>
                            <td>{label}</td>
                            <td>
                              {fmtScale(row, talentLevel)}
                              {stat ? <span className="scale-stat"> of {stat}</span> : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>

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
    </div>
  );
}
