import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { computeBaseSheet, statRecord, LEVEL_ANCHORS } from "@app/stat-engine";
import {
  fetchArtifactSets,
  fetchCharacterDetail,
  fetchRules,
  fetchStatValues,
  fetchWeapons,
  getLoadout,
} from "../api";
import { Card, StatRow, ElementBadge, RarityStars } from "../components/ui";
import { LoadoutEditor } from "../components/LoadoutEditor";
import { formatStat, statLabel } from "../format";
import { useLoadoutStore } from "../state/loadoutStore";

const PRIMARY_ORDER = ["HP", "ATK", "DEF", "CRIT_RATE", "CRIT_DMG", "EM", "ER"];

/** Format a talent scaling value at the chosen talent level (FR-004). */
function fmtScale(row: { valuesByLevel: number[]; percent: boolean }, level: number): string {
  const v = row.valuesByLevel[level - 1] ?? row.valuesByLevel[row.valuesByLevel.length - 1] ?? 0;
  return row.percent ? `${v.toFixed(1)}%` : String(v);
}

export function CharacterPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const loadoutParam = searchParams.get("loadout");
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
        <h1>{char.name}</h1>
        <div className="char-tags">
          <ElementBadge element={char.element} />
          <span className="badge muted-badge">{char.weaponType}</span>
          <RarityStars rarity={char.rarity} />
        </div>
        {char.roles.length ? <div className="muted small">Roles: {char.roles.join(", ")}</div> : null}
      </div>

      <div className="char-body">
        <Card title="Base Stats">
          <div className="ascension-control">
            <label htmlFor="level">Level</label>
            <select id="level" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
              {LEVEL_ANCHORS.map((l) => (
                <option key={l} value={l}>
                  Lv {l}
                </option>
              ))}
            </select>
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
            <select id="talent" value={talentLevel} onChange={(e) => setTalentLevel(Number(e.target.value))}>
              {Array.from({ length: 15 }, (_, i) => i + 1).map((l) => (
                <option key={l} value={l}>
                  Lv {l}
                </option>
              ))}
            </select>
          </div>
          <ul className="skills">
            {char.skills.map((s) => (
              <li key={s.id}>
                <span className="skill-type">{s.type}</span>
                <span className="skill-name">{s.name}</span>
                {s.description ? <span className="skill-desc">{s.description}</span> : null}
                {s.scaling.length ? (
                  <table className="scaling">
                    <tbody>
                      {s.scaling.map((row, i) => (
                        <tr key={i}>
                          <td>{row.label}</td>
                          <td>{fmtScale(row, talentLevel)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>

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
    </div>
  );
}
