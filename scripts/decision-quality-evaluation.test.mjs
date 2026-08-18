import assert from "node:assert/strict";
import {
  analyseJob,
  extractJob,
  type JobDecision,
} from "../apps/web/lib/job-application-workflow.ts";

type DecisionCase = {
  id: string;
  name: string;
  description: string;
  evidence: string;
  expected: JobDecision;
  sponsorshipRequired?: boolean;
  expectedUnknowns?: string[];
  forbiddenCriticalRisk?: string;
  repeat?: boolean;
};

const complete = (requirements: string, extra = "") => `Job title: Technical Business Analyst
Company: Example Financial Systems
Location: Dublin, Ireland
Permanent hybrid position. Salary €70,000 - €82,000.
${requirements}
English required. ${extra}`;

const missingSalaryAndSponsor = (requirements: string) => `Job title: Technical Business Analyst
Company: Example Financial Systems
Location: Dublin, Ireland
Permanent hybrid position with competitive compensation.
${requirements}
English required. Applications close next month.`;

const matchedEvidence =
  "Delivered TypeScript Node PostgreSQL services, secure API integration, SQL reporting, requirements analysis, stakeholder workshops, UAT, payments operations, Agile delivery and production support.";

const cases = [
  {
    id: "DQ-001",
    name: "strong payments analyst evidence",
    description: complete(
      "Required requirements analysis and stakeholder workshops. Essential UAT payments experience. Required SQL reporting and Agile delivery.",
    ),
    evidence: matchedEvidence,
    expected: "Apply",
  },
  {
    id: "DQ-002",
    name: "strong backend evidence",
    description: complete(
      "Required TypeScript Node PostgreSQL delivery. Essential secure API integration experience. Required automated testing and cloud delivery.",
    ),
    evidence:
      "Built TypeScript Node PostgreSQL services, secure API integrations, automated testing and cloud delivery.",
    expected: "Apply",
  },
  {
    id: "DQ-003",
    name: "strong application support evidence",
    description: complete(
      "Required production application support and incident analysis. Essential stakeholder communication experience. Required SQL reporting and service delivery.",
    ),
    evidence:
      "Provided production application support, incident analysis, stakeholder communication, SQL reporting and service delivery.",
    expected: "Apply",
  },
  {
    id: "DQ-004",
    name: "strong sponsorship-supported role",
    description: complete(
      "Required requirements analysis and stakeholder workshops. Essential UAT payments experience. Required SQL reporting and Agile delivery.",
      "We provide visa sponsorship for suitable candidates.",
    ),
    evidence: matchedEvidence,
    expected: "Apply",
    sponsorshipRequired: true,
  },
  {
    id: "DQ-005",
    name: "strong systems analysis evidence",
    description: complete(
      "Required systems analysis and requirements documentation. Essential API integration experience. Required stakeholder delivery and UAT.",
    ),
    evidence:
      "Led systems analysis, requirements documentation, API integration, stakeholder delivery and UAT.",
    expected: "Apply",
  },
  {
    id: "DQ-006",
    name: "unknown salary and sponsorship stay unresolved",
    description: missingSalaryAndSponsor(
      "Required requirements analysis and stakeholder workshops. Essential UAT payments experience. Required SQL reporting and Agile delivery.",
    ),
    evidence: matchedEvidence,
    expected: "Consider",
    sponsorshipRequired: true,
    expectedUnknowns: ["Salary", "Vacancy-specific sponsorship wording"],
    forbiddenCriticalRisk: "Salary unsuitable",
  },
  {
    id: "DQ-007",
    name: "missing title and employer require consideration",
    description:
      "Location: Dublin, Ireland\nPermanent hybrid position. Salary €70,000 - €82,000.\nRequired requirements analysis and stakeholder workshops. Essential UAT payments experience. Required SQL reporting and Agile delivery. English required.",
    evidence: matchedEvidence,
    expected: "Consider",
    expectedUnknowns: ["Role title", "Employer"],
  },
  {
    id: "DQ-008",
    name: "partial evidence remains consideration",
    description: complete(
      "Required requirements analysis and stakeholder workshops. Essential UAT payments experience. Required SQL reporting and Agile delivery.",
    ),
    evidence: "Supported requirements analysis and stakeholder workshops.",
    expected: "Consider",
  },
  {
    id: "DQ-009",
    name: "one matched requirement is insufficient for apply",
    description: complete(
      "Required TypeScript Node delivery. Essential PostgreSQL secure API experience. Required cloud automation and observability.",
    ),
    evidence: "Delivered TypeScript Node services.",
    expected: "Consider",
  },
  {
    id: "DQ-010",
    name: "strong evidence with two consequential unknowns",
    description: missingSalaryAndSponsor(
      "Required production application support and incident analysis. Essential stakeholder communication experience. Required SQL reporting and service delivery.",
    ),
    evidence:
      "Provided production application support, incident analysis, stakeholder communication, SQL reporting and service delivery.",
    expected: "Consider",
    sponsorshipRequired: true,
    expectedUnknowns: ["Salary", "Vacancy-specific sponsorship wording"],
  },
  {
    id: "DQ-011",
    name: "explicit no sponsorship blocks dependent candidate",
    description: complete(
      "Required requirements analysis and stakeholder workshops. Essential UAT payments experience. Required SQL reporting and Agile delivery.",
      "We cannot provide visa sponsorship for this vacancy.",
    ),
    evidence: matchedEvidence,
    expected: "Skip",
    sponsorshipRequired: true,
  },
  {
    id: "DQ-012",
    name: "no sponsorship wording overrides high coverage",
    description: complete(
      "Required TypeScript Node PostgreSQL delivery. Essential secure API integration experience. Required automated testing and cloud delivery.",
      "No visa sponsorship is available.",
    ),
    evidence:
      "Built TypeScript Node PostgreSQL services, secure API integrations, automated testing and cloud delivery.",
    expected: "Skip",
    sponsorshipRequired: true,
  },
  {
    id: "DQ-013",
    name: "unrelated evidence produces skip",
    description: complete(
      "Required TypeScript Node PostgreSQL delivery. Essential secure API integration experience. Required automated testing and cloud delivery.",
    ),
    evidence: "Retail assistant experienced in stock rotation and cash handling.",
    expected: "Skip",
  },
  {
    id: "DQ-014",
    name: "unsupported senior requirements produce skip",
    description: complete(
      "Required enterprise architecture governance. Essential Kubernetes platform ownership. Required distributed systems leadership.",
    ),
    evidence: "Junior analyst with spreadsheet reporting experience.",
    expected: "Skip",
  },
  {
    id: "DQ-015",
    name: "domain mismatch produces skip",
    description: complete(
      "Required clinical safety governance. Essential medical device regulation experience. Required pharmacovigilance reporting.",
    ),
    evidence: "Software developer with ecommerce frontend experience.",
    expected: "Skip",
  },
  {
    id: "DQ-016",
    name: "empty candidate evidence is insufficient",
    description: complete(
      "Required requirements analysis and stakeholder workshops. Essential UAT payments experience. Required SQL reporting and Agile delivery.",
    ),
    evidence: "",
    expected: "Insufficient information",
  },
  {
    id: "DQ-017",
    name: "whitespace candidate evidence is insufficient",
    description: complete(
      "Required TypeScript Node PostgreSQL delivery. Essential secure API integration experience.",
    ),
    evidence: "   ",
    expected: "Insufficient information",
  },
  {
    id: "DQ-018",
    name: "thin vacancy with one requirement is insufficient",
    description: complete(
      "Required requirements analysis and stakeholder workshops. Join a collaborative European delivery team supporting customer outcomes.",
    ),
    evidence: matchedEvidence,
    expected: "Insufficient information",
  },
  {
    id: "DQ-019",
    name: "vacancy without structured requirements is insufficient",
    description: complete(
      "Join our collaborative team to improve customer outcomes across a growing European financial technology platform.",
    ),
    evidence: matchedEvidence,
    expected: "Insufficient information",
  },
  {
    id: "DQ-020",
    name: "single essential statement is insufficient",
    description: complete(
      "Essential SQL reporting and stakeholder communication experience for a growing regulated payments organisation.",
    ),
    evidence: "Delivered SQL reporting and stakeholder communication.",
    expected: "Insufficient information",
  },
  {
    id: "DQ-021",
    name: "missing salary never becomes salary rejection",
    description: missingSalaryAndSponsor(
      "Required requirements analysis and stakeholder workshops. Essential UAT payments experience. Required SQL reporting and Agile delivery.",
    ),
    evidence: matchedEvidence,
    expected: "Consider",
    sponsorshipRequired: true,
    expectedUnknowns: ["Salary"],
    forbiddenCriticalRisk: "Salary unsuitable",
  },
  {
    id: "DQ-022",
    name: "silent sponsorship never becomes confirmed sponsorship",
    description: missingSalaryAndSponsor(
      "Required TypeScript Node PostgreSQL delivery. Essential secure API integration experience. Required automated testing and cloud delivery.",
    ),
    evidence:
      "Built TypeScript Node PostgreSQL services, secure API integrations, automated testing and cloud delivery.",
    expected: "Consider",
    sponsorshipRequired: true,
    expectedUnknowns: ["Vacancy-specific sponsorship wording"],
  },
  {
    id: "DQ-023",
    name: "not specified sponsorship phrase remains unknown",
    description: missingSalaryAndSponsor(
      "Required production application support and incident analysis. Essential stakeholder communication experience. Required SQL reporting and service delivery. Sponsorship is not specified.",
    ),
    evidence:
      "Provided production application support, incident analysis, stakeholder communication, SQL reporting and service delivery.",
    expected: "Consider",
    sponsorshipRequired: true,
    expectedUnknowns: ["Vacancy-specific sponsorship wording"],
  },
  {
    id: "DQ-024",
    name: "unknown sponsorship phrase remains unknown",
    description: missingSalaryAndSponsor(
      "Required systems analysis and requirements documentation. Essential API integration experience. Required stakeholder delivery and UAT. Visa sponsorship is unknown.",
    ),
    evidence:
      "Led systems analysis, requirements documentation, API integration, stakeholder delivery and UAT.",
    expected: "Consider",
    sponsorshipRequired: true,
    expectedUnknowns: ["Vacancy-specific sponsorship wording"],
  },
  {
    id: "DQ-025",
    name: "no sponsorship dependency avoids false block",
    description: complete(
      "Required requirements analysis and stakeholder workshops. Essential UAT payments experience. Required SQL reporting and Agile delivery.",
      "We cannot provide visa sponsorship for this vacancy.",
    ),
    evidence: matchedEvidence,
    expected: "Apply",
    sponsorshipRequired: false,
  },
  {
    id: "DQ-026",
    name: "repeatable apply decision",
    description: complete(
      "Required requirements analysis and stakeholder workshops. Essential UAT payments experience. Required SQL reporting and Agile delivery.",
    ),
    evidence: matchedEvidence,
    expected: "Apply",
    repeat: true,
  },
  {
    id: "DQ-027",
    name: "repeatable consider decision",
    description: missingSalaryAndSponsor(
      "Required TypeScript Node PostgreSQL delivery. Essential secure API integration experience. Required automated testing and cloud delivery.",
    ),
    evidence:
      "Built TypeScript Node PostgreSQL services, secure API integrations, automated testing and cloud delivery.",
    expected: "Consider",
    sponsorshipRequired: true,
    repeat: true,
  },
  {
    id: "DQ-028",
    name: "repeatable skip decision",
    description: complete(
      "Required enterprise architecture governance. Essential Kubernetes platform ownership. Required distributed systems leadership.",
    ),
    evidence: "Junior analyst with spreadsheet reporting experience.",
    expected: "Skip",
    repeat: true,
  },
  {
    id: "DQ-029",
    name: "repeatable sponsorship conflict",
    description: complete(
      "Required systems analysis and requirements documentation. Essential API integration experience. Required stakeholder delivery and UAT.",
      "We are unable to provide visa sponsorship.",
    ),
    evidence:
      "Led systems analysis, requirements documentation, API integration, stakeholder delivery and UAT.",
    expected: "Skip",
    sponsorshipRequired: true,
    repeat: true,
  },
  {
    id: "DQ-030",
    name: "repeatable insufficient information",
    description: complete(
      "Required SQL reporting and stakeholder communication experience for a growing regulated payments organisation.",
    ),
    evidence: "Delivered SQL reporting and stakeholder communication.",
    expected: "Insufficient information",
    repeat: true,
  },
];

assert.equal(cases.length, 30, "The decision-quality benchmark must contain exactly 30 cases.");
assert.equal(new Set(cases.map((item) => item.id)).size, 30, "Every benchmark case needs a unique ID.");

let failed = 0;

for (const scenario of cases) {
  try {
    const job = extractJob({ description: scenario.description });
    const options = { sponsorshipRequired: scenario.sponsorshipRequired ?? false };
    const result = analyseJob(job, scenario.evidence, options);

    assert.equal(
      result.decision,
      scenario.expected,
      `${scenario.id} ${scenario.name}: expected ${scenario.expected}, received ${result.decision}. Reason: ${result.reason}`,
    );

    for (const unknown of scenario.expectedUnknowns ?? []) {
      assert.ok(
        result.unknowns.includes(unknown),
        `${scenario.id} must retain unknown: ${unknown}`,
      );
    }

    if (scenario.forbiddenCriticalRisk) {
      assert.notEqual(
        result.criticalRisk,
        scenario.forbiddenCriticalRisk,
        `${scenario.id} promoted an unknown into a negative fact`,
      );
    }

    if (scenario.repeat) {
      const repeated = analyseJob(job, scenario.evidence, options);
      assert.deepEqual(
        {
          capability: repeated.capability,
          confidence: repeated.confidence,
          coverage: repeated.coverage,
          criticalRisk: repeated.criticalRisk,
          decision: repeated.decision,
          nextAction: repeated.nextAction,
          positiveEvidence: repeated.positiveEvidence,
          reason: repeated.reason,
          unknowns: repeated.unknowns,
        },
        {
          capability: result.capability,
          confidence: result.confidence,
          coverage: result.coverage,
          criticalRisk: result.criticalRisk,
          decision: result.decision,
          nextAction: result.nextAction,
          positiveEvidence: result.positiveEvidence,
          reason: result.reason,
          unknowns: result.unknowns,
        },
        `${scenario.id} produced inconsistent material output`,
      );
    }

    console.log(`ok - ${scenario.id} - ${scenario.name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${scenario.id} - ${scenario.name}`);
    console.error(error);
  }
}

console.log(`Decision-quality benchmark: ${cases.length - failed}/${cases.length} passed`);

if (failed > 0) {
  process.exitCode = 1;
}
