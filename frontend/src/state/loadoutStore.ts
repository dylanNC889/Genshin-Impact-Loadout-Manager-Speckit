import { create } from "zustand";
import type { ArtifactSlot, StatValue } from "@app/contracts";

/** A single artifact being edited in the loadout (FR-006). */
export interface ArtifactDraft {
  setId: string;
  mainStat: StatValue;
  subStats: StatValue[];
}

interface LoadoutState {
  weaponId: string | null;
  artifacts: Partial<Record<ArtifactSlot, ArtifactDraft>>;
  setWeapon: (id: string | null) => void;
  setArtifact: (slot: ArtifactSlot, draft: ArtifactDraft) => void;
  clearArtifact: (slot: ArtifactSlot) => void;
  reset: () => void;
}

/**
 * In-editor loadout state (Constitution plan: Zustand for transient edit state driving the
 * client-side stat engine). Reset when switching characters.
 */
export const useLoadoutStore = create<LoadoutState>((set) => ({
  weaponId: null,
  artifacts: {},
  setWeapon: (id) => set({ weaponId: id }),
  setArtifact: (slot, draft) => set((s) => ({ artifacts: { ...s.artifacts, [slot]: draft } })),
  clearArtifact: (slot) =>
    set((s) => {
      const next = { ...s.artifacts };
      delete next[slot];
      return { artifacts: next };
    }),
  reset: () => set({ weaponId: null, artifacts: {} }),
}));
