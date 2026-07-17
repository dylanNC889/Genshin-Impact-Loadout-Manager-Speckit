import type { Material } from "@app/contracts";

/** A "what to farm" list — material name + total count, tabular. */
export function MaterialList({ items }: { items: Material[] }) {
  if (!items.length) return <p className="muted small">No material data.</p>;
  return (
    <ul className="mat-list">
      {items.map((m) => (
        <li key={m.name}>
          <span>{m.name}</span>
          <span className="mat-count">×{m.count.toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
