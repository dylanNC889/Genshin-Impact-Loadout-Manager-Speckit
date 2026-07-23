import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchCharacters, fetchWeapons } from "../api";
import { Icon, RarityStars } from "../components/ui";
import { versionDateLabel, versionDateFull } from "../data/versionDates";

/** Numeric ordering for a "major.minor" version string ("4.10" > "4.2"). */
const versionNum = (v: string) => {
  const [maj, min] = v.split(".").map(Number);
  return (maj || 0) * 1000 + (min || 0);
};

/** Release timeline: characters + 5★ weapons grouped by debut version, newest first (D3). */
export function TimelinePage() {
  const charsQ = useQuery({ queryKey: ["characters", "all"], queryFn: () => fetchCharacters({}) });
  const weaponsQ = useQuery({ queryKey: ["weapons"], queryFn: () => fetchWeapons() });

  const chars = (charsQ.data ?? []).filter((c) => c.version);
  const weapons = (weaponsQ.data ?? []).filter((w) => w.rarity === 5 && w.version);
  const versions = [...new Set([...chars.map((c) => c.version), ...weapons.map((w) => w.version)])].sort(
    (a, b) => versionNum(b) - versionNum(a),
  );

  if (charsQ.isLoading || weaponsQ.isLoading) return <p className="muted">Loading timeline…</p>;

  return (
    <div className="timeline">
      <h1>Release timeline</h1>
      <p className="muted small">
        Characters and 5★ weapons by debut version and release date, newest first.
      </p>

      {versions.map((v) => {
        const vChars = chars
          .filter((c) => c.version === v)
          .sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
        const vWeapons = weapons.filter((w) => w.version === v).sort((a, b) => a.name.localeCompare(b.name));
        const dateLabel = versionDateLabel(v);
        return (
          <section key={v} className="tl-version">
            <div className="tl-badge" title={versionDateFull(v)}>
              <span className="tl-ver">v{v}</span>
              {dateLabel ? <span className="tl-date">{dateLabel}</span> : null}
            </div>
            <div className="tl-body">
              {vChars.length ? (
                <div className="tl-row">
                  {vChars.map((c) => (
                    <Link key={c.id} to={`/character/${c.id}`} className={`tl-chip rarity-${c.rarity}`}>
                      <Icon src={c.icon} alt="" size={30} />
                      <span>{c.name}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
              {vWeapons.length ? (
                <div className="tl-row tl-weapons">
                  {vWeapons.map((w) => (
                    <Link key={w.id} to={`/weapon/${w.id}`} className="tl-chip weapon">
                      <Icon src={w.icon} alt="" size={26} />
                      <span>{w.name}</span>
                      <RarityStars rarity={w.rarity} />
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
