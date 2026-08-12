import type { CVData } from "../../lib/cv/types";
export function CVRenderer({ cv }: { cv: CVData }) {
  const contactLine = [
    cv.contact.email,
    cv.contact.phone,
    cv.contact.location,
    cv.contact.linkedin,
  ]
    .filter(Boolean)
    .join(" | ");
  const hasContent = Boolean(
    cv.contact.name ||
      contactLine ||
      cv.summary.trim() ||
      cv.experience.length ||
      cv.education.length ||
      cv.skills.length,
  );

  return (
    <article
      className="cv-document mx-auto max-w-[800px] bg-white p-10 text-black"
      data-ats-safe-cv
    >
      {!hasContent ? (
        <div className="cv-preview-empty">
          <strong>Your CV preview will appear here</strong>
          <p>Add your contact details or CV evidence to begin.</p>
        </div>
      ) : null}
      {cv.contact.name ? <h1>{cv.contact.name}</h1> : null}
      {contactLine ? <p className="cv-contact-line">{contactLine}</p> : null}
      {cv.summary.trim() ? <><h2>Summary</h2><p>{cv.summary}</p></> : null}
      {cv.experience.length ? <h2>Experience</h2> : null}
      {cv.experience.map((item, index) => (
        <section key={`${item.company}-${index}`}>
          <h3>
            {item.title}, {item.company}
          </h3>
          <p>{item.dates}</p>
          <ul>
            {item.bullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        </section>
      ))}
      {cv.education.length ? <h2>Education</h2> : null}
      {cv.education.map((item, index) => (
        <section key={`${item.institution}-${index}`}>
          <h3>
            {item.degree}, {item.institution}
          </h3>
          <p>{item.dates}</p>
        </section>
      ))}
      {cv.skills.length ? <><h2>Skills</h2><p>{cv.skills.join(", ")}</p></> : null}
    </article>
  );
}
