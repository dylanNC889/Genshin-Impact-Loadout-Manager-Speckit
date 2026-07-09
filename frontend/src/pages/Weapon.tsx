import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { fetchWeapons, fetchCharacters } from "../api";
import { Card, Icon, RarityStars, StatRow } from "../components/ui";
import { formatStat, statLabel } from "../format";
import { recommendingCharacters } from "../recommendations";

export function WeaponPage() {
  const { id } = useParams<{ id: string }>();
  const weaponsQ = useQuery({ queryKey: ["weapons"], queryFn: () => fetchWeapons() });
  const rosterQ = useQuery({ queryKey: ["characters", "all"], queryFn: () => fetchCharacters({}) });

  const weapon = weaponsQ.data?.find((w) => w.id === id);
  const usedBy = id ? recommendingCharacters(id) : [];
  const byId = (cid: string) => rosterQ.data?.find((c) => c.id === cid);

  if (weaponsQ.isLoading) return <p className="muted">Loading weapon…</p>;
  if (!weapon) return <p className="muted">No weapon with id “{id}”.</p>;

  return (
    <div className="detail">
      <Link to="/weapons" className="back">
        ← Back to weapons
      </Link>
      <div className="char-header">
        <div className="char-header-top">
          <Icon src={weapon.icon} alt={weapon.name} size={72} />
          <h1>{weapon.name}</h1>
        </div>
        <div className="char-tags">
          <span className="badge muted-badge">{weapon.weaponType}</span>
          <RarityStars rarity={weapon.rarity} />
        </div>
      </div>

      <div className="char-body">
        <Card title="Stats (Lv 90)">
          <StatRow label="Base ATK" value={Math.round(weapon.baseATK)} />
          {weapon.secondaryStat ? (
            <StatRow
              label={statLabel(weapon.secondaryStat.key)}
              value={formatStat(weapon.secondaryStat.key, weapon.secondaryStat.value)}
            />
          ) : null}
        </Card>

        <Card title={`Recommended by (${usedBy.length})`}>
          {usedBy.length ? (
            <div className="used-by">
              {usedBy.map((cid) => {
                const c = byId(cid);
                return (
                  <Link key={cid} to={`/character/${cid}`} className="used-by-chip">
                    <Icon src={c?.icon} alt="" size={28} />
                    <span>{c?.name ?? cid}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="muted small">No characters recommend this weapon in our data.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
