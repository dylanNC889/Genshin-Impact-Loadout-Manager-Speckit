import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { assessSynergy, computeBaseStats, estimateTeamDamage } from "@app/stat-engine";
import type { DamageMember } from "@app/stat-engine";
import type { DamageEstimate, SynergyAssessment } from "@app/contracts";
import {
  createTeam,
  fetchCharacters,
  fetchCharacterDetail,
  getTeam,
  listLoadouts,
  updateTeam,
  type CharacterDetail,
  type SavedLoadout,
} from "../api";
import { Card } from "../components/ui";

interface Slot {
  characterId: string | null;
  loadoutId: string | null;
}

/** Damage inputs from a character's base stats (no gear). */
function deriveFromBase(detail: CharacterDetail): DamageMember {
  const base = computeBaseStats(detail.character, 90, 6, detail.curves);
  const dmgBonusPct = Object.entries(base.sheet)
    .filter(([k]) => k.endsWith("_DMG"))
    .reduce((sum, [, v]) => sum + v, 0);
  return {
    characterId: detail.character.id,
    finalATK: base.baseATK,
    critRate: base.sheet.CRIT_RATE,
    critDmg: base.sheet.CRIT_DMG,
    dmgBonusPct,
    talentMultiplier: 200,
    characterLevel: 90,
  };
}

/** Damage inputs from a saved loadout's geared final stats (FR-017). */
function deriveFromLoadout(lo: SavedLoadout): DamageMember {
  const get = (k: string) => lo.computedFinalStats.find((s) => s.key === k)?.value ?? 0;
  const dmgBonusPct = lo.computedFinalStats
    .filter((s) => s.key.endsWith("_DMG"))
    .reduce((sum, s) => sum + s.value, 0);
  return {
    characterId: lo.characterId,
    finalATK: get("ATK"),
    critRate: get("CRIT_RATE"),
    critDmg: get("CRIT_DMG"),
    dmgBonusPct,
    talentMultiplier: 200,
    characterLevel: 90,
  };
}

export function TeamBuilder() {
  const [slots, setSlots] = useState<Slot[]>([
    { characterId: null, loadoutId: null },
    { characterId: null, loadoutId: null },
    { characterId: null, loadoutId: null },
    { characterId: null, loadoutId: null },
  ]);
  const [damage, setDamage] = useState<DamageEstimate | null>(null);

  const [searchParams] = useSearchParams();
  const teamParam = searchParams.get("team");
  const editing = Boolean(teamParam);

  const rosterQ = useQuery({ queryKey: ["characters", "team"], queryFn: () => fetchCharacters({}) });
  const loadoutsQ = useQuery({ queryKey: ["loadouts"], queryFn: listLoadouts });
  const savedTeamQ = useQuery({
    queryKey: ["saved-team", teamParam],
    queryFn: () => getTeam(teamParam ?? ""),
    enabled: editing,
  });

  const selected = slots.filter((s): s is { characterId: string; loadoutId: string | null } => Boolean(s.characterId));
  const detailsQ = useQuery({
    queryKey: ["team-details", selected.map((s) => s.characterId)],
    queryFn: () => Promise.all(selected.map((s) => fetchCharacterDetail(s.characterId))),
    enabled: selected.length > 0,
  });

  const qc = useQueryClient();
  const [teamName, setTeamName] = useState("");
  const teamPayload = () => ({
    name: teamName.trim() || "My team",
    slots: selected.map((s) => ({ characterId: s.characterId, loadoutId: s.loadoutId })),
  });
  const onTeamSaved = () => qc.invalidateQueries({ queryKey: ["teams"] });
  const saveMut = useMutation({ mutationFn: () => createTeam(teamPayload()), onSuccess: onTeamSaved });
  const updateMut = useMutation({
    mutationFn: () => updateTeam(teamParam ?? "", teamPayload()),
    onSuccess: onTeamSaved,
  });

  // Damage is on-demand (FR-016): clear it whenever the team changes.
  useEffect(() => {
    setDamage(null);
  }, [slots]);

  // Hydrate from a saved team when opened via ?team=<id> (FR-019 reopen).
  useEffect(() => {
    const t = savedTeamQ.data;
    if (!t) return;
    setSlots([0, 1, 2, 3].map((i) => {
      const s = t.slots[i];
      return s ? { characterId: s.characterId, loadoutId: s.loadoutId ?? null } : { characterId: null, loadoutId: null };
    }));
    setTeamName(t.name);
  }, [savedTeamQ.data]);

  const roster = rosterQ.data ?? [];
  const savedLoadouts = loadoutsQ.data ?? [];
  const details = detailsQ.data ?? [];
  const members = details.map((d) => ({ element: d.character.element, roles: d.character.roles }));
  const synergy: SynergyAssessment = assessSynergy(members);
  const nameById = (id: string) => roster.find((c) => c.id === id)?.name ?? id;

  function setSlotCharacter(i: number, id: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { characterId: id || null, loadoutId: null } : s)));
  }
  function setSlotLoadout(i: number, loadoutId: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, loadoutId: loadoutId || null } : s)));
  }

  function onCalculate() {
    const dmg = selected.flatMap((s, i) => {
      const detail = details[i];
      if (!detail) return [];
      if (s.loadoutId) {
        const lo = savedLoadouts.find((l) => l.id === s.loadoutId);
        if (lo) return [deriveFromLoadout(lo)];
      }
      return [deriveFromBase(detail)];
    });
    if (dmg.length) setDamage(estimateTeamDamage(dmg));
  }

  return (
    <div className="team">
      <h1>Team Builder</h1>
      <p className="muted small">
        Pick up to 4 distinct characters and optionally a saved loadout per slot. Synergy updates live; damage is
        on-demand.
      </p>

      <div className="team-slots">
        {slots.map((slot, i) => {
          const taken = new Set(slots.filter((s, idx) => s.characterId && idx !== i).map((s) => s.characterId));
          const slotLoadouts = savedLoadouts.filter((l) => l.characterId === slot.characterId);
          return (
            <div className="team-slot col" key={i}>
              <div className="team-slot-row">
                <span className="slot-num">{i + 1}</span>
                <select
                  value={slot.characterId ?? ""}
                  onChange={(e) => setSlotCharacter(i, e.target.value)}
                  aria-label={`Team slot ${i + 1} character`}
                >
                  <option value="">— empty —</option>
                  {roster
                    .filter((c) => !taken.has(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.element})
                      </option>
                    ))}
                </select>
              </div>
              {slot.characterId ? (
                <div className="team-slot-row">
                  <select
                    value={slot.loadoutId ?? ""}
                    onChange={(e) => setSlotLoadout(i, e.target.value)}
                    aria-label={`Team slot ${i + 1} loadout`}
                    disabled={slotLoadouts.length === 0}
                  >
                    <option value="">— base stats —</option>
                    {slotLoadouts.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} (geared)
                      </option>
                    ))}
                  </select>
                  <Link className="slot-link" to={`/character/${slot.characterId}`}>
                    view
                  </Link>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="save-bar">
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Team name"
          aria-label="Team name"
        />
        {editing ? (
          <>
            <button
              className="calc-btn"
              onClick={() => updateMut.mutate()}
              disabled={selected.length === 0 || updateMut.isPending}
            >
              Update team
            </button>
            <button className="mini" onClick={() => saveMut.mutate()} disabled={selected.length === 0 || saveMut.isPending}>
              Save as new
            </button>
          </>
        ) : (
          <button
            className="calc-btn"
            onClick={() => saveMut.mutate()}
            disabled={selected.length === 0 || saveMut.isPending}
          >
            Save team
          </button>
        )}
        {saveMut.isSuccess ? <span className="saved-ok">Saved ✓</span> : null}
        {updateMut.isSuccess ? <span className="saved-ok">Updated ✓</span> : null}
      </div>

      <div className="synergy-grid">
        <Card title={`Synergy${synergy.complete ? "" : " (partial)"}`}>
          <div className={`rating-badge grade-${synergy.rating.grade}`}>
            Rating <strong>{synergy.rating.grade}</strong>
            <span className="muted small"> ({synergy.rating.score})</span>
          </div>
          <h4>Elemental Resonance</h4>
          {synergy.resonances.length ? (
            <ul className="chips">
              {synergy.resonances.map((r) => (
                <li key={r.name} className="chip good" title={r.description}>
                  {r.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">None active.</p>
          )}

          <h4>Possible Reactions</h4>
          {synergy.possibleReactions.length ? (
            <ul className="chips">
              {synergy.possibleReactions.map((r) => (
                <li key={r} className="chip">
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">None.</p>
          )}

          <h4>Role Coverage</h4>
          {synergy.roleCoverage.covered.length ? (
            <ul className="chips">
              {synergy.roleCoverage.covered.map((r) => (
                <li key={r} className="chip">
                  {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">No roles.</p>
          )}
          {synergy.roleCoverage.gaps.length ? (
            <div className="gaps">
              <strong>Gaps:</strong> {synergy.roleCoverage.gaps.join(", ")}
            </div>
          ) : null}

          {synergy.notes.length ? (
            <ul className="notes">
              {synergy.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card title="On-demand Damage Estimate">
          <button className="calc-btn" onClick={onCalculate} disabled={selected.length === 0}>
            ⚔️ Calculate
          </button>
          {damage ? (
            <div className="damage">
              <div className="damage-total">
                {Math.round(damage.totalEstimated).toLocaleString()}
                <span> est. total</span>
              </div>
              <ul className="per-char">
                {damage.perCharacter.map((p) => (
                  <li key={p.characterId}>
                    <span>{nameById(p.characterId)}</span>
                    <span>{Math.round(p.estimated).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
              <div className="assumptions">
                <strong>Assumptions:</strong> Lv {damage.assumptions.enemyLevel} enemy,{" "}
                {damage.assumptions.enemyResistancePct}% RES, rotation “{damage.assumptions.rotation}”. Slots with a
                saved loadout use geared stats; others use base stats.
              </div>
            </div>
          ) : (
            <p className="muted small">
              Click Calculate to estimate team damage (v1 generic rotation; geared where a loadout is assigned).
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
