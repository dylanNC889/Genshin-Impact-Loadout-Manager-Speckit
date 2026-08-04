import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchCharacters, listLoadouts } from "../api";
import { Card, Icon } from "../components/ui";
import { getOwned } from "../ownership";
import { CHARACTER_TALENT_DOMAINS, MATERIAL_DOMAINS } from "../data/materialDomains";

const DAY_ABBR: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

/** "Farmable today" (D): which talent/weapon domains are open on the current weekday, and which of
 *  your owned/built characters need them. Every domain's day list includes Sunday, so Sunday
 *  naturally shows everything. */
export function FarmablePage() {
  const [showAll, setShowAll] = useState(false);
  const rosterQ = useQuery({ queryKey: ["characters", "all"], queryFn: () => fetchCharacters({}) });
  const loadoutsQ = useQuery({ queryKey: ["loadouts"], queryFn: listLoadouts });
  const roster = (rosterQ.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const built = new Set((loadoutsQ.data ?? []).map((l) => l.characterId));
  const owned = getOwned("characters");
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const hasAccount = owned.size > 0 || built.size > 0;

  // Group the relevant characters by their talent-book domain.
  const relevant = roster.filter((c) => showAll || !hasAccount || owned.has(c.id) || built.has(c.id));
  const byDomain = new Map<string, { domain: string; days: string[]; chars: typeof roster }>();
  for (const c of relevant) {
    const d = CHARACTER_TALENT_DOMAINS[c.id];
    if (!d) continue;
    const g = byDomain.get(d.domain) ?? { domain: d.domain, days: d.days, chars: [] };
    g.chars.push(c);
    byDomain.set(d.domain, g);
  }
  const groups = [...byDomain.values()].sort((a, b) => a.domain.localeCompare(b.domain));
  const openToday = groups.filter((g) => g.days.includes(today));

  // Weapon-material domains open today (no per-character mapping — just what's available).
  const weaponDomainsToday = [
    ...new Set(
      Object.values(MATERIAL_DOMAINS)
        .filter((m) => m.kind === "weapon" && m.days.includes(today))
        .map((m) => m.domain),
    ),
  ].sort();

  const daysLabel = (days: string[]) => days.map((d) => DAY_ABBR[d] ?? d).join(" · ");

  return (
    <div className="farmable">
      <h1>Farmable today</h1>
      <p className="muted small">
        Talent domains open on <strong>{today}</strong>
        {hasAccount ? " for your owned / built characters" : ""}. On Sunday every domain is open.
      </p>
      {hasAccount ? (
        <label className="saved-only-toggle">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show all characters (not just owned / built)
        </label>
      ) : null}

      {openToday.length ? (
        <div className="detail-masonry">
          {openToday.map((g) => (
            <Card key={g.domain} title={g.domain.replace(/^Domain of Mastery:\s*/, "")}>
              <p className="muted small">Talent books · {daysLabel(g.days)}</p>
              <div className="farm-chars">
                {g.chars.map((c) => (
                  <Link key={c.id} to={`/character/${c.id}`} className="farm-char" title={c.name}>
                    <Icon src={c.icon} alt={c.name} size={44} />
                    <span className="farm-char-name">{c.name}</span>
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="muted">No talent domains match — try “Show all characters”.</p>
      )}

      {weaponDomainsToday.length ? (
        <Card title="Weapon domains open today">
          <ul className="chips">
            {weaponDomainsToday.map((d) => (
              <li key={d} className="chip">
                {d.replace(/^Forgotten Hall:\s*|^Domain of Forgery:\s*/, "")}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
