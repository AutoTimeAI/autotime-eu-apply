export type AccumulatedSkill = { escoSkillId: string; confidence: number; source: "stated" | "inferred" | "confirmed" };

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
