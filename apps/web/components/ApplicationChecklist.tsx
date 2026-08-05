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
