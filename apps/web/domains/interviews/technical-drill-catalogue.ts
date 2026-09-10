import type { CandidateProfile, JobAnalysisDraft } from "shared";
import {
  buildTechnicalInterviewContext,
  type TechnicalInterviewDifficulty,
} from "./technical-interview-policy.ts";

export type TechnicalInterviewFocus =
  | "systems"
  | "debugging"
  | "api"
  | "data"
  | "delivery";

export type TechnicalInterviewDrill = {
  answerContract: string[];
  evidenceHook: string;
  euContext: string[];
  id: string;
  question: string;
  riskChecks: string[];
  timebox: string;
  expectedSignals: string[];
  followUps: string[];
  prepHint: string;
};

export function createTechnicalInterviewDrills({
  difficulty,
  focus,
  job,
  profile
}: {
  difficulty: TechnicalInterviewDifficulty
  focus: TechnicalInterviewFocus
  job: JobAnalysisDraft
  profile: CandidateProfile
}): TechnicalInterviewDrill[] {
  const role = job.jobTitle.trim() || profile.targetRoles.trim() || "this role"
  const company = job.company.trim() || "the employer"
  const {
    answerContract,
    depth,
    evidenceHook,
    euContext,
    primarySkill,
    riskChecks,
    secondarySkill,
    timebox
  } = buildTechnicalInterviewContext({ difficulty, job, profile })

  const templates: Record<TechnicalInterviewFocus, TechnicalInterviewDrill[]> = {
    systems: [
      {
        id: "systems-architecture",
        question: `Design a reliable workflow for ${role} at ${company} where ${primarySkill} is a core dependency. Walk through components, data flow and operational risks.`,
        timebox,
        expectedSignals: [
          "Clear problem framing before solutioning",
          "Data flow, ownership and failure boundaries",
          "Monitoring, rollback and recovery thinking"
        ],
        evidenceHook,
        euContext,
        answerContract,
        riskChecks,
        followUps: [
          "What would you simplify for an MVP?",
          "Where would latency or data quality fail first?",
          "How would you prove this design is working?"
        ],
        prepHint: `Use saved evidence only, then ${depth}.`
      },
      {
        id: "systems-scale",
        question: `The current process works for 10 users but fails at 10,000. How would you diagnose and redesign the bottleneck?`,
        timebox,
        expectedSignals: [
          "Identifies load, data and dependency bottlenecks",
          "Separates diagnosis from redesign",
          "Names observability and test strategy"
        ],
        evidenceHook,
        euContext,
        answerContract,
        riskChecks,
        followUps: [
          "What metric would you inspect first?",
          "What would you cache, queue or batch?",
          "What would you refuse to optimise early?"
        ],
        prepHint: `Anchor the answer in ${primarySkill} and ${secondarySkill}.`
      }
    ],
    debugging: [
      {
        id: "debugging-production",
        question: `A production workflow tied to ${primarySkill} is intermittently failing and users report inconsistent results. How do you triage it live?`,
        timebox,
        expectedSignals: [
          "Immediate impact and rollback assessment",
          "Hypothesis-led debugging",
          "Logs, traces, recent changes and reproduction path"
        ],
        evidenceHook,
        euContext,
        answerContract,
        riskChecks,
        followUps: [
          "What do you tell non-technical stakeholders?",
          "What evidence would change your hypothesis?",
          "How do you prevent the same issue returning?"
        ],
        prepHint: `Answer like a real incident: stabilise, inspect, fix, learn.`
      },
      {
        id: "debugging-data",
        question: `A dashboard number looks wrong after a release. How would you prove whether the bug is data, UI, API or business logic?`,
        timebox,
        expectedSignals: [
          "Defines expected vs actual behaviour",
          "Checks source data before UI assumptions",
          "Uses controlled examples or query-level validation"
        ],
        evidenceHook,
        euContext,
        answerContract,
        riskChecks,
        followUps: [
          "Which query or API response would you inspect?",
          "How would you communicate uncertainty?",
          "What automated check would you add?"
        ],
        prepHint: `Mention the fastest trustworthy way to isolate the layer.`
      }
    ],
    api: [
      {
        id: "api-contract",
        question: `You need to integrate a third-party API into ${role}. How would you design the contract, handle errors and protect user data?`,
        timebox,
        expectedSignals: [
          "Contract-first thinking",
          "Authentication, retries and idempotency",
          "Privacy and least-privilege handling"
        ],
        evidenceHook,
        euContext,
        answerContract,
        riskChecks,
        followUps: [
          "What would you log and what would you never log?",
          "How do you handle rate limits?",
          "What makes the integration testable?"
        ],
        prepHint: `Use ${primarySkill} as the concrete integration context.`
      },
      {
        id: "api-versioning",
        question: `An API you depend on changes response shape without warning. What breaks, and how do you make the product resilient next time?`,
        timebox,
        expectedSignals: [
          "Schema validation or typed boundary",
          "Fallback behaviour",
          "Monitoring and provider communication"
        ],
        evidenceHook,
        euContext,
        answerContract,
        riskChecks,
        followUps: [
          "What user-facing state should appear?",
          "Where should validation live?",
          "How would you roll out the fix safely?"
        ],
        prepHint: `Show that you can protect users while debugging the root cause.`
      }
    ],
    data: [
      {
        id: "data-model",
        question: `Model the data needed to track candidate applications, interview stages and follow-ups. What tables or entities matter, and what would you index?`,
        timebox,
        expectedSignals: [
          "Entities, relationships and lifecycle states",
          "Indexes based on query patterns",
          "Auditability and deletion/privacy thinking"
        ],
        evidenceHook,
        euContext,
        answerContract,
        riskChecks,
        followUps: [
          "How would you prevent duplicate records?",
          "What should be event data vs current state?",
          "How would you support analytics later?"
        ],
        prepHint: `Keep the answer practical and name the most common query.`
      },
      {
        id: "data-quality",
        question: `A report has missing or duplicated interview outcomes. How would you find the source and rebuild trust in the metric?`,
        timebox,
        expectedSignals: [
          "Data lineage and reconciliation",
          "Validation checks",
          "Explains metric limitations honestly"
        ],
        evidenceHook,
        euContext,
        answerContract,
        riskChecks,
        followUps: [
          "What sample record would you inspect first?",
          "What quality check would run daily?",
          "When would you stop showing the metric?"
        ],
        prepHint: `Make the answer evidence-led, not dashboard-led.`
      }
    ],
    delivery: [
      {
        id: "delivery-tradeoff",
        question: `A stakeholder wants speed, engineering wants reliability and users need clarity. How do you decide what ships for ${role}?`,
        timebox,
        expectedSignals: [
          "Frames trade-offs explicitly",
          "Defines risk and success criteria",
          "Shows communication across technical and non-technical groups"
        ],
        evidenceHook,
        euContext,
        answerContract,
        riskChecks,
        followUps: [
          "What would you cut from scope?",
          "What decision would you document?",
          "How would you know the compromise worked?"
        ],
        prepHint: `Use one real project or delivery example from your profile.`
      },
      {
        id: "delivery-requirements",
        question: `Requirements are vague but the team needs implementation detail. How do you turn ambiguity into a technical plan?`,
        timebox,
        expectedSignals: [
          "Clarifying questions",
          "Assumptions and acceptance criteria",
          "Small validation path before full build"
        ],
        evidenceHook,
        euContext,
        answerContract,
        riskChecks,
        followUps: [
          "What question do you ask first?",
          "What assumption is most dangerous?",
          "What prototype or test would reduce risk?"
        ],
        prepHint: `Show how you move from ambiguity to delivery without overclaiming.`
      }
    ]
  }

  return templates[focus].map((drill, index) => ({
    ...drill,
    id: `${drill.id}-${difficulty}-${index}`
  }))
}

