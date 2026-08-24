// Builds the context object passed to the ESCO skills-questionnaire AI flow
// for each round: bundles the current Q&A turn with the running skill
// profile, split into low- vs. established-confidence skills so the prompt
// consuming this can decide what to probe next.

/** A skill in the user's accumulated ESCO skill profile, with a confidence score and where it came from. */
export type AccumulatedSkill = { escoSkillId: string; confidence: number; source: "stated" | "inferred" | "confirmed" };

/**
 * Assembles the per-round context for the ESCO questionnaire flow. Splits
 * `currentSkillProfile` into `lowConfidenceSkillIds` (confidence <= 0.5) and
 * `establishedSkillIds` (confidence > 0.5) so downstream prompting can target
 * skills that still need confirming.
 */
export function buildQuestionnaireContext({ question, answer, answeredSoFar, candidateSkills, currentSkillProfile, round }: {
  question: string;
  answer: string;
  answeredSoFar: Array<{ question: string; answer: string }>;
  candidateSkills: Array<{ id: string; preferredLabel: string; skillType: string | null }>;
  currentSkillProfile: AccumulatedSkill[];
  round: number;
}) {
  return {
    question, answer, answeredSoFar, candidateSkills, currentSkillProfile, round,
    lowConfidenceSkillIds: currentSkillProfile.filter((skill) => skill.confidence <= 0.5).map((skill) => skill.escoSkillId),
    establishedSkillIds: currentSkillProfile.filter((skill) => skill.confidence > 0.5).map((skill) => skill.escoSkillId),
  };
}
