/** Recently-viewed characters, most-recent first, capped + de-duped (L). Stores name/icon too so
 *  the roster strip needs no extra lookup and is independent of the active roster filter. */
const KEY = "glm.recent.characters";
const CAP = 8;

export interface RecentChar {
  id: string;
  name: string;
  icon: string;
}

export function getRecent(): RecentChar[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as RecentChar[];
    return Array.isArray(raw) ? raw.filter((c) => c && c.id) : [];
  } catch {
    return [];
  }
}

export function pushRecent(c: RecentChar): void {
  if (!c?.id) return;
  const next = [c, ...getRecent().filter((x) => x.id !== c.id)].slice(0, CAP);
  localStorage.setItem(KEY, JSON.stringify(next));
}
