// Shared shape for the CV builder feature: the canonical CVData structure the
// editor works with, plus CVEnrichment, the shape every "import from X"
// source (GitHub, LinkedIn export, portfolio site — see ./sources/) and
// export path (see export-docx.ts) is normalised to/from.

/** The canonical structured CV document edited and rendered by the CV builder. */
export interface CVData {
  contact: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
  };
  summary: string;
  experience: {
    title: string;
    company: string;
    dates: string;
    bullets: string[];
  }[];
  education: { degree: string; institution: string; dates: string }[];
  skills: string[];
}

/**
 * Partial CV content produced by an import source (GitHub, LinkedIn export,
 * portfolio scrape). `sourceLabel` identifies where it came from for display,
 * and `notes` carries source-specific caveats (e.g. "language is a suggestion,
 * not proof of proficiency") that should be surfaced to the user alongside
 * the imported content rather than silently merged in.
 */
export type CVEnrichment = Partial<Pick<CVData, "summary" | "experience" | "education" | "skills">> & {
  sourceLabel: string;
  notes: string[];
  escoSuggestions?: { escoSkillId: string; preferredLabel: string; sourceSkill: string }[];
};
