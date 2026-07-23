import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { fetchCharacters, fetchCharacterDetail } from "../api";
import { Card, Icon } from "../components/ui";
import { MaterialList } from "../components/MaterialList";
import { mergeMaterials } from "../materials";

/** Multi-character build planner (E2): pick a wishlist, get the combined "what to farm" list. */
export function PlannerPage() {
  const [params, setParams] = useSearchParams();
  const rosterQ = useQuery({ queryKey: ["characters", "all"], queryFn: () => fetchCharacters({}) });
  const roster = (rosterQ.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));

  const chars = (params.get("chars") ?? "").split(",").filter(Boolean);
  const setChars = (ids: string[]) => {
    const next = new URLSearchParams(params);
    if (ids.length) next.set("chars", [...new Set(ids)].join(","));
    else next.delete("chars");
    setParams(next, { replace: true });
  };
  const nameById = (id: string) => roster.find((c) => c.id === id)?.name ?? id;
  const iconById = (id: string) => roster.find((c) => c.id === id)?.icon;

  const detailsQ = useQuery({
    queryKey: ["planner", chars.join(",")],
    queryFn: () => Promise.all(chars.map((id) => fetchCharacterDetail(id))),
    enabled: chars.length > 0,
  });
  const details = detailsQ.data ?? [];
  const ascension = mergeMaterials(...details.map((d) => d.character.ascensionMaterials));
  const talents = mergeMaterials(...details.map((d) => d.character.talentMaterials));
  const total = mergeMaterials(ascension, talents);

  return (
    <div className="planner">
      <h1>Build planner</h1>
      <p className="muted small">
        Pick the characters you want to build and see the combined materials to farm (ascension + one talent each).
      </p>

      <div className="compare-pickers">
        <select
          value=""
          onChange={(e) => e.target.value && setChars([...chars, e.target.value])}
          aria-label="Add character"
        >
          <option value="">＋ Add a character…</option>
          {roster
            .filter((c) => !chars.includes(c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        {chars.length ? (
          <button className="btn ghost small" onClick={() => setChars([])}>
            Clear
          </button>
        ) : null}
      </div>

      {chars.length ? (
        <div className="planner-wishlist">
          {chars.map((id) => (
            <span key={id} className="wishlist-chip">
              <Icon src={iconById(id)} alt="" size={26} />
              {nameById(id)}
              <button className="wishlist-remove" onClick={() => setChars(chars.filter((c) => c !== id))} aria-label={`Remove ${nameById(id)}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {chars.length ? (
        detailsQ.isLoading ? (
          <p className="muted">Aggregating…</p>
        ) : (
          <div className="detail-masonry">
            <Card title={`Total for ${chars.length} character${chars.length > 1 ? "s" : ""}`}>
              <MaterialList items={total} />
              <p className="muted small stat-foot">Ascension + one talent each. ×3 talents per character to max all.</p>
            </Card>
            <Card title="By category">
              <h4 className="mat-title">Ascension</h4>
              <MaterialList items={ascension} />
              <h4 className="mat-title" style={{ marginTop: 12 }}>
                Talents (one each)
              </h4>
              <MaterialList items={talents} />
            </Card>
          </div>
        )
      ) : (
        <p className="muted small">Add characters above to build your farming list.</p>
      )}
    </div>
  );
}
