import type { CVData } from "../../lib/cv/types";
export function CVRenderer({ cv }: { cv: CVData }) {
  const experience = cv.experience.filter((item) =>
    [item.title, item.company, item.dates, ...item.bullets].some((value) => value.trim()),
  );
  const education = cv.education.filter((item) =>
    [item.degree, item.institution, item.dates].some((value) => value.trim()),
  );
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
      {experience.length ? <h2>Experience</h2> : null}
      {experience.map((item, index) => (
        <section key={`${item.company}-${index}`}>
          {[item.title, item.company].filter(Boolean).length ? <h3>{[item.title, item.company].filter(Boolean).join(" · ")}</h3> : null}
          <p>{item.dates}</p>
          <ul>
            {item.bullets.map((bullet, i) => (
              <li key={i}>{bullet}</li>
            ))}
          </ul>
        </section>
      ))}
      {education.length ? <h2>Education</h2> : null}
      {education.map((item, index) => (
        <section key={`${item.institution}-${index}`}>
          {[item.degree, item.institution].filter(Boolean).length ? <h3>{[item.degree, item.institution].filter(Boolean).join(" · ")}</h3> : null}
          <p>{item.dates}</p>
        </section>
      ))}
      {cv.skills.length ? <><h2>Skills</h2><p>{cv.skills.join(", ")}</p></> : null}
    </article>
  );
}
