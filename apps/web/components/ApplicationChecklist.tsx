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
  return (
    <section className="workflow-checklist">
      <h2>Application checklist</h2>
      {applicationChecklistLabels.map((label, index) => (
        <label key={label}>
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
          {index + 1}. {label}
        </label>
      ))}
    </section>
  );
}
