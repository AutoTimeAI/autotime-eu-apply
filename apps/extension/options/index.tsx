import { useEffect, useState } from "react"
import "../styles/globals.css"
import {
  getProfile,
  getReusableAnswers,
  saveProfile,
  saveReusableAnswers,
  type CandidateProfile,
  type ReusableAnswers
} from "../lib/storage"

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

const emptyReusableAnswers: ReusableAnswers = {
  sponsorshipAnswer: "",
  relocationAnswer: "",
  workAuthorisationAnswer: "",
  noticePeriodAnswer: ""
}

export default function OptionsPage() {
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile)
  const [answers, setAnswers] = useState<ReusableAnswers>(emptyReusableAnswers)
  const [status, setStatus] = useState("")

  useEffect(() => {
    const load = async () => {
      const saved = await getProfile()
      if (saved) {
        setProfile(saved)
      }

      const savedAnswers = await getReusableAnswers()
      if (savedAnswers) {
        setAnswers(savedAnswers)
      }
    }

    load()
  }, [])

  const updateField = <K extends keyof CandidateProfile>(
    key: K,
    value: CandidateProfile[K]
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const updateAnswer = <K extends keyof ReusableAnswers>(
    key: K,
    value: ReusableAnswers[K]
  ) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    await saveProfile(profile)
    await saveReusableAnswers(answers)
    setStatus("Settings saved")
    setTimeout(() => setStatus(""), 2000)
  }

  return (
    <main>
      <h1>Profile Settings</h1>

      <div style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Full name"
          value={profile.fullName}
          onChange={(e) => updateField("fullName", e.target.value)}
        />

        <input
          placeholder="Email"
          value={profile.email}
          onChange={(e) => updateField("email", e.target.value)}
        />

        <input
          placeholder="Phone"
          value={profile.phone}
          onChange={(e) => updateField("phone", e.target.value)}
        />

        <input
          placeholder="Current country"
          value={profile.currentCountry}
          onChange={(e) => updateField("currentCountry", e.target.value)}
        />

        <input
          placeholder="Current city"
          value={profile.currentCity}
          onChange={(e) => updateField("currentCity", e.target.value)}
        />

        <input
          placeholder="Notice period"
          value={profile.noticePeriod}
          onChange={(e) => updateField("noticePeriod", e.target.value)}
        />

        <label>
          Sponsorship needed{" "}
          <input
            type="checkbox"
            checked={profile.sponsorshipNeeded}
            onChange={(e) => updateField("sponsorshipNeeded", e.target.checked)}
          />
        </label>

        <select
          value={profile.relocationWillingness}
          onChange={(e) =>
            updateField(
              "relocationWillingness",
              e.target.value as CandidateProfile["relocationWillingness"]
            )
          }
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="depends">Depends</option>
        </select>

        <h2>Reusable Answers</h2>

        <textarea
          placeholder="Sponsorship answer"
          value={answers.sponsorshipAnswer}
          onChange={(e) => updateAnswer("sponsorshipAnswer", e.target.value)}
        />

        <textarea
          placeholder="Relocation answer"
          value={answers.relocationAnswer}
          onChange={(e) => updateAnswer("relocationAnswer", e.target.value)}
        />

        <textarea
          placeholder="Work authorisation answer"
          value={answers.workAuthorisationAnswer}
          onChange={(e) =>
            updateAnswer("workAuthorisationAnswer", e.target.value)
          }
        />

        <textarea
          placeholder="Notice period answer"
          value={answers.noticePeriodAnswer}
          onChange={(e) => updateAnswer("noticePeriodAnswer", e.target.value)}
        />

        <button onClick={handleSave}>Save settings</button>

        {status && <p>{status}</p>}
      </div>
    </main>
  )
}
