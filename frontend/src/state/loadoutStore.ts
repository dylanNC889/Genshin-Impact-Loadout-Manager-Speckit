import { create } from "zustand";
import type { ArtifactSlot, ArtifactSubStat, StatValue } from "@app/contracts";

/** A single artifact being edited in the loadout (FR-006). */
export interface ArtifactDraft {
  setId: string;
  mainStat: StatValue;
  subStats: ArtifactSubStat[];
}

interface LoadoutState {
  weaponId: string | null;
  artifacts: Partial<Record<ArtifactSlot, ArtifactDraft>>;
  /** Constellation level (0–6) and weapon refinement rank (1–5) — A1. */
  constellation: number;
  refinement: number;
  /** Freeform note + tags for the saved build (B10). */
  notes: string;
  tags: string[];
  setWeapon: (id: string | null) => void;
  setArtifact: (slot: ArtifactSlot, draft: ArtifactDraft) => void;
  clearArtifact: (slot: ArtifactSlot) => void;
  setConstellation: (n: number) => void;
  setRefinement: (n: number) => void;
  setNotes: (s: string) => void;
  setTags: (t: string[]) => void;
  reset: () => void;
}

/**
 * In-editor loadout state (Constitution plan: Zustand for transient edit state driving the
 * client-side stat engine). Reset when switching characters.
 */
export const useLoadoutStore = create<LoadoutState>((set) => ({
  weaponId: null,
  artifacts: {},
  constellation: 0,
  refinement: 1,
  notes: "",
  tags: [],
  setWeapon: (id) => set({ weaponId: id }),
  setArtifact: (slot, draft) => set((s) => ({ artifacts: { ...s.artifacts, [slot]: draft } })),
  clearArtifact: (slot) =>
    set((s) => {
      const next = { ...s.artifacts };
      delete next[slot];
      return { artifacts: next };
    }),
  setConstellation: (n) => set({ constellation: n }),
  setRefinement: (n) => set({ refinement: n }),
  setNotes: (notes) => set({ notes }),
  setTags: (tags) => set({ tags }),
  reset: () => set({ weaponId: null, artifacts: {}, constellation: 0, refinement: 1, notes: "", tags: [] }),
}));
