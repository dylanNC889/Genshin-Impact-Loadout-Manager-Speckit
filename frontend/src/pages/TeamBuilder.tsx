import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams, useHref } from "react-router-dom";
import { assessSynergy, computeBaseStats } from "@app/stat-engine";
import type { DamageEstimate, Element, SynergyAssessment } from "@app/contracts";
import { createTeam, fetchCharacters, fetchCharacterDetail, getTeam, listLoadouts, updateTeam } from "../api";
import { Card, Icon } from "../components/ui";
import { encodeShare, decodeShare } from "../share";
import { activeBuffNotes } from "../teamBuffs";
import { REACTIONS, computeTeamDamage } from "../teamDamage";
import { getOwned } from "../ownership";
import { ER_REQUIREMENTS } from "../data/erRequirements";
import { TEAM_TEMPLATES, resolveTemplate, type TeamTemplate } from "../data/teamTemplates";

interface Slot {
  characterId: string | null;
  loadoutId: string | null;
}

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

/** Enemy presets (A8): level + RES, optionally per-element. Index 0 = Custom (uses the inputs). */
const ENEMY_PRESETS: { name: string; level: number | null; res: number | null; byElement?: Record<string, number> }[] = [
  { name: "Custom", level: null, res: null },
  { name: "Standard — Lv 90, 10% RES", level: 90, res: 10 },
  { name: "Abyss — Lv 100, 10% RES", level: 100, res: 10 },
  { name: "No resistance — 0%", level: 90, res: 0 },
  { name: "Pyro-resistant — +50% Pyro", level: 90, res: 10, byElement: { Pyro: 50 } },
  { name: "Hydro-resistant — +50% Hydro", level: 90, res: 10, byElement: { Hydro: 50 } },
  { name: "Electro-resistant — +50% Electro", level: 90, res: 10, byElement: { Electro: 50 } },
  { name: "Cryo-resistant — +50% Cryo", level: 90, res: 10, byElement: { Cryo: 50 } },
];

/** Pick the most representative reaction from a team's possible reactions (A9): amplifying first
 *  (biggest impact), else the first damaging transformative/catalyze. */
function autoPickReaction(possible: string[]): { reaction: string; transformative: string; label: string } {
  if (possible.includes("Vaporize")) return { reaction: "vaporize-1.5", transformative: "none", label: "Vaporize" };
  if (possible.includes("Melt")) return { reaction: "melt-1.5", transformative: "none", label: "Melt" };
  const TRANS: Record<string, string> = {
    Quicken: "Aggravate",
    Overloaded: "Overloaded",
    "Electro-Charged": "Electro-Charged",
    Superconduct: "Superconduct",
    Bloom: "Bloom",
    Burning: "Burning",
    Swirl: "Swirl",
  };
  for (const r of possible) if (TRANS[r]) return { reaction: "none", transformative: TRANS[r], label: TRANS[r] };
  return { reaction: "none", transformative: "none", label: "none" };
}

export function TeamBuilder() {
  const [slots, setSlots] = useState<Slot[]>([
    { characterId: null, loadoutId: null },
    { characterId: null, loadoutId: null },
    { characterId: null, loadoutId: null },
    { characterId: null, loadoutId: null },
  ]);
  const [pickerQ, setPickerQ] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const owned = getOwned("characters");
  // Configurable damage-estimate assumptions (B2).
  const [enemyLevel, setEnemyLevel] = useState(90);
  const [enemyRes, setEnemyRes] = useState(10);
  const [reaction, setReaction] = useState("none");
  const [transformative, setTransformative] = useState<string>("none");
  const [autoReact, setAutoReact] = useState(false);
  const [enemyPreset, setEnemyPreset] = useState(0);

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

  // ER requirement check (A10): each member's ER% (geared or base) vs its curated solo target.
  const energyRows = selected
    .map((s, i) => {
      const detail = details[i];
      if (!detail) return null;
      const req = ER_REQUIREMENTS[detail.character.id];
      if (!req) return null;
      const lo = s.loadoutId ? savedLoadouts.find((l) => l.id === s.loadoutId) : undefined;
      const er = lo
        ? (lo.computedFinalStats.find((x) => x.key === "ER")?.value ?? 100)
        : (computeBaseStats(detail.character, 90, 6, detail.curves).sheet.ER ?? 100);
      return { name: detail.character.name, er: Math.round(er), req, short: er < req };
    })
    .filter((r): r is { name: string; er: number; req: number; short: boolean } => r !== null);

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
  // Populate the 4 slots from a meta template, preferring owned exemplars (E).
  function applyTemplate(t: TeamTemplate) {
    const ids = resolveTemplate(t, owned);
    setSlots([0, 1, 2, 3].map((i) => ({ characterId: ids[i] ?? null, loadoutId: null })));
  }
  function setSlotLoadout(i: number, loadoutId: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, loadoutId: loadoutId || null } : s)));
  }

  // Damage updates live from the team, gear and assumptions — no button to press (#4 UX).
  const { damage, autoChoice, resReadout } = useMemo<{
    damage: DamageEstimate | null;
    autoChoice: string | null;
    resReadout: { element: Element; res: number }[];
  }>(() => {
    // Auto mode (A9) derives the reaction from the team's possible reactions; else use the manual picks.
    const auto = autoReact ? autoPickReaction(synergy.possibleReactions) : null;
    const autoChoiceLabel = auto ? (auto.label === "none" ? "no reaction" : auto.label) : null;
    const preset = ENEMY_PRESETS[enemyPreset] ?? ENEMY_PRESETS[0]!;
    const entries = selected.flatMap((s, i) => {
      const detail = details[i];
      if (!detail) return [];
      const loadout = s.loadoutId ? (savedLoadouts.find((l) => l.id === s.loadoutId) ?? null) : null;
      return [{ detail, loadout }];
    });
    const { damage: est, resReadout } = computeTeamDamage(entries, {
      reaction: auto ? auto.reaction : reaction,
      transformative: auto ? auto.transformative : transformative,
      enemyLevel: preset.level ?? enemyLevel,
      enemyRes: preset.res ?? enemyRes,
      presetByElement: preset.byElement,
    });
    return { damage: est, autoChoice: autoChoiceLabel, resReadout };
  }, [slots, details, savedLoadouts, reaction, transformative, autoReact, enemyPreset, enemyLevel, enemyRes]);

  return (
    <div className="team">
      <h1>Team Builder</h1>
      <p className="muted small">
        Pick up to 4 distinct characters and optionally a saved loadout per slot. Synergy and damage update live.
      </p>

      <div className="team-builder">
        <div className="team-picker">
          <div className="team-templates">
            <span className="muted small">Start from a template:</span>
            <div className="team-template-chips">
              {TEAM_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  className="template-chip"
                  title={t.description}
                  onClick={() => applyTemplate(t)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
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
                    {char?.splashArt || char?.wideSplashArt ? (
                      <img
                        className="portrait-img"
                        src={char.splashArt || char.wideSplashArt}
                        alt={summary?.name ?? ""}
                        loading="lazy"
                        // The vertical gacha slice isn't on the CDN for the newest characters;
                        // fall back to the (always-present) wide splash, cropped by object-fit.
                        onError={(e) => {
                          const el = e.currentTarget;
                          if (char.wideSplashArt && el.src !== char.wideSplashArt) el.src = char.wideSplashArt;
                        }}
                      />
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

          {energyRows.length ? (
            <>
              <h4>Energy (approx ER)</h4>
              <ul className="energy-list">
                {energyRows.map((r) => (
                  <li key={r.name} className={r.short ? "er-short" : ""}>
                    <span>{r.name}</span>
                    <span>
                      {r.er}% / ~{r.req}% {r.short ? "⚠" : "✓"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="muted small">Solo ER targets (approx) — a battery teammate lowers these.</p>
            </>
          ) : null}
        </Card>

        <Card title="Damage Estimate">
          <div className="dmg-form">
            <fieldset className="dmg-group">
              <legend>Enemy</legend>
              <label className="enemy-preset">
                <span>Preset</span>
                <select value={enemyPreset} onChange={(e) => setEnemyPreset(Number(e.target.value))} aria-label="Enemy preset">
                  {ENEMY_PRESETS.map((p, i) => (
                    <option key={p.name} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Level</span>
                <input
                  type="number"
                  min={1}
                  max={110}
                  value={enemyLevel}
                  onChange={(e) => setEnemyLevel(Number(e.target.value))}
                  aria-label="Enemy level"
                  disabled={enemyPreset !== 0}
                />
              </label>
              <label>
                <span>RES %</span>
                <input
                  type="number"
                  min={-100}
                  max={90}
                  value={enemyRes}
                  onChange={(e) => setEnemyRes(Number(e.target.value))}
                  aria-label="Enemy resistance percent"
                  disabled={enemyPreset !== 0}
                />
              </label>
            </fieldset>

            <fieldset className="dmg-group">
              <legend>Reaction</legend>
              <label className="auto-react">
                <input type="checkbox" checked={autoReact} onChange={(e) => setAutoReact(e.target.checked)} aria-label="Auto-detect reaction" />
                <span>Auto-detect</span>
              </label>
              <label>
                <span>Amplifying</span>
                <select value={reaction} onChange={(e) => setReaction(e.target.value)} aria-label="Reaction" disabled={autoReact}>
                  {Object.entries(REACTIONS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Extra</span>
                <select
                  value={transformative}
                  onChange={(e) => setTransformative(e.target.value)}
                  aria-label="Extra reaction"
                  disabled={autoReact}
                >
                  {TRANSFORMATIVE.map((t) => (
                    <option key={t} value={t}>
                      {t === "none" ? "None" : t}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          </div>

          {damage ? (
            <div className="damage">
              <div className="damage-total">
                <span className="dmg-num">{Math.round(damage.totalEstimated).toLocaleString()}</span>
                <span className="dmg-total-label">estimated damage / rotation</span>
              </div>
              {autoChoice ? (
                <p className="muted small dmg-auto">
                  Auto-detected reaction: <strong>{autoChoice}</strong>
                </p>
              ) : null}

              {resReadout.length ? (
                <div className="res-readout" aria-label="Effective enemy resistance by element">
                  <span className="muted small">Effective RES:</span>
                  {resReadout.map((r) => (
                    <span key={r.element} className={`res-chip el-${r.element.toLowerCase()}`}>
                      {r.element} {r.res}%
                    </span>
                  ))}
                </div>
              ) : null}

              <ul className="dmg-bars">
                {[...damage.perCharacter]
                  .sort((x, y) => y.estimated - x.estimated)
                  .map((p) => {
                    const share = damage.totalEstimated ? p.estimated / damage.totalEstimated : 0;
                    const element = detailByCharId.get(p.characterId)?.element ?? "";
                    return (
                      <li key={p.characterId}>
                        <details className="dmg-detail">
                          <summary>
                            <span className="dmg-line">
                              <Icon src={detailByCharId.get(p.characterId)?.icon} alt="" size={22} />
                              <span className="dmg-name">{nameById(p.characterId)}</span>
                              <span className="dmg-val">
                                {Math.round(p.estimated).toLocaleString()}
                                <em>{Math.round(share * 100)}%</em>
                              </span>
                            </span>
                            <span className="dmg-bar-track">
                              <span className={`dmg-bar el-${element.toLowerCase()}`} style={{ width: `${share * 100}%` }} />
                            </span>
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
                    );
                  })}
              </ul>

              <details className="dmg-assumptions">
                <summary>Assumptions &amp; team buffs</summary>
                <p className="muted small">
                  Lv {damage.assumptions.enemyLevel} enemy, {damage.assumptions.enemyResistancePct}% RES (after shred)
                  {damage.assumptions.reactionTypes.length ? `, ${damage.assumptions.reactionTypes.join("/")}` : ""},
                  rotation “{damage.assumptions.rotation}”. Slots with a saved loadout use geared stats; others use base
                  stats.
                </p>
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
              </details>
            </div>
          ) : (
            <p className="muted small">Add at least one character to estimate team damage.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
