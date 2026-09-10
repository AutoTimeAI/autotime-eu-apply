import type { CandidateProfile, JobAnalysisDraft } from "shared";
import { normaliseSentence } from "./interview-buddy-policy.ts";

export type TechnicalInterviewDifficulty = "standard" | "advanced" | "senior";

function getTechnicalSignals(job: JobAnalysisDraft, profile: CandidateProfile) {
  const description = `${job.jobDescription} ${job.summary} ${profile.baseCvText} ${profile.experienceHighlights}`.toLowerCase();
  const inferred = [
    /\bsql|postgres|mysql|database|query|data model\b/i.test(description) && "SQL and data modelling",
    /\bapi|rest|graphql|integration|webhook\b/i.test(description) && "API integration",
    /\bcloud|aws|azure|gcp|serverless|vercel\b/i.test(description) && "cloud architecture",
    /\bobservability|monitoring|logging|incident|slo|sla\b/i.test(description) && "observability and incident response",
    /\bsecurity|auth|oauth|permission|privacy|compliance\b/i.test(description) && "security and access control",
    /\bagile|delivery|stakeholder|requirements|roadmap\b/i.test(description) && "technical delivery",
  ].filter(Boolean) as string[];
  return Array.from(new Set([...(job.skills?.filter(Boolean) ?? []), ...inferred])).slice(0, 8);
}

function getEvidenceHook(
  job: JobAnalysisDraft,
  profile: CandidateProfile,
  primarySkill: string,
  secondarySkill: string,
) {
  const proof = [
    job.jobDescription.trim() && `JD signal: ${normaliseSentence(job.jobDescription).slice(0, 150)}`,
    job.summary?.trim() && `Job summary: ${normaliseSentence(job.summary).slice(0, 150)}`,
    profile.experienceHighlights.trim() && `Profile proof: ${normaliseSentence(profile.experienceHighlights).slice(0, 150)}`,
    profile.projectSummaries.trim() && `Project proof: ${normaliseSentence(profile.projectSummaries).slice(0, 150)}`,
  ].filter(Boolean) as string[];
  return proof[0] ?? `Use saved evidence around ${primarySkill} and ${secondarySkill}; add missing proof before making strong claims.`;
}

export function buildTechnicalInterviewContext({
  difficulty,
  job,
  profile,
}: {
  difficulty: TechnicalInterviewDifficulty;
  job: JobAnalysisDraft;
  profile: CandidateProfile;
}) {
  const signals = getTechnicalSignals(job, profile);
  const primarySkill = signals[0] ?? "the main technical workflow";
  const secondarySkill = signals[1] ?? "stakeholder requirements";
  const evidenceHook = getEvidenceHook(job, profile, primarySkill, secondarySkill);
  const answerContract = [
    `Anchor the answer in saved evidence for ${primarySkill}.`,
    `Name the trade-off between ${primarySkill} and ${secondarySkill}.`,
    difficulty === "senior"
      ? "Include failure mode, rollback path and success metric."
      : difficulty === "advanced"
        ? "Include one failure mode and one validation signal."
        : "Include one assumption you would verify before delivery.",
    "Say 'I would verify that' where the profile or JD does not prove the claim.",
  ];
  const riskChecks = [
    "Do not invent production incidents, scale numbers, certifications or tools.",
    "Do not claim ownership unless it is in Profile Evidence.",
    !profile.workRightDetails.trim() && "Do not make work-right or relocation claims until profile evidence is saved.",
    "Separate what you know, what you infer and what you would validate.",
  ].filter(Boolean) as string[];
  const market = [
    profile.targetCountries.trim() && `Target market: ${profile.targetCountries.trim()}`,
    job.location.trim() && `Role location: ${job.location.trim()}`,
    job.workMode !== "unknown" && `Work setup: ${job.workMode}`,
    profile.workRightDetails.trim()
      ? `Work-right proof saved: ${normaliseSentence(profile.workRightDetails).slice(0, 120)}`
      : "Work-right proof missing: keep claims factual and verify official requirements",
  ].filter(Boolean) as string[];

  return {
    answerContract,
    depth:
      difficulty === "senior"
        ? "include trade-offs, failure modes and how you would measure success"
        : difficulty === "advanced"
          ? "include trade-offs and one risk you would validate"
          : "explain your approach clearly and name the evidence you would need",
    evidenceHook,
    euContext: [
      ...market.slice(0, 3),
      "EU signal: mention privacy, security, documentation or rollout controls where relevant.",
    ],
    primarySkill,
    riskChecks,
    secondarySkill,
    signals,
    timebox: difficulty === "senior" ? "6 minutes" : difficulty === "advanced" ? "4 minutes" : "3 minutes",
  };
}
