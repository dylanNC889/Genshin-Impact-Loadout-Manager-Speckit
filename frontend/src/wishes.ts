/** Wish / pity planning math + persisted inputs (G). All models are approximations (soft pity,
 *  50/50); banner *contents* aren't predicted — only pull counts, odds, and version dates. */

export const PULL_COST = 160; // primogems per intertwined/acquaint fate

/** Per-pull 5★ probability on the character banner (base 0.6%, soft pity from 74, hard at 90). */
function charRate(pity: number): number {
  if (pity >= 90) return 1;
  if (pity <= 73) return 0.006;
  return Math.min(1, 0.006 + 0.06 * (pity - 73));
}

/** Per-pull 5★ probability on the weapon banner (base 0.7%, soft pity from 63, hard at 80). */
function weaponRate(pity: number): number {
  if (pity >= 80) return 1;
  if (pity <= 62) return 0.007;
  return Math.min(1, 0.007 + 0.07 * (pity - 62));
}

/** Chance of pulling at least one 5★ within `wishes` pulls, starting from `currentPity`. */
export function fiveStarChance(currentPity: number, wishes: number, banner: "character" | "weapon"): number {
  const rate = banner === "weapon" ? weaponRate : charRate;
  let noFive = 1;
  for (let i = 1; i <= wishes; i++) noFive *= 1 - rate(currentPity + i);
  return 1 - noFive;
}

export function pullsFrom(primos: number, fates: number): number {
  return Math.max(0, fates) + Math.floor(Math.max(0, primos) / PULL_COST);
}

export interface WishState {
  primos: number;
  fates: number;
  perDay: number;
  pity: number;
  guaranteed: boolean;
  banner: "character" | "weapon";
  /** The featured character / weapon you're saving for (banner contents aren't predicted). */
  targetCharId: string;
  targetWeaponId: string;
}

const KEY = "glm.wishes";
const DEFAULT: WishState = {
  primos: 0,
  fates: 0,
  perDay: 60,
  pity: 0,
  guaranteed: false,
  banner: "character",
  targetCharId: "",
  targetWeaponId: "",
};

export function getWishState(): WishState {
  try {
    return { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<WishState>) };
  } catch {
    return { ...DEFAULT };
  }
}

export function setWishState(s: WishState): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
