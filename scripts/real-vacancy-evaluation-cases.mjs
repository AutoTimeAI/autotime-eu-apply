// Real-vacancy case corpus for the LandWell validation programme
// (docs/reference/landwell-master-execution-plan.md item C).
//
// Each case's `vacancyText` is the actual posting text captured verbatim
// from a live job board (source + capture date recorded below) - not a
// fabricated template like scripts/decision-quality-evaluation.test.mjs
// uses. `candidateEvidence` is synthetic (no real candidate has been
// paired with these postings yet; that only happens once a slice is
// chosen per docs/investigations/slice-selection-interview-kit.md).
//
// This is intentionally a small starter corpus, not the 30-50 cases the
// validation plan ultimately needs - building that fully belongs after
// slice selection, per the plan's own anti-speculation instruction.
// These exist to prove the harness runs against real vacancy text end
// to end.
//
// RV-003 through RV-006 source from
// docs/investigations/ireland-software-vacancy-10-case-ledger-2026-09-17.md
// (Codex's real-posting source ledger for the provisional "sponsorship-
// required backend/software engineer, Ireland" slice hypothesis - itself
// still unvalidated, see that doc and
// docs/investigations/synthetic-tech-candidate-discovery-rehearsal-2026-09-17.md).
// Chosen to cover four distinct sponsorship-signal categories from that
// ledger's taxonomy: silence (V01), conflicting/ambiguous form wording
// (V02), company-level-not-vacancy-specific (V04), and an explicit hard
// negative (V07). V03 (Tripadvisor) is excluded: its ledger link now
// redirects to a generic board, a stale-posting control per the ledger's
// own note, not a live case.

export const realVacancyCases = [
  {
    id: "RV-001",
    company: "MOTOR Ai",
    roleTitle: "Data Engineer (m/f/d)",
    location: "Berlin, Germany",
    sourceUrl: "https://www.arbeitnow.com/jobs/companies/motor-ai/data-engineer-berlin-366460",
    capturedAt: "2026-09-16",
    sponsorshipSignal: "silent",
    vacancyText: `Job title: Data Engineer (m/f/d)
Company: MOTOR Ai
Location: Berlin, Germany

Overview
MOTOR Ai seeks a Data Engineer to support the deployment of Level 4 autonomous systems in Germany and beyond. The role focuses on building infrastructure for AI and machine learning operations.

Key Responsibilities
- Design and maintain data pipelines for AI/ML use cases
- Ensure training and inference data is correctly structured, versioned, and accessible
- Implement monitoring and validation for data quality
- Build internal tooling to automate data preparation tasks
- Collaborate with AI Engineers and Data Scientists on data requirements

Requirements
- Degree in computer science, data engineering, or related field (or equivalent experience)
- 6+ years as a Data Engineer
- Experience with data warehouses, data lakes, and production systems
- Strong Python and SQL proficiency
- Hands-on experience with TensorFlow and/or PyTorch at scale
- Experience with large datasets and hybrid cloud/on-premise infrastructure
- Data annotation and external service provider collaboration experience
- Fluent English is required; German is a plus

Benefits
- Flexible working hours accommodating parenthood, caregiving responsibilities
- Corporate benefits program
- Public transport subsidy
- Professional development funding
- Location in Wedding with very good public transport connections
- Commitment to diversity

The company emphasizes on-site collaboration over remote work.`,
    candidateEvidence:
      "8 years as a Data Engineer building production data pipelines and data warehouses on AWS. Strong Python and SQL. Hands-on PyTorch experience training and serving models at scale. Fluent English, conversational German (A2).",
  },
  {
    id: "RV-002",
    company: "Emma - The Sleep Company",
    roleTitle: "Analytics Engineer, Data Platform",
    location: "Frankfurt, Germany",
    sourceUrl:
      "https://www.arbeitnow.com/jobs/companies/emma-the-sleep-company/analytics-engineer-data-platform-frankfurt-156939",
    capturedAt: "2026-09-16",
    sponsorshipSignal: "silent",
    vacancyText: `Job title: Analytics Engineer, Data Platform
Company: Emma - The Sleep Company
Location: Frankfurt, Germany
Employment Type: Permanent - Full Time

Job Description
Emma - The Sleep Company, founded in 2015, is the world's largest direct-to-consumer sleep brand operating in over 20 markets with 35+ stores across Europe. The company seeks to develop sleep comfort products that empower our customers to awaken their best every day.

You'll join a Data Platform Team supporting analysts, analytics engineers, data scientists, and data engineers. The mission focuses on making data work faster, safer, and more reliable through observability, access control, engineering standards, and AI adoption across the full pipeline.

Key Responsibilities
Reliability, Standards & Governance
- Own monitoring, alerting, and observability across the data platform
- Contribute to architecture discussions and document trade-offs
- Set and enforce engineering standards across lakehouse, orchestration, data warehouse, and reporting systems

Enablement & Internal Tooling
- Write guides, standards, and documentation for data domain colleagues
- Build internal tooling to remove friction for teams served
- Support AI adoption within data infrastructure

Hands-On Pipeline & Model Development
- Enhance Redshift data warehouse using dbt and Paradime
- Orchestrate pipeline dependencies using MWAA and Paradime
- Contribute to ingestion pipelines (ELT, containerized Python, event-based) landing data into medallion lakehouse

Requirements
- 3+ years in data platform, data engineering, analytics engineering, or DataOps roles
- Breadth over depth across data stack technologies
- Strong SQL and Python skills with deep database knowledge
- AWS data stack experience (Redshift, S3, IAM, Athena, Glue)
- Lakehouse architecture knowledge (Apache Iceberg, Delta)
- Pipeline orchestration experience (Apache Airflow or equivalent)
- Infrastructure as Code experience (Pulumi, Terraform)
- Strong communication and documentation abilities
- Initiative and autonomy for independent work
- Fluent English; based in Europe with workable timezone overlap

Benefits
- Maturing Scale-Up environment blending startup agility with scalable impact
- Ownership and accountability in role development
- 70/20/10 learning model with trainings and coaching
- Selective hiring ensuring collaborative team culture
- Global collaboration across 60+ nationalities
- Remote work flexibility (requires Portugal or Germany base)`,
    candidateEvidence:
      "3 years as an Analytics Engineer on AWS, using Redshift, dbt and Airflow. Built Terraform-managed infrastructure and Iceberg-based lakehouse ingestion pipelines. Strong SQL and Python. Fluent English, based in Portugal.",
  },
  {
    id: "RV-003",
    company: "Dun & Bradstreet",
    roleTitle: "Senior Software Engineer (R-19525)",
    location: "Dublin, Ireland",
    sourceUrl: "https://jobs.lever.co/dnb/15b7a0ec-2c39-469a-b0e2-4bb756a13f8e",
    capturedAt: "2026-09-17",
    sponsorshipSignal: "silent",
    vacancyText: `Job title: Senior Software Engineer (R-19525)
Company: Dun & Bradstreet
Location: Dublin, Ireland
Employment Type: Full Time, Hybrid

Key Responsibilities
The role focuses on designing and developing modern RESTful APIs within the Prime team. Responsibilities include developing platform capabilities, validating solutions through prototypes, writing maintainable code, and mentoring junior team members. The posting emphasizes exploring practical uses of AI-assisted engineering tools to improve developer productivity.

Requirements
- Bachelor's degree in computer science or related field
- 6+ years commercial software development experience
- Web Service APIs experience using Java and Spring
- Cloud platform experience (GCP or AWS)
- Collaborative problem-solving skills
- Interest in emerging technologies including AI-assisted development

No specific mention of visa sponsorship or work eligibility requirements appears in this posting. The company notes it may use AI tools in hiring but emphasizes that final hiring decisions are ultimately made by humans.`,
    candidateEvidence:
      "7 years commercial software development experience, primarily Java and Spring building RESTful APIs. AWS cloud platform experience. Mentored junior engineers. Non-EU citizen, requires employer sponsorship to work in Ireland.",
    targetCountry: "Ireland",
  },
  {
    id: "RV-004",
    company: "Gong.io",
    roleTitle: "Senior Backend Engineer",
    location: "Dublin, Ireland",
    sourceUrl: "https://job-boards.greenhouse.io/gongio/jobs/4684215006",
    capturedAt: "2026-09-17",
    sponsorshipSignal: "conflicting",
    vacancyText: `Job title: Senior Backend Engineer
Company: Gong.io
Location: Dublin

Key Requirements
- 7+ years hands-on backend development experience with strong Java expertise
- Proven mentoring experience for engineers
- Cloud platform proficiency (AWS, Azure, or Google Cloud)
- Microservices architecture knowledge
- Strong problem-solving and communication abilities
- Bachelor's degree in Computer Science or related field (preferred)

Primary Responsibilities
The role involves designing scalable backend services, owning feature lifecycles end-to-end, and establishing engineering standards.

Work Arrangement
We operate a hybrid model 3 days a week in office.

Employment Eligibility
The posting specifies: You must be eligible to work in Ireland. The application form asks candidates about their legal authorization to work in Ireland and whether they require sponsorship for immigration-related employment benefits.

Company Overview
Gong provides AI-powered revenue intelligence software serving over 5,000 companies globally.`,
    candidateEvidence:
      "8 years backend development experience, strong Java, microservices on AWS. Led feature delivery end-to-end and set engineering standards for a 6-person team. Non-EU citizen, requires employer sponsorship to work in Ireland.",
    targetCountry: "Ireland",
  },
  {
    id: "RV-005",
    company: "Fin (part of Salesforce)",
    roleTitle: "Senior Software Engineer",
    location: "Dublin, Ireland",
    sourceUrl: "https://job-boards.greenhouse.io/intercom/jobs/5082494",
    capturedAt: "2026-09-17",
    sponsorshipSignal: "company-level-not-vacancy-specific",
    vacancyText: `Job title: Senior Software Engineer
Company: Fin (now part of Salesforce)
Location: Dublin, Ireland
Work Model: Hybrid (3 days per week in office required)

About the Role
Fin seeks an experienced engineer to solve customer problems through technical expertise. You'll join a multidisciplinary team building backend and frontend systems alongside designers, product managers, researchers, and data analysts.

Key Responsibilities
- Develop technical plans and contribute to architecture for products serving tens of millions daily
- Write Ruby code managing AWS, infrastructure, and platform technologies
- Deploy production changes on day one; ship features within the first week
- Mentor engineers and participate in hiring
- Utilize AI-powered developer tools to focus on meaningful problem-solving

Required Qualifications
- 5+ years of industry experience in a software engineering role, preferably building a SaaS product
- Deep knowledge of a high-level programming language (Ruby, Python, Javascript, etc.)
- Experience collaborating with product teams and designers with proven customer value delivery
- Experience with distributed systems

Notable Provisions
Visa Sponsorship: Fin sponsors immigration for some roles so we encourage you to still apply if you require sponsorship.

Equal Opportunity: Salesforce maintains non-discrimination policies and assesses candidates on the basis of merit, competence and qualifications.`,
    candidateEvidence:
      "6 years software engineering experience building a SaaS product, deep Ruby and distributed-systems knowledge, AWS infrastructure. Mentored engineers and participated in hiring. Non-EU citizen, requires employer sponsorship to work in Ireland.",
    targetCountry: "Ireland",
  },
  {
    id: "RV-006",
    company: "Ridgeline",
    roleTitle: "Staff Software Engineer, Trade Order Management",
    location: "Dublin, Ireland",
    sourceUrl: "https://job-boards.greenhouse.io/ridgeline/jobs/7788849003",
    capturedAt: "2026-09-17",
    sponsorshipSignal: "explicit-no",
    vacancyText: `Job title: Staff Software Engineer, Trade Order Management
Company: Ridgeline
Location: Dublin, Ireland
Employment Type: Hybrid (3 days/week in office)

Job Summary
Ridgeline seeks a Staff Software Engineer to build and support high-quality Trade Order Management applications. The role spans the full development lifecycle from design through production support, leveraging AWS and modern backend technologies.

Key Responsibilities
- Contribute technical expertise and design input collaboratively
- Participate across the complete software development lifecycle
- Build, enhance, and maintain scalable applications on AWS
- Troubleshoot production issues and support critical trading workflows
- Mentor fellow engineers and improve system reliability

Requirements
- Computer Science degree or equivalent
- 8+ years software engineering experience
- 6+ years Java/Kotlin (or equivalent modern backend language)
- Design patterns, OOAD, SOLID principles, and automated testing expertise
- Cloud-native application experience, preferably AWS
- Complex problem-solving and root cause analysis skills
- Web front-end knowledge (React, JavaScript, TypeScript)
- Strong communication and cross-team collaboration abilities

Work Authorization
You must be permitted to work in Ireland, including under EU work authorization, without the need for employer sponsorship.

Bonus Qualifications
- Buy-side order management systems experience
- Financial instruments knowledge
- Mathematics background
- FIX/SWIFT protocol experience`,
    candidateEvidence:
      "9 years software engineering experience, 7 years Java/Kotlin backend, AWS cloud-native applications, React/TypeScript front-end knowledge, strong automated-testing background. Non-EU citizen, requires employer sponsorship to work in Ireland.",
    targetCountry: "Ireland",
  },
];
