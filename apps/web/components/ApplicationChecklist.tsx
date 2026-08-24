// Fixed, ordered checklist of application-preparation steps shown on the
// Application detail workspace. Purely presentational and controlled: the
// parent (JobApplicationWorkspace) owns the boolean array and persistence;
// this component only renders progress and per-step checkbox state, and
// disables the two final steps ("Mark ready"/"Mark applied") since those are
// driven by the workspace's own status transitions, not manual ticking.

export const applicationChecklistLabels = [
  "Confirm job facts",
  "Confirm evidence",
  "Review CV recommendations",
  "Prepare screening answers",
  "Prepare optional cover letter",
  "Final accuracy review",
  "Mark ready",
  "Mark applied",
] as const;

/**
 * Renders the application-preparation checklist with a completion count and
 * a "current" step indicator (the first unchecked step before index 6). The
 * last two steps (index >= 6) are always disabled here — they reflect
 * workflow status transitions set elsewhere, not direct user ticking.
 */
export function ApplicationChecklist({
  checklist,
  onChange,
}: {
  checklist: boolean[];
  onChange: (checklist: boolean[]) => void;
}) {
  const current = checklist.findIndex((item, index) => !item && index < 6);
  const completed = checklist.filter(Boolean).length;
  return (
    <section className="workflow-checklist phase-three-checklist">
      <header>
        <div>
          <p className="product-eyebrow">Preparation checklist</p>
          <h2>Application checklist</h2>
        </div>
        <span>
          {completed} of {checklist.length} complete
        </span>
      </header>
      <div>
        {applicationChecklistLabels.map((label, index) => {
          const state = checklist[index]
            ? "complete"
            : index === current
              ? "current"
              : "waiting";
          return (
            <label
              className={`phase-three-checklist-step ${state}`}
              key={label}
            >
              <input
                type="checkbox"
                checked={checklist[index]}
                disabled={index >= 6}
                onChange={(event) =>
                  onChange(
                    checklist.map((value, itemIndex) =>
                      itemIndex === index ? event.target.checked : value,
                    ),
                  )
                }
              />
              <span className="phase-three-step-number" aria-hidden="true">
                {checklist[index] ? "✓" : index + 1}
              </span>
              <strong>{label}</strong>
              <small>
                {state === "complete"
                  ? "Complete"
                  : state === "current"
                    ? "Current"
                    : "Waiting"}
              </small>
            </label>
          );
        })}
      </div>
    </section>
  );
}
