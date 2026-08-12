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

export type CVEnrichment = Partial<Pick<CVData, "summary" | "experience" | "education" | "skills">> & {
  sourceLabel: string;
  notes: string[];
  escoSuggestions?: { escoSkillId: string; preferredLabel: string; sourceSkill: string }[];
};
