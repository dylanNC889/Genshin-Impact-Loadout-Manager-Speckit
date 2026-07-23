import type { Material } from "@app/contracts";
import { MATERIAL_SOURCES } from "../data/materialSources";

/** A "what to farm" list — material name + total count, tabular, with a source hint on hover (#6). */
export function MaterialList({ items }: { items: Material[] }) {
  if (!items.length) return <p className="muted small">No material data.</p>;
  return (
    <ul className="mat-list">
      {items.map((m) => {
        const hint = MATERIAL_SOURCES[m.name];
        return (
          <li key={m.name}>
            <span className="mat-name">
              {m.name}
              {hint ? (
                <span className="mat-info" tabIndex={0} aria-label={`Where to get ${m.name}: ${hint}`}>
                  ⓘ
                  <span className="mat-tip" role="tooltip">
                    {hint}
                  </span>
                </span>
              ) : null}
            </span>
            <span className="mat-count">×{m.count.toLocaleString()}</span>
          </li>
        );
      })}
    </ul>
  );
}
