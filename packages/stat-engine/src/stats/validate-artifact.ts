import type { ArtifactInstance, ErrorEnvelope, SlotStatRules } from "@app/contracts";

export interface ValidationResult {
  ok: boolean;
  errors: ErrorEnvelope[];
}

/**
 * Validate an artifact's main stat and substats against the per-slot rules (FR-006/007).
 * Used identically on client (immediate UX) and server (authoritative).
 */
export function validateArtifact(artifact: ArtifactInstance, rules: SlotStatRules): ValidationResult {
  const errors: ErrorEnvelope[] = [];
  const allowedMain = rules.allowedMainStats[artifact.slot] ?? [];

  if (!allowedMain.includes(artifact.mainStat.key)) {
    errors.push({
      code: "INVALID_ARTIFACT_MAIN_STAT",
      message: `${artifact.mainStat.key} is not a valid main stat for the ${artifact.slot} slot.`,
      remedy: allowedMain.length ? `Choose one of: ${allowedMain.join(", ")}.` : "No main stats allowed for this slot.",
    });
  }

  if (artifact.subStats.length > 4) {
    errors.push({
      code: "TOO_MANY_SUBSTATS",
      message: "An artifact can have at most 4 substats.",
      remedy: "Remove the extra substats.",
    });
  }

  const seen = new Set<string>();
  for (const s of artifact.subStats) {
    if (!rules.allowedSubStats.includes(s.key)) {
      errors.push({
        code: "INVALID_SUBSTAT",
        message: `${s.key} is not a valid substat.`,
        remedy: `Use one of: ${rules.allowedSubStats.join(", ")}.`,
      });
    }
    if (s.key === artifact.mainStat.key) {
      errors.push({
        code: "SUBSTAT_EQUALS_MAIN",
        message: `Substat ${s.key} cannot match the main stat.`,
        remedy: "Pick a different substat.",
      });
    }
    if (seen.has(s.key)) {
      errors.push({
        code: "DUPLICATE_SUBSTAT",
        message: `Duplicate substat ${s.key}.`,
        remedy: "Each substat must be unique.",
      });
    }
    seen.add(s.key);
  }

  return { ok: errors.length === 0, errors };
}
