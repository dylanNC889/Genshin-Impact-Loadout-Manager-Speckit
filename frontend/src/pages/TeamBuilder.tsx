import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams, useHref } from "react-router-dom";
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
import { Card, Icon } from "../components/ui";
import { encodeShare, decodeShare } from "../share";
import { teamBuffFor, teamResShred, activeBuffNotes } from "../teamBuffs";
import { getOwned } from "../ownership";

interface Slot {
  characterId: string | null;
  loadoutId: string | null;
}

/** An illustrative rotation (A4): the strongest %-DMG instance of each combat talent, at Lv10. */
function rotationInstances(character: CharacterDetail["character"]): { label: string; multiplier: number }[] {
  const LABELS: Record<string, string> = {
    NormalAttack: "Normal Attack",
    ElementalSkill: "Elemental Skill",
    ElementalBurst: "Elemental Burst",
  };
  const valueAt = (row: { valuesByLevel: number[] }) =>
    row.valuesByLevel[9] ?? row.valuesByLevel[row.valuesByLevel.length - 1] ?? 0;
  const out: { label: string; multiplier: number }[] = [];
  for (const s of character.skills) {
    const dmgRows = s.scaling.filter((r) => r.percent && /DMG/i.test(r.label));
    if (!dmgRows.length) continue;
    const best = dmgRows.reduce((a, b) => (valueAt(b) > valueAt(a) ? b : a));
    out.push({ label: LABELS[s.type] ?? s.name, multiplier: valueAt(best) });
  }
  return out.length ? out : [{ label: "Rotation", multiplier: 200 }];
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
    em: base.sheet.EM ?? 0,
    talentMultiplier: 200,
    instances: rotationInstances(detail.character),
    characterLevel: 90,
  };
}

/** Damage inputs from a saved loadout's geared final stats (FR-017). */
function deriveFromLoadout(lo: SavedLoadout, character: CharacterDetail["character"]): DamageMember {
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
    em: get("EM"),
    talentMultiplier: 200,
    instances: rotationInstances(character),
    characterLevel: 90,
  };
}

/** Amplifying-reaction presets applied to every member as a rough estimate assumption. */
const REACTIONS: Record<string, { label: string; mult: number; type?: string }> = {
  none: { label: "No reaction", mult: 1 },
  "vaporize-2": { label: "Vaporize (2×)", mult: 2, type: "Vaporize" },
  "vaporize-1.5": { label: "Vaporize (1.5×)", mult: 1.5, type: "Vaporize" },
  "melt-2": { label: "Melt (2×)", mult: 2, type: "Melt" },
  "melt-1.5": { label: "Melt (1.5×)", mult: 1.5, type: "Melt" },
};

/** Extra reactions (A6): transformative = separate flat DMG; Aggravate/Spread add to the hit.
 *  Keys match the engine's coefficient tables. */
const TRANSFORMATIVE = [
  "none",
  "Overloaded",
  "Electro-Charged",
  "Superconduct",
  "Swirl",
  "Shattered",
  "Bloom",
  "Hyperbloom",
  "Burgeon",
  "Burning",
  "Aggravate",
  "Spread",
] as const;

export function TeamBuilder() {
  const [slots, setSlots] = useState<Slot[]>([
    { characterId: null, loadoutId: null },
    { characterId: null, loadoutId: null },
    { characterId: null, loadoutId: null },
    { characterId: null, loadoutId: null },
  ]);
  const [damage, setDamage] = useState<DamageEstimate | null>(null);
  const [pickerQ, setPickerQ] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const owned = getOwned("characters");
  // Configurable damage-estimate assumptions (B2).
  const [enemyLevel, setEnemyLevel] = useState(90);
  const [enemyRes, setEnemyRes] = useState(10);
  const [reaction, setReaction] = useState("none");
  const [transformative, setTransformative] = useState<string>("none");

  const [searchParams] = useSearchParams();
  const teamParam = searchParams.get("team");
  const shareParam = searchParams.get("t");
  const editing = Boolean(teamParam);
  const [copied, setCopied] = useState(false);

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

  // Shareable team link (B3).
  const shareCode = encodeShare(teamPayload());
  const shareHref = useHref({ pathname: "/team", search: `t=${shareCode}` });
  function copyLink() {
    void navigator.clipboard?.writeText(window.location.origin + shareHref);
    setCopied(true);
  }

  // Damage is on-demand (FR-016): clear it whenever the team or assumptions change.
  useEffect(() => {
    setDamage(null);
  }, [slots, enemyLevel, enemyRes, reaction, transformative]);

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

  // Hydrate from a shared team link (?t=<code>, B3) — no backend needed.
  useEffect(() => {
    if (!shareParam) return;
    const t = decodeShare<{ name?: string; slots?: { characterId: string; loadoutId: string | null }[] }>(shareParam);
    if (!t) return;
    setSlots([0, 1, 2, 3].map((i) => {
      const s = t.slots?.[i];
      return s ? { characterId: s.characterId, loadoutId: s.loadoutId ?? null } : { characterId: null, loadoutId: null };
    }));
    if (t.name) setTeamName(t.name);
  }, [shareParam]);

  const roster = rosterQ.data ?? [];
  const savedLoadouts = loadoutsQ.data ?? [];
  const details = detailsQ.data ?? [];
  const members = details.map((d) => ({ element: d.character.element, roles: d.character.roles }));
  const synergy: SynergyAssessment = assessSynergy(members);
  const nameById = (id: string) => roster.find((c) => c.id === id)?.name ?? id;
  // Full character records (with splash art) for the selected slots, keyed by id.
  const detailByCharId = new Map(details.map((d) => [d.character.id, d.character]));

  const teamIds = new Set(slots.filter((s) => s.characterId).map((s) => s.characterId));
  const teamFull = teamIds.size >= 4;
  const pickerNeedle = pickerQ.trim().toLowerCase();
  const savedCharIds = new Set(savedLoadouts.map((l) => l.characterId));
  const pickerRoster = roster
    .filter((c) => (ownedOnly ? owned.has(c.id) : true))
    .filter((c) => (savedOnly ? savedCharIds.has(c.id) : true))
    .filter((c) => (pickerNeedle ? c.name.toLowerCase().includes(pickerNeedle) || c.id.includes(pickerNeedle) : true));

  // Click a roster character: add to the first empty slot, or remove it if already picked
  // (keeps the distinct-character rule — a character can occupy at most one slot).
  function toggleCharacter(id: string) {
    setSlots((prev) => {
      const existing = prev.findIndex((s) => s.characterId === id);
      if (existing >= 0) {
        return prev.map((s, idx) => (idx === existing ? { characterId: null, loadoutId: null } : s));
      }
      const empty = prev.findIndex((s) => !s.characterId);
      if (empty < 0) return prev; // team already full
      return prev.map((s, idx) => (idx === empty ? { characterId: id, loadoutId: null } : s));
    });
  }
  function removeSlot(i: number) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { characterId: null, loadoutId: null } : s)));
  }
  function setSlotLoadout(i: number, loadoutId: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, loadoutId: loadoutId || null } : s)));
  }

  function onCalculate() {
    const r = REACTIONS[reaction] ?? { mult: 1, type: undefined };
    const teamCharIds = selected.map((s) => s.characterId);
    const shred = teamResShred(teamCharIds);
    const dmg = selected
      .flatMap((s, i) => {
        const detail = details[i];
        if (!detail) return [];
        if (s.loadoutId) {
          const lo = savedLoadouts.find((l) => l.id === s.loadoutId);
          if (lo) return [deriveFromLoadout(lo, detail.character)];
        }
        return [deriveFromBase(detail)];
      })
      // Fold in team-wide buffs from the assembled team (A2), then the reaction.
      .map((m) => {
        const buff = teamBuffFor(detailByCharId.get(m.characterId)?.element, teamCharIds);
        return {
          ...m,
          finalATK: m.finalATK + buff.flatATK,
          dmgBonusPct: m.dmgBonusPct + buff.dmgBonusPct,
          critRate: m.critRate + buff.critRate,
          critDmg: m.critDmg + buff.critDmg,
          reactionMultiplier: r.mult,
          reactionType: r.type,
        };
      });
    // Transformative reaction (A6): a separate flat-DMG line, credited to the highest-EM member
    // (the likely trigger). Applied once, not per member, to avoid multiplying by team size.
    if (transformative !== "none" && dmg.length) {
      let bestIdx = 0;
      let bestEm = -1;
      dmg.forEach((m, i) => {
        const em = m.em ?? 0;
        if (em > bestEm) {
          bestEm = em;
          bestIdx = i;
        }
      });
      const bm = dmg[bestIdx];
      if (bm) dmg[bestIdx] = { ...bm, transformative };
    }
    if (dmg.length) setDamage(estimateTeamDamage(dmg, { enemyLevel, enemyResistancePct: enemyRes - shred }));
  }

  return (
    <div className="team">
      <h1>Team Builder</h1>
      <p className="muted small">
        Pick up to 4 distinct characters and optionally a saved loadout per slot. Synergy updates live; damage is
        on-demand.
      </p>

      <div className="team-builder">
        <div className="team-picker">
          <input
            className="search"
            placeholder="Search characters…"
            value={pickerQ}
            onChange={(e) => setPickerQ(e.target.value)}
            aria-label="Search characters to add"
          />
          <label className="saved-only-toggle">
            <input
              type="checkbox"
              checked={savedOnly}
              onChange={(e) => setSavedOnly(e.target.checked)}
              aria-label="Only characters with a saved build"
            />
            Only with a saved build ({savedCharIds.size})
          </label>
          <label className="saved-only-toggle">
            <input
              type="checkbox"
              checked={ownedOnly}
              onChange={(e) => setOwnedOnly(e.target.checked)}
              aria-label="Owned characters only"
            />
            Owned only ({owned.size})
          </label>
          <div className="picker-grid">
            {pickerRoster.map((c) => {
              const inTeam = teamIds.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`picker-cell${inTeam ? " selected" : ""}`}
                  onClick={() => toggleCharacter(c.id)}
                  disabled={!inTeam && teamFull}
                  aria-pressed={inTeam}
                  title={inTeam ? `Remove ${c.name}` : `Add ${c.name}`}
                >
                  <Icon src={c.icon} alt={c.name} size={52} />
                  <span className="picker-name">{c.name}</span>
                </button>
              );
            })}
            {pickerRoster.length === 0 ? <p className="muted small">No characters match.</p> : null}
          </div>
        </div>

        <div className="team-portraits">
          {slots.map((slot, i) => {
            const summary = roster.find((c) => c.id === slot.characterId);
            const char = slot.characterId ? detailByCharId.get(slot.characterId) : undefined;
            const slotLoadouts = savedLoadouts.filter((l) => l.characterId === slot.characterId);
            return (
              <div className={`portrait-slot${slot.characterId ? " filled" : ""}`} key={i}>
                {slot.characterId ? (
                  <>
                    <button
                      type="button"
                      className="portrait-remove"
                      onClick={() => removeSlot(i)}
                      aria-label={`Remove ${summary?.name ?? "character"} from team`}
                    >
                      ×
                    </button>
                    {char?.splashArt ? (
                      <img className="portrait-img" src={char.splashArt} alt={summary?.name ?? ""} loading="lazy" />
                    ) : (
                      <div className="portrait-fallback">
                        <Icon src={summary?.icon} alt={summary?.name ?? ""} size={72} />
                      </div>
                    )}
                    <div className="portrait-foot">
                      <div className="portrait-name">{summary?.name}</div>
                      <select
                        value={slot.loadoutId ?? ""}
                        onChange={(e) => setSlotLoadout(i, e.target.value)}
                        aria-label={`${summary?.name ?? `Slot ${i + 1}`} loadout`}
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
                  </>
                ) : (
                  <div className="portrait-empty">
                    <span className="slot-num">{i + 1}</span>
                    <span className="muted small">Empty</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
        <button
          type="button"
          className="mini"
          onClick={copyLink}
          disabled={selected.length === 0}
          title="Copy a shareable link to this team"
        >
          🔗 Copy link
        </button>
        {saveMut.isSuccess ? <span className="saved-ok">Saved ✓</span> : null}
        {updateMut.isSuccess ? <span className="saved-ok">Updated ✓</span> : null}
        {copied ? <span className="saved-ok">Link copied ✓</span> : null}
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
          <div className="dmg-opts">
            <label>
              Enemy Lv
              <input
                type="number"
                min={1}
                max={110}
                value={enemyLevel}
                onChange={(e) => setEnemyLevel(Number(e.target.value))}
                aria-label="Enemy level"
              />
            </label>
            <label>
              RES %
              <input
                type="number"
                min={-100}
                max={90}
                value={enemyRes}
                onChange={(e) => setEnemyRes(Number(e.target.value))}
                aria-label="Enemy resistance percent"
              />
            </label>
            <label>
              Reaction
              <select value={reaction} onChange={(e) => setReaction(e.target.value)} aria-label="Reaction">
                {Object.entries(REACTIONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Extra reaction
              <select
                value={transformative}
                onChange={(e) => setTransformative(e.target.value)}
                aria-label="Extra reaction"
              >
                {TRANSFORMATIVE.map((t) => (
                  <option key={t} value={t}>
                    {t === "none" ? "None" : t}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
                    <details className="dmg-detail">
                      <summary>
                        <span>{nameById(p.characterId)}</span>
                        <span>{Math.round(p.estimated).toLocaleString()}</span>
                      </summary>
                      <ul className="instances">
                        {p.instances.map((ins, i) => (
                          <li key={i}>
                            <span>{ins.label}</span>
                            <span>{Math.round(ins.estimated).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
              <div className="assumptions">
                <strong>Assumptions:</strong> Lv {damage.assumptions.enemyLevel} enemy,{" "}
                {damage.assumptions.enemyResistancePct}% RES (after shred)
                {damage.assumptions.reactionTypes.length ? `, ${damage.assumptions.reactionTypes.join("/")}` : ""},
                rotation “{damage.assumptions.rotation}”. Slots with a saved loadout use geared stats; others use base
                stats.
                {activeBuffNotes(selected.map((s) => s.characterId)).length ? (
                  <div className="team-buffs">
                    <strong>Team buffs (approx):</strong>
                    <ul>
                      {activeBuffNotes(selected.map((s) => s.characterId)).map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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
