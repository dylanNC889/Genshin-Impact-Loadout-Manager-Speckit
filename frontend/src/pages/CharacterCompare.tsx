import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { computeBaseSheet, statRecord } from "@app/stat-engine";
import type { CharacterDetail } from "../types";
import { fetchCharacters, fetchCharacterDetail, fetchWeapons, fetchArtifactSets } from "../api";
import { Card } from "../components/ui";
import { statLabel, formatStat } from "../format";
import { RECOMMENDATIONS } from "../data/recommendations";

/** Base HP/ATK/DEF at Lv 90 + the character's ascension stat. */
function baseStatsOf(detail: CharacterDetail | undefined) {
  if (!detail) return null;
  const sheet = statRecord(computeBaseSheet(detail.character, 90, 6, detail.curves));
  const asc = detail.character.ascensions[detail.character.ascensions.length - 1]?.ascensionStat;
  return { hp: sheet.HP ?? 0, atk: sheet.ATK ?? 0, def: sheet.DEF ?? 0, asc };
}

/** Compare two characters side-by-side (base stats, element, weapon, roles, top KQM picks). B8. */
export function CharacterComparePage() {
  const [params, setParams] = useSearchParams();
  const rosterQ = useQuery({ queryKey: ["characters", "all"], queryFn: () => fetchCharacters({}) });
  const weaponsQ = useQuery({ queryKey: ["weapons"], queryFn: () => fetchWeapons() });
  const setsQ = useQuery({ queryKey: ["artifact-sets"], queryFn: fetchArtifactSets });
  const roster = (rosterQ.data ?? []).slice().sort((x, y) => x.name.localeCompare(y.name));

  const a = params.get("a") ?? "";
  const b = params.get("b") ?? "";
  const setSide = (side: "a" | "b", id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set(side, id);
    else next.delete(side);
    setParams(next, { replace: true });
  };

  const detailA = useQuery({ queryKey: ["character", a], queryFn: () => fetchCharacterDetail(a), enabled: Boolean(a) });
  const detailB = useQuery({ queryKey: ["character", b], queryFn: () => fetchCharacterDetail(b), enabled: Boolean(b) });
  const cA = detailA.data?.character;
  const cB = detailB.data?.character;
  const sA = baseStatsOf(detailA.data);
  const sB = baseStatsOf(detailB.data);

  const weaponName = (id?: string) => weaponsQ.data?.find((w) => w.id === id)?.name ?? id ?? "—";
  const setName = (id?: string) => setsQ.data?.find((s) => s.id === id)?.name ?? id ?? "—";
  const topWeapon = (id: string) => weaponName(RECOMMENDATIONS[id]?.weapons[0]);
  const topSet = (id: string) => setName(RECOMMENDATIONS[id]?.sets[0]);

  const picker = (side: "a" | "b", value: string) => (
    <select value={value} onChange={(e) => setSide(side, e.target.value)} aria-label={`Character ${side.toUpperCase()}`}>
      <option value="">— pick a character —</option>
      {roster.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );

  const numRow = (label: string, x: number, y: number) => {
    const d = y - x;
    return (
      <tr>
        <td>{label}</td>
        <td>{Math.round(x).toLocaleString()}</td>
        <td>{Math.round(y).toLocaleString()}</td>
        <td className={`delta ${d > 0.5 ? "up" : d < -0.5 ? "down" : ""}`}>
          {d > 0.5 ? "+" : ""}
          {Math.round(d) || "—"}
        </td>
      </tr>
    );
  };
  const textRow = (label: string, x: string, y: string) => (
    <tr>
      <td>{label}</td>
      <td>{x}</td>
      <td>{y}</td>
      <td>—</td>
    </tr>
  );

  return (
    <div className="compare">
      <h1>Compare characters</h1>
      <div className="compare-pickers">
        {picker("a", a)}
        <span className="muted">vs</span>
        {picker("b", b)}
      </div>

      {cA && cB && sA && sB ? (
        <Card title="Comparison">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Stat</th>
                <th>{cA.name}</th>
                <th>{cB.name}</th>
                <th>Δ</th>
              </tr>
            </thead>
            <tbody>
              {textRow("Rarity", `${cA.rarity}★`, `${cB.rarity}★`)}
              {textRow("Element", cA.element, cB.element)}
              {textRow("Weapon", cA.weaponType, cB.weaponType)}
              {textRow("Region", cA.region || "—", cB.region || "—")}
              {textRow("Roles", cA.roles.join(", ") || "—", cB.roles.join(", ") || "—")}
              {numRow("Base HP (Lv 90)", sA.hp, sB.hp)}
              {numRow("Base ATK (Lv 90)", sA.atk, sB.atk)}
              {numRow("Base DEF (Lv 90)", sA.def, sB.def)}
              {textRow(
                "Ascension stat",
                sA.asc ? `${statLabel(sA.asc.key)} ${formatStat(sA.asc.key, sA.asc.value)}` : "—",
                sB.asc ? `${statLabel(sB.asc.key)} ${formatStat(sB.asc.key, sB.asc.value)}` : "—",
              )}
              {textRow("Top weapon (KQM)", topWeapon(cA.id), topWeapon(cB.id))}
              {textRow("Top set (KQM)", topSet(cA.id), topSet(cB.id))}
            </tbody>
          </table>
        </Card>
      ) : (
        <p className="muted small">Pick two characters above to compare them.</p>
      )}
    </div>
  );
}
