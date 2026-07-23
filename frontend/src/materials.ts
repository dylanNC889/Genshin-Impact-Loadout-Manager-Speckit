import type { Material } from "@app/contracts";

/** Merge several material lists into one, summing by name (Mora first, then by count). */
export function mergeMaterials(...lists: Material[][]): Material[] {
  const totals = new Map<string, number>();
  for (const list of lists) {
    for (const m of list) totals.set(m.name, (totals.get(m.name) ?? 0) + m.count);
  }
  return [...totals.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (a.name === "Mora" ? -1 : b.name === "Mora" ? 1 : b.count - a.count));
}
