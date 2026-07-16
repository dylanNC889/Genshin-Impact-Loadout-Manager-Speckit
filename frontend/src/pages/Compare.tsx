import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { listLoadouts, type SavedLoadout } from "../api";
import { Card } from "../components/ui";
import { formatStat, statLabel } from "../format";

const ORDER = ["HP", "ATK", "DEF", "CRIT_RATE", "CRIT_DMG", "EM", "ER"];

const statOf = (lo: SavedLoadout | undefined, key: string) =>
  lo?.computedFinalStats.find((s) => s.key === key)?.value ?? 0;

/** Compare two saved loadouts' final stats side-by-side, with deltas (B − A). B2. */
export function ComparePage() {
  const [params, setParams] = useSearchParams();
  const loadoutsQ = useQuery({ queryKey: ["loadouts"], queryFn: listLoadouts });
  const loadouts = loadoutsQ.data ?? [];

  const a = params.get("a") ?? "";
  const b = params.get("b") ?? "";
  const setSide = (side: "a" | "b", id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set(side, id);
    else next.delete(side);
    setParams(next, { replace: true });
  };

  const loA = loadouts.find((l) => l.id === a);
  const loB = loadouts.find((l) => l.id === b);

  // Union of stat keys present in either build (ordered), plus any elemental/phys DMG bonuses.
  // Exclude keys already in ORDER — CRIT_DMG ends with "_DMG" too and must not be listed twice.
  const extraKeys = [...new Set([...(loA?.computedFinalStats ?? []), ...(loB?.computedFinalStats ?? [])].map((s) => s.key))]
    .filter((k) => k.endsWith("_DMG") && !ORDER.includes(k))
    .sort();
  const keys = [...ORDER, ...extraKeys];

  const picker = (side: "a" | "b", value: string) => (
    <select value={value} onChange={(e) => setSide(side, e.target.value)} aria-label={`Loadout ${side.toUpperCase()}`}>
      <option value="">— pick a saved loadout —</option>
      {loadouts.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="compare">
      <h1>Compare builds</h1>
      {loadouts.length < 2 ? (
        <p className="muted">Save at least two loadouts (on a character page) to compare them here.</p>
      ) : null}

      <div className="compare-pickers">
        {picker("a", a)}
        <span className="muted">vs</span>
        {picker("b", b)}
      </div>

      {loA && loB ? (
        <Card title="Final stats">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Stat</th>
                <th>{loA.name}</th>
                <th>{loB.name}</th>
                <th>Δ</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const va = statOf(loA, k);
                const vb = statOf(loB, k);
                const delta = vb - va;
                const cls = delta > 0.05 ? "up" : delta < -0.05 ? "down" : "";
                return (
                  <tr key={k}>
                    <td>{statLabel(k)}</td>
                    <td>{formatStat(k, va)}</td>
                    <td>{formatStat(k, vb)}</td>
                    <td className={`delta ${cls}`}>
                      {delta > 0.05 ? "+" : ""}
                      {Math.abs(delta) < 0.05 ? "—" : formatStat(k, delta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <p className="muted small">Pick two loadouts above to see the comparison.</p>
      )}
    </div>
  );
}
