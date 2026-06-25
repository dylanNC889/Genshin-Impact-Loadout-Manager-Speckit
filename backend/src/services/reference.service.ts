import type { ArtifactSet, Dataset, SlotStatRules, Weapon } from "@app/contracts";

/** Weapons, optionally filtered to a weapon type (FR-005). */
export function listWeapons(dataset: Dataset, weaponType?: string): Weapon[] {
  return dataset.weapons.filter((w) => (weaponType ? w.weaponType === weaponType : true));
}

/** All artifact sets with their 2pc/4pc bonuses (FR-009). */
export function listArtifactSets(dataset: Dataset): ArtifactSet[] {
  return dataset.artifactSets;
}

/** Per-slot main/substat validity rules (FR-007). */
export function getSlotRules(dataset: Dataset): SlotStatRules {
  return dataset.slotStatRules;
}
