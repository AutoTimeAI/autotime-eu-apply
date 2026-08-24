// Simple internal operations dashboard: renders a title, description and a
// grid of label/value metric tiles. Used by the /admin surface to show
// operational figures (e.g. counts, status summaries) without any of its
// own data-fetching or state — the caller supplies the already-resolved
// title/description/items.

/**
 * Renders a page header plus a grid of label/value tiles. Presentational
 * only; all data comes in via props from the admin route that fetches it.
 */
export function AdminSection({
  description,
  items,
  title
}: {
  description: string
  items: Array<{ label: string; value: string }>
  title: string
}) {
  return (
    <main className="operations-admin-page">
      <header>
        <p className="eyebrow">Operations</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <section className="operations-admin-grid">
        {items.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>
    </main>
  )
}
