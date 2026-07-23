/** Which characters / weapons the user owns, persisted to localStorage (E1). */
type Kind = "characters" | "weapons";
const KEY = (kind: Kind) => `glm.owned.${kind}`;

export function getOwned(kind: Kind): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY(kind)) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function toggleOwned(kind: Kind, id: string): Set<string> {
  const owned = getOwned(kind);
  if (owned.has(id)) owned.delete(id);
  else owned.add(id);
  localStorage.setItem(KEY(kind), JSON.stringify([...owned]));
  return owned;
}

export function setOwned(kind: Kind, ids: string[]): void {
  localStorage.setItem(KEY(kind), JSON.stringify([...new Set(ids)]));
}
