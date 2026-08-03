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
