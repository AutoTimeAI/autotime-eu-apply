# AutoTime authenticated product UX audit

Date: 1 August 2026

## Product promise

Choose the right European technology roles, avoid unsuitable vacancies, prepare
evidence-backed applications and improve from real outcomes.

## Audit scope

The audit covered every authenticated route, the shared dashboard shell,
`DashboardExperience`, International, Role Pathways, Settings and Extension.
Baseline screenshots are stored in `screenshots/product-ux-before`.

## Principal findings

1. **The route model does not match the mental model.** Thirteen dashboard URLs
   mostly select modes in one large client component. Jobs/Match Score,
   Applications/Inbox/Follow-ups/Insights and
   Profile/Autofill/CV Tailor/Answers overlap in terminology and state.
2. **Four product shells compete.** DashboardExperience, International, Role
   Pathways and the server-rendered Settings/Extension pages use different
   headings, panels, empty states and action language.
3. **First value is blocked.** The 90% profile gate disables Jobs,
   Applications, Interviews and Insights. A new user cannot choose either
   promised first-value path without completing a long profile.
4. **Home explains the system more than the user's next action.** Locked
   process panels dominate attention while career lane, active job,
   application attention and country state are not presented as one brief.
5. **Workflow continuity is weak.** Selecting a pathway does not open a
   role-filtered job capture; a viable job does not become a single application
   workspace; an interview is not always entered from its application.
6. **Operational detail is overexposed.** Extension sync proof, schema-style
   terminology and technical evidence frequently compete with the primary task.
7. **Status language varies.** Fit, evidence, workflow and application modules
   use overlapping labels with different meanings.
8. **The visual system is capable but diffuse.** Useful tokens and accessible
   controls exist, but many one-off card, panel and heading treatments produce
   excess density and nested surfaces.

## Route and purpose inventory

| Current route                    | Current purpose                    | Target destination          |
| -------------------------------- | ---------------------------------- | --------------------------- |
| `/dashboard`                     | Overview and workflow gate         | Home                        |
| `/dashboard/role-pathways`       | Career recommendations and lanes   | Career Direction            |
| `/dashboard/jobs`                | Job capture and analysis workspace | Jobs                        |
| `/dashboard/match-score`         | Deep link to fit analysis          | Jobs / Analysis tab         |
| `/dashboard/inbox`               | Captured job inbox                 | Jobs / Saved tab            |
| `/dashboard/applications`        | Application tracker                | Applications                |
| `/dashboard/applications/[id]`   | Selected application detail        | Application workspace       |
| `/dashboard/application-answers` | Reusable/screening answers         | Application workspace       |
| `/dashboard/cv-tailor`           | CV tailoring mode                  | Application workspace       |
| `/dashboard/follow-ups`          | Follow-up view                     | Applications / Attention    |
| `/dashboard/insights`            | Outcome reporting                  | Applications / Outcomes     |
| `/dashboard/interview`           | Interview preparation              | Interviews                  |
| `/dashboard/international`       | Country and mobility evidence      | Countries                   |
| `/dashboard/autofill-profile`    | Confirmed profile evidence         | Profile                     |
| `/dashboard/profile`             | Profile alias                      | Profile                     |
| `/dashboard/settings`            | Account and data controls          | Utility / Settings          |
| `/dashboard/extension`           | Extension operations               | Utility / Job capture setup |

Old URLs should remain compatible aliases until analytics and support evidence
show they can be removed.

## Duplicate and conflicting state

| Information        | Existing source(s)                                             | Risk                            | Direction                                           |
| ------------------ | -------------------------------------------------------------- | ------------------------------- | --------------------------------------------------- |
| Candidate facts/CV | Dashboard browser state, profile sync table                    | Browser/cloud divergence        | Treat confirmed profile as source; browser is cache |
| Target roles       | Candidate profile, Role Pathways lanes                         | Competing target concepts       | Career lanes control future recommendations         |
| Countries          | Candidate profile, mobility profile, Role Pathways preferences | Repeated questions              | Mobility/profile country facts feed all consumers   |
| Salary             | Candidate profile, mobility profile, pathway preference        | Different formats               | Normalise once; preserve evidence source            |
| Sponsorship        | Candidate profile and mobility profile                         | Boolean versus governed status  | Mobility profile is governed source                 |
| Jobs/applications  | Application records and local dashboard state                  | Job and application blurred     | One job record with lifecycle state                 |
| Evidence           | CV text, project fields, evidence records, pathway evidence    | Confirmation status can diverge | One confirmed evidence ledger                       |

## Technical constraints

- `DashboardExperience.tsx` is a large client component with multiple
  workspace modes. A safe redesign must extract one workflow at a time.
- Several routes are aliases rather than independent pages.
- Authenticated server routes and local-browser fallbacks both exist.
- The existing profile protocol is a business rule; changing it requires a
  separate product decision and regression work.
- No production migration is authorised in this redesign.

## Phase 1 decision

A repository-wide rewrite would be unsafe. Phase 2 therefore establishes one
shell, navigation vocabulary, tokens and reusable primitives. Phase 3 should
extract the primary workflow incrementally while keeping aliases working.
