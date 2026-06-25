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
import { Card, StatRow, ElementBadge, RarityStars } from "../components/ui";
import { LoadoutEditor } from "../components/LoadoutEditor";
import { formatStat, statLabel } from "../format";
import { useLoadoutStore } from "../state/loadoutStore";

const PRIMARY_ORDER = ["HP", "ATK", "DEF", "CRIT_RATE", "CRIT_DMG", "EM", "ER"];

export function CharacterPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const loadoutParam = searchParams.get("loadout");
  const [phase, setPhase] = useState(6);
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
    setWeapon(saved.weaponId ?? null);
    for (const a of saved.artifacts) {
      setArtifact(a.slot, { setId: a.setId, mainStat: a.mainStat, subStats: a.subStats });
    }
  }, [savedLoadoutQ.data, resetLoadout, setWeapon, setArtifact]);

  if (detail.isLoading) return <p className="muted">Loading character…</p>;
  if (detail.error) return <p className="error">Failed to load: {(detail.error as Error).message}</p>;
  if (!detail.data) return <p className="muted">Not found.</p>;

  const { character: char, curves } = detail.data;
  // Client-side recalculation — instant on ascension change (Principle IV / FR-003).
  const sheet = statRecord(computeBaseSheet(char, 90, phase, curves));
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
            <label htmlFor="phase">Ascension phase (Lv 90)</label>
            <input
              id="phase"
              type="range"
              min={0}
              max={6}
              value={phase}
              onChange={(e) => setPhase(Number(e.target.value))}
            />
            <span className="phase-badge">A{phase}</span>
          </div>
          {PRIMARY_ORDER.map((key) => (
            <StatRow key={key} label={statLabel(key)} value={formatStat(key, sheet[key] ?? 0)} />
          ))}
          {extras.map(([key, value]) => (
            <StatRow key={key} label={statLabel(key)} value={formatStat(key, value)} />
          ))}
        </Card>

        <Card title="Skills">
          <ul className="skills">
            {char.skills.map((s) => (
              <li key={s.id}>
                <span className="skill-type">{s.type}</span>
                <span className="skill-name">{s.name}</span>
                {s.description ? <span className="skill-desc">{s.description}</span> : null}
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
          ascensionPhase={phase}
          editingLoadoutId={loadoutParam}
        />
      ) : (
        <p className="muted">Loading gear options…</p>
      )}
    </div>
  );
}
