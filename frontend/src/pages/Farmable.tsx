import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchCharacters, fetchWeapons, listLoadouts } from "../api";
import { Card, Icon } from "../components/ui";
import { getOwned } from "../ownership";
import { CHARACTER_TALENT_DOMAINS, WEAPON_DOMAINS } from "../data/materialDomains";

const DAY_ABBR: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

/** "Farmable today" (D): the talent + weapon domains open on the current weekday, grouped, with the
 *  characters / weapons that need them. Every domain's day list includes Sunday, so Sunday shows all. */
export function FarmablePage() {
  const [showAll, setShowAll] = useState(false);
  const rosterQ = useQuery({ queryKey: ["characters", "all"], queryFn: () => fetchCharacters({}) });
  const weaponsQ = useQuery({ queryKey: ["weapons"], queryFn: () => fetchWeapons() });
  const loadoutsQ = useQuery({ queryKey: ["loadouts"], queryFn: listLoadouts });
  const roster = (rosterQ.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const weapons = (weaponsQ.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const built = new Set((loadoutsQ.data ?? []).map((l) => l.characterId));
  const ownedChars = getOwned("characters");
  const ownedWeapons = getOwned("weapons");
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const hasAccount = ownedChars.size > 0 || built.size > 0 || ownedWeapons.size > 0;
  const daysLabel = (days: string[]) => days.map((d) => DAY_ABBR[d] ?? d).join(" · ");
  const cleanDomain = (d: string) => d.replace(/^Domain of (Mastery|Forgery):\s*/, "");

  // Talent domains → characters that farm them.
  const relevantChars = roster.filter((c) => showAll || !hasAccount || ownedChars.has(c.id) || built.has(c.id));
  const charGroups = new Map<string, { domain: string; days: string[]; items: typeof roster }>();
  for (const c of relevantChars) {
    const d = CHARACTER_TALENT_DOMAINS[c.id];
    if (!d) continue;
    const g = charGroups.get(d.domain) ?? { domain: d.domain, days: d.days, items: [] };
    g.items.push(c);
    charGroups.set(d.domain, g);
  }
  const talentToday = [...charGroups.values()].filter((g) => g.days.includes(today)).sort((a, b) => a.domain.localeCompare(b.domain));

  // Weapon domains → weapons that farm them. Owned when you have any; else 5★ as a sensible default.
  const relevantWeapons = weapons.filter((w) =>
    showAll ? true : ownedWeapons.size > 0 ? ownedWeapons.has(w.id) : w.rarity === 5,
  );
  const weaponGroups = new Map<string, { domain: string; days: string[]; items: typeof weapons }>();
  for (const w of relevantWeapons) {
    const d = WEAPON_DOMAINS[w.id];
    if (!d) continue;
    const g = weaponGroups.get(d.domain) ?? { domain: d.domain, days: d.days, items: [] };
    g.items.push(w);
    weaponGroups.set(d.domain, g);
  }
  const weaponToday = [...weaponGroups.values()].filter((g) => g.days.includes(today)).sort((a, b) => a.domain.localeCompare(b.domain));

  return (
    <div className="farmable">
      <h1>Farmable today</h1>
      <p className="muted small">
        Domains open on <strong>{today}</strong>
        {hasAccount ? " for your owned / built roster" : ""}. On Sunday every domain is open.
      </p>
      {hasAccount ? (
        <label className="saved-only-toggle">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show everything (not just owned / built)
        </label>
      ) : null}

      <h2 className="farm-section">Talent books</h2>
      {talentToday.length ? (
        <div className="detail-masonry">
          {talentToday.map((g) => (
            <Card key={g.domain} title={cleanDomain(g.domain)}>
              <p className="muted small">Talent books · {daysLabel(g.days)}</p>
              <div className="farm-chars">
                {g.items.map((c) => (
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
        <p className="muted">No talent domains match — try “Show everything”.</p>
      )}

      <h2 className="farm-section">Weapon materials</h2>
      {weaponToday.length ? (
        <div className="detail-masonry">
          {weaponToday.map((g) => (
            <Card key={g.domain} title={cleanDomain(g.domain)}>
              <p className="muted small">
                Weapon ascension · {daysLabel(g.days)}
                {ownedWeapons.size === 0 && !showAll ? " · 5★" : ""}
              </p>
              <div className="farm-chars">
                {g.items.map((w) => (
                  <Link key={w.id} to={`/weapon/${w.id}`} className={`farm-char rarity-${w.rarity}`} title={w.name}>
                    <Icon src={w.icon} alt={w.name} size={44} />
                    <span className="farm-char-name">{w.name}</span>
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="muted">No weapon domains match — try “Show everything”.</p>
      )}
    </div>
  );
}
