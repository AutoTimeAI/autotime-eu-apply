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
// This is intentionally a starter corpus of 2, not the 30-50 cases the
// validation plan ultimately needs - building that fully belongs after
// slice selection, per the plan's own anti-speculation instruction.
// These two exist to prove the harness runs against real vacancy text
// end to end.

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
];
