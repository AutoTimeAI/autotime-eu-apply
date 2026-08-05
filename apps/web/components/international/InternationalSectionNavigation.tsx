import { useEffect, useRef } from "react";
import type { InternationalSection } from "./model";

const sections: Array<[InternationalSection, string]> = [
  ["overview", "Overview"],
  ["country", "Country workspace"],
  ["mobility", "My mobility"],
  ["employers", "Sponsor employers"],
  ["sources", "Official sources"],
];

export function InternationalSectionNavigation({
  section,
  onChange,
}: {
  section: InternationalSection;
  onChange: (section: InternationalSection) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [section]);
  return (
    <nav aria-label="International sections" className="international-tabs">
      {sections.map(([id, label]) => (
        <button
          aria-current={section === id ? "page" : undefined}
          className={section === id ? "active" : ""}
          key={id}
          onClick={() => onChange(id)}
          ref={section === id ? activeRef : undefined}
          type="button"
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
