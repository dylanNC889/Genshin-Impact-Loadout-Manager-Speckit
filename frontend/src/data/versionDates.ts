/**
 * Live-release date (patch launch, phase 1) for each Genshin Impact version (#5 timeline).
 * genshin-db exposes only a character/weapon's debut `version`, not a date, so these are
 * curated from the public patch history (game8 / official). Characters within a version
 * actually debut in one of two ~3-week banner phases; we show the version's launch date.
 */
export const VERSION_DATES: Record<string, string> = {
  "1.0": "2020-09-28",
  "1.1": "2020-11-11",
  "1.2": "2020-12-23",
  "1.3": "2021-02-03",
  "1.4": "2021-03-17",
  "1.5": "2021-04-28",
  "1.6": "2021-06-09",
  "2.0": "2021-07-21",
  "2.1": "2021-09-01",
  "2.2": "2021-10-13",
  "2.3": "2021-11-24",
  "2.4": "2022-01-05",
  "2.5": "2022-02-16",
  "2.6": "2022-03-30",
  "2.7": "2022-05-31",
  "2.8": "2022-07-13",
  "3.0": "2022-08-24",
  "3.1": "2022-09-28",
  "3.2": "2022-11-02",
  "3.3": "2022-12-07",
  "3.4": "2023-01-18",
  "3.5": "2023-03-01",
  "3.6": "2023-04-12",
  "3.7": "2023-05-24",
  "3.8": "2023-07-05",
  "4.0": "2023-08-16",
  "4.1": "2023-09-27",
  "4.2": "2023-11-08",
  "4.3": "2023-12-20",
  "4.4": "2024-01-31",
  "4.5": "2024-03-13",
  "4.6": "2024-04-24",
  "4.7": "2024-06-05",
  "4.8": "2024-07-17",
  "5.0": "2024-08-28",
  "5.1": "2024-10-09",
  "5.2": "2024-11-20",
  "5.3": "2025-01-01",
  "5.4": "2025-02-12",
  "5.5": "2025-03-26",
  "5.6": "2025-05-07",
  "5.7": "2025-06-18",
  "5.8": "2025-07-30",
  "6.0": "2025-09-10",
  "6.1": "2025-10-22",
  "6.2": "2025-12-03",
  "6.3": "2026-01-14",
  "6.4": "2026-02-25",
  "6.5": "2026-04-08",
  "6.6": "2026-05-20",
  "6.7": "2026-07-01",
};

/** e.g. "2023-11-08" -> "Nov 2023". Returns "" for an unknown version. */
export function versionDateLabel(version: string): string {
  const iso = VERSION_DATES[version];
  if (!iso) return "";
  const [y, m] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[(m ?? 1) - 1]} ${y}`;
}

/** Full date, e.g. "8 Nov 2023" — used for titles/tooltips. Returns "" if unknown. */
export function versionDateFull(version: string): string {
  const iso = VERSION_DATES[version];
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[(m ?? 1) - 1]} ${y}`;
}
