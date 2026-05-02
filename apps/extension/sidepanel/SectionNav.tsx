import { sections, type Section } from "./constants"
import type { SaveAttempts } from "./types"

type SectionNavProps = {
  activeSection: Section
  applicationContentIssueCount: number
  jobAnalysisIssueCount: number
  onSectionChange: (section: Section) => void
  profileIssueCount: number
  reusableAnswerIssueCount: number
  saveAttempts: SaveAttempts
  trackerIssueCount: number
}

function NavAlert({ label }: { label: string }) {
  return (
    <span className="nav-alert" aria-label={label}>
      !
    </span>
  )
}

export function SectionNav({
  activeSection,
  applicationContentIssueCount,
  jobAnalysisIssueCount,
  onSectionChange,
  profileIssueCount,
  reusableAnswerIssueCount,
  saveAttempts,
  trackerIssueCount
}: SectionNavProps) {
  const groupedSections = sections.reduce<
    Array<{ group: string; sections: typeof sections }>
  >((groups, section) => {
    const existingGroup = groups.find((group) => group.group === section.group)

    if (existingGroup) {
      existingGroup.sections.push(section)
    } else {
      groups.push({ group: section.group, sections: [section] })
    }

    return groups
  }, [])

  return (
    <nav className="section-nav" aria-label="AutoTime sections">
      {groupedSections.map((group) => (
        <div className="section-nav-group" key={group.group}>
          <h2>{group.group}</h2>
          {group.sections.map((section) => (
            <button
              aria-current={activeSection === section.id ? "page" : undefined}
              className={activeSection === section.id ? "active" : ""}
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              type="button"
            >
              {section.label}
              {section.id === "profile" &&
                saveAttempts.profile &&
                profileIssueCount > 0 && (
                  <NavAlert label="Profile needs attention" />
                )}
              {section.id === "job-analysis" &&
                saveAttempts["job-analysis"] &&
                jobAnalysisIssueCount > 0 && (
                  <NavAlert label="Job Analysis needs attention" />
                )}
              {section.id === "application-content" &&
                saveAttempts["application-content"] &&
                applicationContentIssueCount > 0 && (
                  <NavAlert label="Application Content needs attention" />
                )}
              {section.id === "reusable-answers" &&
                saveAttempts["reusable-answers"] &&
                reusableAnswerIssueCount > 0 && (
                  <NavAlert label="Reusable Answers need attention" />
                )}
              {section.id === "tracker" &&
                saveAttempts.tracker &&
                trackerIssueCount > 0 && (
                  <NavAlert label="Tracker needs attention" />
                )}
            </button>
          ))}
        </div>
      ))}
    </nav>
  )
}
