import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { OwnedArtifact } from "@app/optimizer";
import { fetchArtifactSets } from "../api";
import { Card } from "../components/ui";
import { CardGridSkeleton } from "../components/Skeleton";
import { loadInventory } from "../inventory";
import { formatStat, statLabel } from "../format";

const SLOTS = ["Flower", "Plume", "Sands", "Goblet", "Circlet"];

/** Crit Value: 2 × CRIT Rate% + CRIT DMG% across the substats. */
function cvOf(a: OwnedArtifact): number {
  let cv = 0;
  for (const s of a.subStats) {
    if (s.key === "CRIT_RATE") cv += s.value * 2;
    else if (s.key === "CRIT_DMG") cv += s.value;
  }
  return Math.round(cv * 10) / 10;
}

function grade(cv: number): { label: string; cls: string } {
  if (cv >= 50) return { label: "S", cls: "g-s" };
  if (cv >= 40) return { label: "A", cls: "g-a" };
  if (cv >= 30) return { label: "B", cls: "g-b" };
  if (cv >= 20) return { label: "C", cls: "g-c" };
  if (cv >= 10) return { label: "D", cls: "g-d" };
  return { label: "—", cls: "g-e" };
}

/** Artifact inventory + Crit-Value grading (H). Reads the persisted GOOD import. */
export function InventoryPage() {
  const [inventory] = useState<OwnedArtifact[]>(() => loadInventory());
  const setsQ = useQuery({ queryKey: ["artifact-sets"], queryFn: fetchArtifactSets });
  const setName = (id: string) => setsQ.data?.find((s) => s.id === id)?.name ?? id;

  const [setFilter, setSetFilter] = useState("");
  const [slotFilter, setSlotFilter] = useState("");
  const [mainFilter, setMainFilter] = useState("");

  const rows = useMemo(() => inventory.map((a) => ({ a, cv: cvOf(a) })).sort((x, y) => y.cv - x.cv), [inventory]);
  const setIds = [...new Set(inventory.map((a) => a.setId))].sort((a, b) => setName(a).localeCompare(setName(b)));
  const mainStats = [...new Set(inventory.map((a) => a.mainStat.key))].sort();

  const filtered = rows.filter(
    ({ a }) =>
      (!setFilter || a.setId === setFilter) &&
      (!slotFilter || a.slot === slotFilter) &&
      (!mainFilter || a.mainStat.key === mainFilter),
  );
  const avgCV = filtered.length ? filtered.reduce((s, r) => s + r.cv, 0) / filtered.length : 0;

  if (setsQ.isLoading && !inventory.length) return <CardGridSkeleton count={8} />;

  if (!inventory.length) {
    return (
      <div className="inventory">
        <h1>Artifact inventory</h1>
        <p className="muted">
          No inventory yet. Import a GOOD file on the <Link to="/optimize">Optimize</Link> page — it's saved here
          automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="inventory">
      <h1>Artifact inventory</h1>
      <p className="muted small">
        {inventory.length} artifacts · Crit Value = 2 × CRIT Rate + CRIT DMG. Import/refresh on the{" "}
        <Link to="/optimize">Optimize</Link> page.
      </p>

      <div className="filters">
        <select value={setFilter} onChange={(e) => setSetFilter(e.target.value)} aria-label="Filter by set">
          <option value="">All sets</option>
          {setIds.map((id) => (
            <option key={id} value={id}>
              {setName(id)}
            </option>
          ))}
        </select>
        <select value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)} aria-label="Filter by slot">
          <option value="">All slots</option>
          {SLOTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={mainFilter} onChange={(e) => setMainFilter(e.target.value)} aria-label="Filter by main stat">
          <option value="">All main stats</option>
          {mainStats.map((m) => (
            <option key={m} value={m}>
              {statLabel(m)}
            </option>
          ))}
        </select>
        <span className="muted small">
          {filtered.length} shown · avg CV {avgCV.toFixed(1)}
        </span>
      </div>

      <div className="grid wide">
        {filtered.map(({ a, cv }) => {
          const g = grade(cv);
          return (
            <Card key={a.id} title={setName(a.setId)}>
              <div className="inv-head">
                <span className="muted small">
                  {a.slot} · {statLabel(a.mainStat.key)}
                </span>
                <span className={`cv-badge ${g.cls}`} title={`Crit Value ${cv}`}>
                  {g.label} · {cv} CV
                </span>
              </div>
              <ul className="inv-subs">
                {a.subStats.map((s, i) => (
                  <li key={i} className={s.key === "CRIT_RATE" || s.key === "CRIT_DMG" ? "crit" : ""}>
                    <span>{statLabel(s.key)}</span>
                    <span>{formatStat(s.key, s.value)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 ? <p className="muted">No artifacts match those filters.</p> : null}
    </div>
  );
}
