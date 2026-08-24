import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const records = [];

async function filesBelow(relative, predicate) {
  const found = [];
  async function visit(current) {
    for (const entry of await readdir(path.join(root, current), {
      withFileTypes: true,
    })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (predicate(child)) found.push(child.replaceAll("\\", "/"));
    }
  }
  await visit(relative);
  return found.sort();
}

function add(record) {
  records.push({
    test_id: record.test_id,
    test_type: record.test_type,
    category: record.category,
    title: record.title,
    automation: record.automation,
    priority: record.priority ?? "P1",
    environment: record.environment ?? "local-frozen",
    preconditions:
      record.preconditions ?? "Frozen candidate dependencies installed",
    steps: record.steps,
    expected_result: record.expected_result,
    actual_result: "Not executed against frozen candidate",
    status: record.status ?? "NOT RUN",
    evidence: "",
  });
}

const playwrightFiles = await filesBelow("tests", (file) =>
  file.endsWith(".spec.ts"),
);
let e2eCounter = 1;
for (const file of playwrightFiles) {
  const source = await readFile(path.join(root, file), "utf8");
  const pattern = /(?:test|authenticatedTest)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  let match;
  while ((match = pattern.exec(source))) {
    const visual = file.includes("/visual/");
    const accessibility =
      /axe|accessib/i.test(source) && /accessib|smoke/i.test(match[1]);
    add({
      test_id: `${visual ? "VIS" : accessibility ? "A11Y" : "E2E"}-${String(e2eCounter++).padStart(3, "0")}`,
      test_type: visual
        ? "Visual regression"
        : accessibility
          ? "Accessibility"
          : "End-to-end",
      category: file.includes("/production/")
        ? "Production smoke"
        : "Browser workflow",
      title: match[1],
      automation: "Automated",
      environment: file.includes("/production/")
        ? "production-safe"
        : "local-frozen",
      steps: `Run Playwright test declared in ${file}`,
      expected_result:
        "All declared assertions pass and the command exits cleanly",
      status: file.includes("/production/") ? "BLOCKED" : "NOT RUN",
    });
  }
}

const nodeFiles = [
  ...(await filesBelow("apps/web/tests", (file) => file.endsWith(".test.mjs"))),
  ...(await filesBelow("scripts", (file) => file.endsWith(".test.mjs"))),
];
let unitCounter = 1;
for (const file of nodeFiles) {
  const source = await readFile(path.join(root, file), "utf8");
  const matches = [
    ...source.matchAll(/(?:test|it)\s*\(\s*["'`]([^"'`]+)["'`]/g),
  ];
  const titles = matches.length
    ? matches.map((match) => match[1])
    : [path.basename(file)];
  for (const title of titles) {
    const security =
      /auth|security|privacy|ssrf|redirect|isolation|admin|injection|credit|stripe|rate/i.test(
        `${file} ${title}`,
      );
    add({
      test_id: `${security ? "SEC" : "UNIT"}-${String(unitCounter++).padStart(3, "0")}`,
      test_type: security ? "Security/static analysis" : "Unit/integration",
      category: security ? "Security control" : "Application logic",
      title,
      automation: "Automated",
      steps: `Run the repository command covering ${file}`,
      expected_result: "All assertions pass with no unexpected side effects",
    });
  }
}

const mandatory = [
  [
    "SCN-001",
    "Scenario-based",
    "New-user journey",
    "Complete synthetic new-user journey",
    "test",
    "BLOCKED",
  ],
  [
    "SCN-002",
    "Negative",
    "Evidence safety",
    "Block incomplete evidence and unsupported claims",
    "test",
    "BLOCKED",
  ],
  [
    "DB-RLS-001",
    "Authentication/session",
    "RLS",
    "User A cannot read User B records",
    "local-db",
    "BLOCKED",
  ],
  [
    "SEC-ADMIN-001",
    "API",
    "Admin permissions",
    "Ordinary user cannot invoke admin operations",
    "local-db",
    "BLOCKED",
  ],
  [
    "AI-CREDIT-001",
    "State-transition",
    "AI credits",
    "Successful reserve and confirm lifecycle",
    "local-db",
    "BLOCKED",
  ],
  [
    "AI-CREDIT-002",
    "State-transition",
    "AI credits",
    "Failed AI call releases or refunds reserve",
    "local-db",
    "BLOCKED",
  ],
  [
    "AI-CREDIT-003",
    "Reliability/resilience",
    "AI concurrency",
    "Concurrent AI reservations cannot overspend",
    "local-db",
    "BLOCKED",
  ],
  [
    "AI-SAFE-001",
    "Negative",
    "Prompt injection",
    "Prompt-injection input cannot override safety/evidence rules",
    "test",
    "BLOCKED",
  ],
  [
    "INGEST-001",
    "Integration",
    "Ingestion",
    "Repeated ingestion is authenticated and deduplicated",
    "local-db",
    "BLOCKED",
  ],
  [
    "PAY-001",
    "Integration",
    "Stripe",
    "Test-mode signed webhook replay is idempotent",
    "local-db",
    "BLOCKED",
  ],
  [
    "PRIV-001",
    "Scenario-based",
    "Privacy",
    "Consent denial prevents analytics capture",
    "local-frozen",
    "NOT RUN",
  ],
  [
    "PRIV-002",
    "API",
    "Privacy",
    "Account export returns only requesting user's data",
    "local-db",
    "BLOCKED",
  ],
  [
    "PRIV-003",
    "State-transition",
    "Privacy",
    "Account deletion removes/anonymises scoped data",
    "local-db",
    "BLOCKED",
  ],
  [
    "OPS-001",
    "Backup/recovery/rollback",
    "Backup",
    "Backup availability verified",
    "production-safe",
    "BLOCKED",
  ],
  [
    "OPS-002",
    "Backup/recovery/rollback",
    "Restoration",
    "Controlled isolated restoration succeeds",
    "test",
    "BLOCKED",
  ],
  [
    "OPS-003",
    "Backup/recovery/rollback",
    "Rollback",
    "Deployment rollback and SHA verification succeed",
    "production-safe",
    "BLOCKED",
  ],
  [
    "MON-001",
    "Monitoring/alerting",
    "Redaction",
    "Synthetic alert arrives without secrets or personal data",
    "test",
    "BLOCKED",
  ],
  [
    "EXT-SEC-001",
    "Contract/schema",
    "Extension",
    "Supported and unsupported sites follow declared matrix",
    "local-frozen",
    "NOT RUN",
  ],
  [
    "EXT-SEC-002",
    "Negative",
    "Extension",
    "Invalid origin/message/session is rejected safely",
    "local-frozen",
    "NOT RUN",
  ],
  [
    "PEN-001",
    "Security/penetration testing",
    "OWASP",
    "Founder-led OWASP Top 10 and API Top 10 assessment",
    "test",
    "BLOCKED",
  ],
  [
    "PERF-001",
    "Performance/load",
    "Lighthouse",
    "Public pages meet configured Lighthouse thresholds",
    "local-frozen",
    "NOT RUN",
  ],
  [
    "PERF-002",
    "Performance/load",
    "Safe load",
    "Bounded local k6-style smoke without production traffic",
    "local-frozen",
    "BLOCKED",
  ],
  [
    "UAT-001",
    "User-acceptance",
    "Founder UAT",
    "Founder completes representative private-beta workflow",
    "test",
    "BLOCKED",
  ],
  [
    "EXP-001",
    "Exploratory",
    "Founder exploratory",
    "Time-boxed exploratory workflow and error-state review",
    "test",
    "BLOCKED",
  ],
];
for (const [id, type, category, title, environment, status] of mandatory) {
  add({
    test_id: id,
    test_type: type,
    category,
    title,
    automation:
      id.startsWith("UAT") || id.startsWith("EXP") || id.startsWith("PEN")
        ? "Manual"
        : "Automated/manual",
    priority: "P0",
    environment,
    preconditions:
      "Frozen candidate and authorised isolated fixtures/integrations",
    steps:
      "Follow the exact scenario procedure in the execution manifest or assessment plan",
    expected_result:
      "Control behaves safely and produces structured reproducible evidence",
    status,
  });
}

const fields = Object.keys(records[0]);
const csvEscape = (value) => `"${String(value).replaceAll('"', '""')}"`;
const csv =
  [
    fields.join(","),
    ...records.map((record) =>
      fields.map((field) => csvEscape(record[field])).join(","),
    ),
  ].join("\n") + "\n";
await writeFile(path.join(root, "docs/qa/test-cases.csv"), csv);
await writeFile(
  path.join(root, "docs/qa/test-cases.json"),
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      default_result_policy:
        "Definitions are NOT RUN/BLOCKED until indexed frozen-SHA evidence exists",
      test_cases: records,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Generated ${records.length} canonical test cases`);
