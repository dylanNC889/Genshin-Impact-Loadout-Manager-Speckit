import { useMemo, useState } from "react";
import { Card } from "../components/ui";
import { fiveStarChance, getWishState, setWishState, pullsFrom, PULL_COST, type WishState } from "../wishes";
import { VERSION_DATES } from "../data/versionDates";

const DAY = 86_400_000;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Wish / pity planner (G): pulls now + by a date, 5★ odds from pity, and upcoming patch dates. */
export function WishesPage() {
  const [state, setState] = useState<WishState>(() => getWishState());
  const [target, setTarget] = useState<string>(() => iso(new Date(Date.now() + 42 * DAY)));
  const update = (patch: Partial<WishState>) => {
    const next = { ...state, ...patch };
    setState(next);
    setWishState(next);
  };
  const num = (v: string) => Math.max(0, Number(v) || 0);

  const model = useMemo(() => {
    const now = Date.now();
    const pullsNow = pullsFrom(state.primos, state.fates);
    const pullsBy = (dateISO: string) => {
      const days = Math.max(0, Math.ceil((new Date(dateISO).getTime() - now) / DAY));
      return { days, pulls: pullsFrom(state.primos + state.perDay * days, state.fates) };
    };
    const odds = (pulls: number) => {
      const any = fiveStarChance(state.pity, pulls, state.banner);
      return { any, featured: state.guaranteed ? any : any * 0.5 };
    };
    // Upcoming patch dates: any curated version still in the future, then extrapolate the 6-week
    // cadence from the last known date (labelled est.) so the list is never empty.
    const entries = Object.entries(VERSION_DATES).sort((a, b) => (a[1] < b[1] ? -1 : 1));
    const future = entries.filter(([, d]) => new Date(d).getTime() > now).map(([v, d]) => ({ label: `v${v}`, date: d, est: false }));
    const lastDate = new Date(entries[entries.length - 1]![1]);
    const upcoming = [...future];
    for (let i = 1; upcoming.length < 4; i++) {
      const d = new Date(lastDate.getTime() + 42 * i * DAY);
      if (d.getTime() > now) upcoming.push({ label: "Next patch", date: iso(d), est: true });
    }
    return { pullsNow, pullsBy, odds, upcoming: upcoming.slice(0, 4) };
  }, [state]);

  const targetInfo = model.pullsBy(target);
  const targetOdds = model.odds(targetInfo.pulls);
  const nowOdds = model.odds(model.pullsNow);

  return (
    <div className="wishes">
      <h1>Wish planner</h1>
      <p className="muted small">Estimate pulls and 5★ odds from your primogems, income and pity. Approximate — soft pity + 50/50.</p>

      <div className="detail-masonry">
        <Card title="Your resources">
          <div className="wish-form">
            <label>
              <span>Primogems</span>
              <input type="number" min={0} value={state.primos} onChange={(e) => update({ primos: num(e.target.value) })} aria-label="Primogems" />
            </label>
            <label>
              <span>Fates</span>
              <input type="number" min={0} value={state.fates} onChange={(e) => update({ fates: num(e.target.value) })} aria-label="Fates" />
            </label>
            <label>
              <span>Primogems / day</span>
              <input type="number" min={0} value={state.perDay} onChange={(e) => update({ perDay: num(e.target.value) })} aria-label="Primogems per day" />
            </label>
            <label>
              <span>Banner</span>
              <select value={state.banner} onChange={(e) => update({ banner: e.target.value as WishState["banner"] })} aria-label="Banner">
                <option value="character">Character</option>
                <option value="weapon">Weapon</option>
              </select>
            </label>
            <label>
              <span>Current pity</span>
              <input type="number" min={0} max={90} value={state.pity} onChange={(e) => update({ pity: num(e.target.value) })} aria-label="Current pity" />
            </label>
            <label className="wish-check">
              <input type="checkbox" checked={state.guaranteed} onChange={(e) => update({ guaranteed: e.target.checked })} aria-label="Guaranteed featured" />
              <span>Guaranteed (lost last 50/50)</span>
            </label>
          </div>
          <p className="muted small stat-foot">1 pull = {PULL_COST} primogems.</p>
        </Card>

        <Card title="Right now">
          <div className="wish-stat">
            <span className="wish-big">{model.pullsNow}</span>
            <span className="muted"> pulls available</span>
          </div>
          <ul className="wish-odds">
            <li>
              <span>Chance of a 5★</span>
              <strong>{pct(nowOdds.any)}</strong>
            </li>
            <li>
              <span>Chance of the featured 5★</span>
              <strong>{pct(nowOdds.featured)}</strong>
            </li>
          </ul>
        </Card>

        <Card title="By a target date">
          <label className="wish-target">
            <span>Target date</span>
            <input type="date" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Target date" />
          </label>
          <div className="wish-stat">
            <span className="wish-big">{targetInfo.pulls}</span>
            <span className="muted"> pulls in {targetInfo.days} days</span>
          </div>
          <ul className="wish-odds">
            <li>
              <span>Chance of a 5★</span>
              <strong>{pct(targetOdds.any)}</strong>
            </li>
            <li>
              <span>Chance of the featured 5★</span>
              <strong>{pct(targetOdds.featured)}</strong>
            </li>
          </ul>
        </Card>

        <Card title="Upcoming patches">
          <ul className="wish-patches">
            {model.upcoming.map((v, i) => {
              const info = model.pullsBy(v.date);
              return (
                <li key={i}>
                  <span className="wish-patch-label">
                    {v.label}
                    {v.est ? <span className="muted small"> est.</span> : null}
                  </span>
                  <span className="muted small">{v.date} · {info.days}d</span>
                  <span className="wish-patch-pulls">{info.pulls} pulls · {pct(model.odds(info.pulls).any)}</span>
                </li>
              );
            })}
          </ul>
          <p className="muted small stat-foot">Dates past the last known patch are estimated from the 6-week cadence.</p>
        </Card>
      </div>
    </div>
  );
}
