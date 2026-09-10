"use client"

import { getMarketLabel } from "../resume-inference"
import type { ContextSuggestion, ContextSuggestionSource } from "../resume-inference"

export function CvReviewSuggestionPanel({
  contextSuggestion,
  contextSuggestionNote,
  contextSuggestionSource,
  isReviewingCv
}: {
  contextSuggestion: ContextSuggestion | null
  contextSuggestionNote: string
  contextSuggestionSource: ContextSuggestionSource
  isReviewingCv: boolean
}) {
  return (
    <>
      {isReviewingCv ? (
        <div className="cv-review-result-panel loading">
          <strong>Reviewing CV</strong>
          <p>
            AutoTime is checking your CV for role focus, candidate context and
            missing work-right evidence.
          </p>
        </div>
      ) : null}
      {contextSuggestion && (
        <article className="suggestion-card cv-review-result-panel">
          <header className="cv-review-result-heading">
            <div>
              <strong>
                {contextSuggestionSource === "ai"
                  ? "Suggestion ready"
                  : contextSuggestionSource === "limit"
                    ? "Local suggestion ready - review limit reached"
                    : contextSuggestionSource === "error"
                      ? "Local suggestion ready"
                      : contextSuggestionSource === "local"
                        ? "Local suggestion ready - connection issue"
                        : "Suggestion ready"}
              </strong>
              <p>
                Review these fields, then click Apply approved suggestions to
                save them to My Profile.
              </p>
              {contextSuggestionNote ? (
                <p className="cv-review-result-note">{contextSuggestionNote}</p>
              ) : null}
            </div>
          </header>
          <div>
            <span>{contextSuggestion.confidence}</span>
            <small>suggestion confidence</small>
          </div>
          <dl>
            <div>
              <dt>Work authorisation status</dt>
              <dd>
                {contextSuggestion.candidatePosition === "foreign-candidate"
                  ? "Foreign / relocating"
                  : "Native / local"}
              </dd>
            </div>
            <div>
              <dt>Target role focus</dt>
              <dd>{getMarketLabel(contextSuggestion)}</dd>
            </div>
            <div>
              <dt>Target roles</dt>
              <dd>{contextSuggestion.targetRoles}</dd>
            </div>
          </dl>
          <ul className="bullets-list">
            {contextSuggestion.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </article>
      )}
    </>
  )
}
