export function InternationalEvidenceGrid({
  groups,
}: {
  groups: Array<{ title: string; items: string[] }>;
}) {
  return (
    <section className="international-evidence-grid">
      {groups.map((group) => (
        <article key={group.title}>
          <h3>{group.title}</h3>
          {group.items.length ? (
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No evidence recorded.</p>
          )}
        </article>
      ))}
    </section>
  );
}
