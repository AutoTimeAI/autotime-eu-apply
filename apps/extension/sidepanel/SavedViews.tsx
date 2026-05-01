import type {
  ApplicationContentDraft,
  CandidateProfile,
  JobAnalysisDraft,
  ReusableAnswers,
  TrackerDraft
} from "../lib/storage"

type SavedViewProps<T> = {
  draft: T | null
  onClear: () => void
}

export function ProfileView({
  draft,
  onClear
}: SavedViewProps<CandidateProfile>) {
  return (
    <section className="panel-section">
      <h2>View Profile</h2>

      {draft ? (
        <>
          <dl className="profile-summary">
            <div>
              <dt>Full name</dt>
              <dd>{draft.fullName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{draft.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{draft.phone}</dd>
            </div>
            <div>
              <dt>Current country</dt>
              <dd>{draft.currentCountry}</dd>
            </div>
            <div>
              <dt>Current city</dt>
              <dd>{draft.currentCity}</dd>
            </div>
            <div>
              <dt>Sponsorship needed</dt>
              <dd>{draft.sponsorshipNeeded ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Relocation willingness</dt>
              <dd>{draft.relocationWillingness}</dd>
            </div>
            <div>
              <dt>Notice period</dt>
              <dd>{draft.noticePeriod}</dd>
            </div>
          </dl>
          <button className="danger-button" type="button" onClick={onClear}>
            Clear Saved Profile
          </button>
        </>
      ) : (
        <p className="empty-state">No saved profile yet.</p>
      )}
    </section>
  )
}

export function ReusableAnswersView({
  draft,
  onClear
}: SavedViewProps<ReusableAnswers>) {
  return (
    <section className="panel-section">
      <h2>View Answers</h2>

      {draft ? (
        <>
          <dl className="profile-summary">
            <div>
              <dt>Sponsorship answer</dt>
              <dd>{draft.sponsorshipAnswer || "None"}</dd>
            </div>
            <div>
              <dt>Relocation answer</dt>
              <dd>{draft.relocationAnswer || "None"}</dd>
            </div>
            <div>
              <dt>Work authorisation answer</dt>
              <dd>{draft.workAuthorisationAnswer || "None"}</dd>
            </div>
            <div>
              <dt>Notice period answer</dt>
              <dd>{draft.noticePeriodAnswer || "None"}</dd>
            </div>
          </dl>
          <button className="danger-button" type="button" onClick={onClear}>
            Clear Saved Answers
          </button>
        </>
      ) : (
        <p className="empty-state">No saved reusable answers yet.</p>
      )}
    </section>
  )
}

export function JobAnalysisView({
  draft,
  onClear
}: SavedViewProps<JobAnalysisDraft>) {
  return (
    <section className="panel-section">
      <h2>View Job Analysis</h2>

      {draft ? (
        <>
          <dl className="profile-summary">
            <div>
              <dt>Job title</dt>
              <dd>{draft.jobTitle}</dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>{draft.company}</dd>
            </div>
            <div>
              <dt>Job URL</dt>
              <dd>
                <a href={draft.jobUrl} target="_blank" rel="noreferrer">
                  {draft.jobUrl}
                </a>
              </dd>
            </div>
            <div>
              <dt>Location/country</dt>
              <dd>{draft.location}</dd>
            </div>
            <div>
              <dt>Work mode</dt>
              <dd>{draft.workMode}</dd>
            </div>
            <div>
              <dt>Fit score</dt>
              <dd>
                {typeof draft.fitScore === "number"
                  ? `${draft.fitScore}/100`
                  : "Not scored"}
              </dd>
            </div>
            <div>
              <dt>Recommendation</dt>
              <dd>{draft.recommendation || "Not scored"}</dd>
            </div>
            <div>
              <dt>Positioning angle</dt>
              <dd>{draft.positioningAngle || "None"}</dd>
            </div>
            <div>
              <dt>Score factors</dt>
              <dd>
                {draft.scoreFactors?.length ? (
                  <ul className="summary-list">
                    {draft.scoreFactors.map((factor) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                ) : (
                  "None"
                )}
              </dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{draft.notes || "None"}</dd>
            </div>
          </dl>
          <button className="danger-button" type="button" onClick={onClear}>
            Clear Saved Job Analysis
          </button>
        </>
      ) : (
        <p className="empty-state">No saved job analysis yet.</p>
      )}
    </section>
  )
}

export function ApplicationContentView({
  draft,
  onClear
}: SavedViewProps<ApplicationContentDraft>) {
  return (
    <section className="panel-section">
      <h2>View Content</h2>

      {draft ? (
        <>
          <dl className="profile-summary">
            <div>
              <dt>Cover letter</dt>
              <dd>{draft.coverLetter}</dd>
            </div>
            <div>
              <dt>Profile summary</dt>
              <dd>{draft.profileSummary}</dd>
            </div>
            <div>
              <dt>Motivation answer</dt>
              <dd>{draft.motivationAnswer}</dd>
            </div>
            <div>
              <dt>Strengths answer</dt>
              <dd>{draft.strengthsAnswer || "None"}</dd>
            </div>
            <div>
              <dt>Availability answer</dt>
              <dd>{draft.availabilityAnswer || "None"}</dd>
            </div>
          </dl>
          <button className="danger-button" type="button" onClick={onClear}>
            Clear Saved Content
          </button>
        </>
      ) : (
        <p className="empty-state">No saved application content yet.</p>
      )}
    </section>
  )
}

export function TrackerView({ draft, onClear }: SavedViewProps<TrackerDraft>) {
  return (
    <section className="panel-section">
      <h2>View Tracker</h2>

      {draft ? (
        <>
          <dl className="profile-summary">
            <div>
              <dt>Role title</dt>
              <dd>{draft.roleTitle}</dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>{draft.company}</dd>
            </div>
            <div>
              <dt>Application URL</dt>
              <dd>
                <a href={draft.applicationUrl} target="_blank" rel="noreferrer">
                  {draft.applicationUrl}
                </a>
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{draft.status}</dd>
            </div>
            <div>
              <dt>Next action</dt>
              <dd>{draft.nextAction}</dd>
            </div>
            <div>
              <dt>Next action date</dt>
              <dd>{draft.nextActionDate}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{draft.notes || "None"}</dd>
            </div>
          </dl>
          <button className="danger-button" type="button" onClick={onClear}>
            Clear Saved Tracker
          </button>
        </>
      ) : (
        <p className="empty-state">No saved tracker draft yet.</p>
      )}
    </section>
  )
}
