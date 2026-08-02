# AutoTime product information architecture

## Primary navigation

1. **Home** — next action, attention items, current career lane, evidence and
   country blockers.
2. **Career Direction** — Role Pathways, confirmed evidence summary, primary
   and secondary lanes, transition plan and gaps.
3. **Jobs** — capture, saved jobs, suitability analysis and country filters.
4. **Applications** — selected-job workspace, preparation and pipeline.
5. **Interviews** — job-linked interview preparation and revision actions.
6. **Countries** — mobility profile, country facts, official evidence and
   freshness.
7. **Profile** — confirmed evidence, preferences and progressive completion.

Settings, help, notifications, billing, extension setup and data controls are
utilities rather than workflow destinations.

## End-to-end workflow

```text
Minimal evidence or CV
  -> Career Direction or first job
  -> Capture a job
  -> Analyse viability
  -> Prepare application
  -> Review and mark applied
  -> Track response
  -> Prepare for interview
  -> Record outcome
  -> Improve evidence and targeting
```

## Contextual continuity

- Career lane -> “Analyse a job for this role”
- Saved job -> “Analyse job”
- Apply recommendation -> “Prepare application”
- Ready application -> “Review before applying”
- Applied -> “Add follow-up date”
- Interview stage -> “Prepare for this interview”
- Rejected -> “Record the outcome”

## Page contract

Every primary destination should contain, in order:

1. purpose and current context;
2. one dominant action;
3. working content;
4. useful empty/loading/failure state;
5. previous and next workflow action;
6. progressive evidence/source disclosure.

## Onboarding target

Onboarding is resumable and collects only CV/evidence, target countries,
support requirement and broad preferences before offering Role Pathways or Job
Analysis. Remaining profile fields are progressive.

Phase 3A implements this target on Home. All seven authenticated destinations
remain visible; missing information is handled inside the selected context
rather than by a universal Profile redirect.

## Phase 3B implementation

Jobs and Applications now use contextual list/detail workspaces. Job detail
contains Overview, Analysis, Application and Activity; application detail owns
the ordered review and submission-recording workflow. Legacy Match Score,
Inbox, CV Tailor, Answers, Documents and Follow-ups URLs redirect to these
destinations while extension contracts remain compatible.
