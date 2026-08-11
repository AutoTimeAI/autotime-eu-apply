import type { CVData } from "../../lib/cv/types";
export function CVRenderer({ cv }: { cv: CVData }) {
  return (
    <article
      className="mx-auto max-w-[800px] bg-white p-10 text-black"
      data-ats-safe-cv
    >
      <h1>{cv.contact.name}</h1>
      <p>
        {[
          cv.contact.email,
          cv.contact.phone,
          cv.contact.location,
          cv.contact.linkedin,
        ]
          .filter(Boolean)
          .join(" | ")}
      </p>
      <h2>Summary</h2>
      <p>{cv.summary}</p>
      <h2>Experience</h2>
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
      <h2>Education</h2>
      {cv.education.map((item, index) => (
        <section key={`${item.institution}-${index}`}>
          <h3>
            {item.degree}, {item.institution}
          </h3>
          <p>{item.dates}</p>
        </section>
      ))}
      <h2>Skills</h2>
      <p>{cv.skills.join(", ")}</p>
    </article>
  );
}
