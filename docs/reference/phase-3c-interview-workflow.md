# Phase 3C: job-linked interview preparation and outcomes

## Routes and ownership

The consolidated destination is /dashboard/interviews and owned detail records use /dashboard/interviews/[interviewId]. The legacy singular route redirects without exposing the old standalone generator. Every interview stores the authenticated user UUID plus an existing Phase 3B application and job ID; lookups require the exact same user ID.

Browser storage is versioned development data, isolated by user ID. It is not durable or cross-device production persistence.

## Question generation

Stage, job requirements, the latest analysis version, application evidence state and selected CV version deterministically control category coverage, evidence status, priority and readiness. Recruiter, technical, behavioural, case, panel and final stages have different coverage. Identical structured input has identical coverage and stable, deduplicated question IDs. Each question records origin and preparation version.

INTERVIEW_PREP_AI_MODE=mock returns deterministic wording. The optional nvidia mode is server-only and requires explicit configuration. Validated AI output can replace wording only for known question IDs; it cannot change sources, evidence status, importance, readiness, interview facts or outcomes. Deterministic questions remain available when AI fails.

## Evidence and readiness

Answers retain selected source IDs, missing evidence, unsupported claims, confirmation, answer status, answer structure and saved versions. Behavioural and scenario answers use STAR-L guidance; technical answers use context, approach, trade-offs, implementation, validation and outcome. Inferred or education evidence is not presented as production experience. Missing results remain unspecified.

Readiness labels are Getting started, Needs attention, Good coverage and Ready for review. Ready for review requires high-priority coverage, an interviewer question, acknowledged evidence gaps, no unsupported claims and explicit final review. Readiness areas remain visible rather than becoming an unexplained percentage. Confidence is a practice self-rating, never a success probability.

Refreshing preparation creates a new preparation version and stores the previous question plan. It never silently replaces a user-confirmed answer.

## Application and outcomes

Creation is allowed only from Applied or Interview. Applied moves to Interview through the domain transition. Progressed and no response retain Interview; offer, rejected, withdrawn and cancelled remain distinct outcomes, with applicable pipeline mappings. A progressed outcome exposes creation of the next stage and preserves the earlier interview. Invalid transitions are rejected. Job-analysis history and application document versions are not rewritten. Application detail lists its linked interviews.

Employer-confirmed reasons, user interpretations and unknown reasons remain separate. Learning signals describe recorded information and never infer why an employer rejected someone.

## Home priority and optional audio

Home deterministically prioritises imminent incomplete interviews, final review, completed interviews awaiting outcome and progressed interviews needing a next stage before normal Jobs/Application actions. Real timestamps and stored timezone context govern imminent scheduling.

Existing audio capability remains optional future integration. Any listening export must be user-requested, tied to one preparation version, exclude unsupported claims and remain practice material rather than a new destination. Phase 3C does not add voice scoring or speech analysis.

## Privacy and future persistence

No answer, evidence, notes, participant details, meeting information, immigration answer or generated script is sent to analytics. Potential interview workflow events remain documentation-only and were not added to either pending admin migration.

A reviewed Supabase model should use interviews linked to applications and jobs, interview_questions, interview_answer_versions, interview_practice_state, interview_outcomes and interview_follow_up_actions. RLS must bind every traversal to auth.uid(). Sensitive text needs bounded fields, retention review and audit-safe access. No Phase 3C migration was created.

## Accessibility and acceptance

The workspace uses headings, tab and tabpanel semantics, roving tab focus with arrow/Home/End keys, labelled confidence controls, live status announcements and text status labels. Remaining manual checks are screen-reader phrasing across saved-answer states, 200% zoom, reduced-motion behaviour and focus restoration if creation later becomes a modal.
