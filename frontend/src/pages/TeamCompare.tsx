import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { fetchCharacterDetail, fetchModifiers, listLoadouts, listTeams } from "../api";
import type { CharacterDetail, SavedLoadout, SavedTeam } from "../api";
import type { ConditionalBuff } from "@app/contracts";
import { Card } from "../components/ui";
import { CompareNav } from "../components/CompareNav";
import { computeTeamDamage } from "../teamDamage";

/** Shared assumptions so the two damage totals are comparable. */
const ASSUMPTIONS = { reaction: "none", transformative: "none", enemyLevel: 90, enemyRes: 10 } as const;

function teamDamageTotal(
  team: SavedTeam,
  details: CharacterDetail[],
  loadouts: SavedLoadout[],
  conditionalBuffs?: ConditionalBuff[],
): number {
  const entries = team.slots
    .map((s, i) => ({
      detail: details[i],
      loadout: s.loadoutId ? (loadouts.find((l) => l.id === s.loadoutId) ?? null) : null,
    }))
    .filter((e): e is { detail: CharacterDetail; loadout: SavedLoadout | null } => Boolean(e.detail));
  return computeTeamDamage(entries, { ...ASSUMPTIONS, conditionalBuffs }).damage?.totalEstimated ?? 0;
}

/** Compare two saved teams side-by-side: synergy + damage under shared assumptions (F). */
export function TeamComparePage() {
  const [params, setParams] = useSearchParams();
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: listTeams });
  const loadoutsQ = useQuery({ queryKey: ["loadouts"], queryFn: listLoadouts });
  const modifiersQ = useQuery({ queryKey: ["modifiers"], queryFn: fetchModifiers });
  const teams = (teamsQ.data ?? []).slice().sort((x, y) => x.name.localeCompare(y.name));
  const loadouts = loadoutsQ.data ?? [];

  const a = params.get("a") ?? "";
  const b = params.get("b") ?? "";
  const setSide = (side: "a" | "b", id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set(side, id);
    else next.delete(side);
    setParams(next, { replace: true });
  };
  const teamA = teams.find((t) => t.id === a);
  const teamB = teams.find((t) => t.id === b);

  const detailsA = useQuery({
    queryKey: ["team-cmp", a],
    queryFn: () => Promise.all((teamA?.slots ?? []).map((s) => fetchCharacterDetail(s.characterId))),
    enabled: Boolean(teamA),
  });
  const detailsB = useQuery({
    queryKey: ["team-cmp", b],
    queryFn: () => Promise.all((teamB?.slots ?? []).map((s) => fetchCharacterDetail(s.characterId))),
    enabled: Boolean(teamB),
  });

  const picker = (side: "a" | "b", value: string) => (
    <select value={value} onChange={(e) => setSide(side, e.target.value)} aria-label={`Team ${side.toUpperCase()}`}>
      <option value="">— pick a team —</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );

  const ready = teamA && teamB && detailsA.data && detailsB.data;
  const buffs = modifiersQ.data?.conditionalBuffs;
  const dmgA = ready ? teamDamageTotal(teamA, detailsA.data, loadouts, buffs) : 0;
  const dmgB = ready ? teamDamageTotal(teamB, detailsB.data, loadouts, buffs) : 0;

  const row = (label: string, x: React.ReactNode, y: React.ReactNode) => (
    <tr>
      <td>{label}</td>
      <td>{x}</td>
      <td>{y}</td>
    </tr>
  );
  const memberNames = (t: SavedTeam) => t.slots.map((s) => s.characterId).join(", ") || "—";

  return (
    <div className="compare">
      <h1>Compare teams</h1>
      <CompareNav />
      {teams.length < 2 ? (
        <p className="muted small">Save at least two teams on the Team page to compare them.</p>
      ) : null}
      <div className="compare-pickers">
        {picker("a", a)}
        <span className="muted">vs</span>
        {picker("b", b)}
      </div>

      {ready ? (
        <Card title="Comparison">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>{teamA.name}</th>
                <th>{teamB.name}</th>
              </tr>
            </thead>
            <tbody>
              {row("Members", memberNames(teamA), memberNames(teamB))}
              {row(
                "Synergy grade",
                `${teamA.synergy.rating.grade} (${teamA.synergy.rating.score})`,
                `${teamB.synergy.rating.grade} (${teamB.synergy.rating.score})`,
              )}
              {row(
                "Resonances",
                teamA.synergy.resonances.map((r) => r.name).join(", ") || "—",
                teamB.synergy.resonances.map((r) => r.name).join(", ") || "—",
              )}
              {row(
                "Possible reactions",
                teamA.synergy.possibleReactions.join(", ") || "—",
                teamB.synergy.possibleReactions.join(", ") || "—",
              )}
              {row(
                "Role gaps",
                teamA.synergy.roleCoverage.gaps.join(", ") || "none",
                teamB.synergy.roleCoverage.gaps.join(", ") || "none",
              )}
              <tr>
                <td>Est. damage</td>
                <td className={dmgA >= dmgB ? "cmp-win" : ""}>{Math.round(dmgA).toLocaleString()}</td>
                <td className={dmgB >= dmgA ? "cmp-win" : ""}>{Math.round(dmgB).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <p className="muted small stat-foot">
            Damage uses shared assumptions (Lv 90 enemy, 10% RES, no reaction; geared where a slot has a loadout)
            so the totals are comparable.
          </p>
        </Card>
      ) : (
        <p className="muted small">Pick two saved teams above to compare them.</p>
      )}
    </div>
  );
}
