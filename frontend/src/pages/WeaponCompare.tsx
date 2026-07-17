import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import type { Weapon } from "@app/contracts";
import { fetchWeapons } from "../api";
import { Card } from "../components/ui";
import { formatStat, statLabel } from "../format";
import { renderEffect } from "../components/renderEffect";

/** Compare two weapons side-by-side (base ATK, secondary, passive at a chosen refinement). B5. */
export function WeaponComparePage() {
  const [params, setParams] = useSearchParams();
  const weaponsQ = useQuery({ queryKey: ["weapons"], queryFn: () => fetchWeapons() });
  const weapons = (weaponsQ.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const [refinement, setRefinement] = useState(1);

  const a = params.get("a") ?? "";
  const b = params.get("b") ?? "";
  const setSide = (side: "a" | "b", id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set(side, id);
    else next.delete(side);
    setParams(next, { replace: true });
  };

  const wA = weapons.find((w) => w.id === a);
  const wB = weapons.find((w) => w.id === b);

  const picker = (side: "a" | "b", value: string) => (
    <select value={value} onChange={(e) => setSide(side, e.target.value)} aria-label={`Weapon ${side.toUpperCase()}`}>
      <option value="">— pick a weapon —</option>
      {weapons.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </select>
  );

  const secText = (w: Weapon) => (w.secondaryStat ? `${statLabel(w.secondaryStat.key)} ${formatStat(w.secondaryStat.key, w.secondaryStat.value)}` : "—");
  const secDelta = () => {
    if (wA?.secondaryStat && wB?.secondaryStat && wA.secondaryStat.key === wB.secondaryStat.key) {
      const d = wB.secondaryStat.value - wA.secondaryStat.value;
      return { text: (d > 0 ? "+" : "") + formatStat(wB.secondaryStat.key, d), cls: d > 0.05 ? "up" : d < -0.05 ? "down" : "" };
    }
    return { text: "—", cls: "" };
  };

  const passiveCol = (w: Weapon) => (
    <div>
      <strong>{w.passive?.name ?? "—"}</strong>
      {w.passive ? (
        <p className="passive-text">
          {renderEffect(w.passive.template, w.passive.refinements[refinement - 1] ?? w.passive.refinements[0] ?? [])}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="compare">
      <h1>Compare weapons</h1>
      <div className="compare-pickers">
        {picker("a", a)}
        <span className="muted">vs</span>
        {picker("b", b)}
        <label className="refine-inline">
          Refinement
          <select value={refinement} onChange={(e) => setRefinement(Number(e.target.value))} aria-label="Refinement">
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                R{r}
              </option>
            ))}
          </select>
        </label>
      </div>

      {wA && wB ? (
        <>
          <Card title="Stats (Lv 90)">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Stat</th>
                  <th>{wA.name}</th>
                  <th>{wB.name}</th>
                  <th>Δ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base ATK</td>
                  <td>{Math.round(wA.baseATK)}</td>
                  <td>{Math.round(wB.baseATK)}</td>
                  <td className={`delta ${wB.baseATK - wA.baseATK > 0 ? "up" : wB.baseATK - wA.baseATK < 0 ? "down" : ""}`}>
                    {wB.baseATK - wA.baseATK > 0 ? "+" : ""}
                    {Math.round(wB.baseATK - wA.baseATK) || "—"}
                  </td>
                </tr>
                <tr>
                  <td>Secondary</td>
                  <td>{secText(wA)}</td>
                  <td>{secText(wB)}</td>
                  <td className={`delta ${secDelta().cls}`}>{secDelta().text}</td>
                </tr>
                <tr>
                  <td>Rarity</td>
                  <td>{wA.rarity}★</td>
                  <td>{wB.rarity}★</td>
                  <td>—</td>
                </tr>
                <tr>
                  <td>Type</td>
                  <td>{wA.weaponType}</td>
                  <td>{wB.weaponType}</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </Card>

          <Card title={`Passives (R${refinement})`}>
            <div className="passive-compare">
              {passiveCol(wA)}
              {passiveCol(wB)}
            </div>
          </Card>
        </>
      ) : (
        <p className="muted small">Pick two weapons above to compare them.</p>
      )}
    </div>
  );
}
