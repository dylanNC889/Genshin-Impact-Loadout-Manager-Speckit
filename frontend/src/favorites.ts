/** Favourite characters, persisted to localStorage (roster "favourites-first" sort). */
const KEY = "glm.favorites";

export function getFavorites(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function setFavorites(ids: string[]): void {
  localStorage.setItem(KEY, JSON.stringify([...new Set(ids)]));
}

export function toggleFavorite(id: string): Set<string> {
  const favs = getFavorites();
  if (favs.has(id)) favs.delete(id);
  else favs.add(id);
  localStorage.setItem(KEY, JSON.stringify([...favs]));
  return favs;
}
