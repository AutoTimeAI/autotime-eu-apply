import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "../styles/globals.css"
import {
  getProfile,
  saveProfile,
  type CandidateProfile
} from "../lib/storage"

type Section = "profile" | "job-analysis" | "application-content" | "tracker"

const emptyProfile: CandidateProfile = {
  fullName: "",
  email: "",
  phone: "",
  currentCountry: "",
  currentCity: "",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  noticePeriod: ""
}

const sections: Array<{ id: Section; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "job-analysis", label: "Job Analysis" },
  { id: "application-content", label: "Application Content" },
  { id: "tracker", label: "Tracker" }
]

function SidePanelApp() {
  const [activeSection, setActiveSection] = useState<Section>("profile")
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile)
  const [status, setStatus] = useState("")

  useEffect(() => {
    const loadProfile = async () => {
      const savedProfile = await getProfile()
      if (savedProfile) {
        setProfile(savedProfile)
      }
    }

    loadProfile()
  }, [])

  const updateField = <K extends keyof CandidateProfile>(
    key: K,
    value: CandidateProfile[K]
  ) => {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  const handleSaveProfile = async () => {
    await saveProfile(profile)
    setStatus("Profile saved")
    setTimeout(() => setStatus(""), 2000)
  }

  return (
    <main className="side-panel-shell">
      <header>
        <h1>AutoTime EU Apply</h1>
      </header>

      <nav className="section-nav" aria-label="AutoTime sections">
        {sections.map((section) => (
          <button
            aria-current={activeSection === section.id ? "page" : undefined}
            className={activeSection === section.id ? "active" : ""}
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            type="button"
          >
            {section.label}
          </button>
        ))}
      </nav>

      {activeSection === "profile" ? (
        <section className="panel-section">
          <h2>Profile</h2>

          <div className="form-grid">
            <label>
              Full name
              <input
                value={profile.fullName}
                onChange={(event) =>
                  updateField("fullName", event.target.value)
                }
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={profile.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </label>

            <label>
              Phone
              <input
                value={profile.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </label>

            <label>
              Current country
              <input
                value={profile.currentCountry}
                onChange={(event) =>
                  updateField("currentCountry", event.target.value)
                }
              />
            </label>

            <label>
              Current city
              <input
                value={profile.currentCity}
                onChange={(event) =>
                  updateField("currentCity", event.target.value)
                }
              />
            </label>

            <label>
              Notice period
              <input
                value={profile.noticePeriod}
                onChange={(event) =>
                  updateField("noticePeriod", event.target.value)
                }
              />
            </label>

            <label className="checkbox-row">
              <input
                checked={profile.sponsorshipNeeded}
                type="checkbox"
                onChange={(event) =>
                  updateField("sponsorshipNeeded", event.target.checked)
                }
              />
              Sponsorship needed
            </label>

            <label>
              Relocation willingness
              <select
                value={profile.relocationWillingness}
                onChange={(event) =>
                  updateField(
                    "relocationWillingness",
                    event.target
                      .value as CandidateProfile["relocationWillingness"]
                  )
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="depends">Depends</option>
              </select>
            </label>

            <button type="button" onClick={handleSaveProfile}>
              Save Profile
            </button>

            {status && <p role="status">{status}</p>}
          </div>
        </section>
      ) : (
        <PlaceholderSection section={activeSection} />
      )}
    </main>
  )
}

function PlaceholderSection({ section }: { section: Section }) {
  const title = sections.find((item) => item.id === section)?.label

  return (
    <section className="panel-section">
      <h2>{title}</h2>
      <p>This section is ready for the next MVP step.</p>
    </section>
  )
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <SidePanelApp />
)
