import type {
  ActiveSetBonus,
  Character,
  GrowthCurve,
  LoadoutInput,
  StatValue,
  SynergyAssessment,
  TeamInput,
} from "@app/contracts";

export interface CharacterSummary {
  id: string;
  name: string;
  element: string;
  weaponType: string;
  rarity: number;
  icon: string;
  region: string;
}

export interface CharacterDetail {
  character: Character;
  curves: Record<string, GrowthCurve>;
}

export interface SavedLoadout extends LoadoutInput {
  id: string;
  computedFinalStats: StatValue[];
  activeSetBonuses: ActiveSetBonus[];
}

export interface SavedTeam extends TeamInput {
  id: string;
  synergy: SynergyAssessment;
}
