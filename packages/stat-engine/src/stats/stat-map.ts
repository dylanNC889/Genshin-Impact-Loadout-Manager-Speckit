import type { StatKey, StatValue } from "@app/contracts";
import { STAT_KEYS } from "@app/contracts";

/** A dense map from every StatKey to a numeric value (percent stats in points). */
export type StatMap = Record<StatKey, number>;

export function emptyStatMap(): StatMap {
  const m = {} as StatMap;
  for (const k of STAT_KEYS) m[k] = 0;
  return m;
}

export function add(map: StatMap, key: StatKey, value: number): void {
  map[key] += value;
}

export function toStatValues(map: StatMap, keys?: readonly StatKey[]): StatValue[] {
  const ks = keys ?? STAT_KEYS;
  return ks.map((k) => ({ key: k, value: map[k] }));
}

/** Convenience for consumers/tests: index a StatValue[] by key. */
export function statRecord(values: StatValue[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const v of values) r[v.key] = v.value;
  return r;
}
