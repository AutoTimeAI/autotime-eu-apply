import { useEffect, useState } from "react"
import "../styles/globals.css"
import {
  deleteApplication,
  getApplications,
  saveApplication,
  updateApplication,
  type ApplicationStatus,
  type ApplicationRecord
} from "../lib/storage"

type AutofillResponse = {
  filledFields: string[]
  message?: string
}

const applicationStatuses: ApplicationStatus[] = [
  "draft",
  "applied",
  "interview",
  "rejected",
  "offer"
]

export default function Popup() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [status, setStatus] = useState("")

  const loadApplications = async () => {
    const saved = await getApplications()
    setApplications(saved)
  }

  useEffect(() => {
    loadApplications()
  }, [])

  const openSettings = async () => {
    await chrome.runtime.openOptionsPage()
  }

  const saveCurrentTabAsDraft = async () => {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })

    const activeTab = tabs[0]

    if (!activeTab?.url || !activeTab?.title) {
      setStatus("Could not read current tab")
      return
    }

    const record: ApplicationRecord = {
      id: crypto.randomUUID(),
      title: activeTab.title,
      url: activeTab.url,
      createdAt: new Date().toISOString(),
      status: "draft"
    }

    await saveApplication(record)
    setApplications((current) => [record, ...current])

    setStatus("Application draft saved")
    setTimeout(() => setStatus(""), 2000)
  }

  const autofillCurrentPage = async () => {
    const tabs = await chrome.tabs.query({
      active: true,
      currentWindow: true
    })

    const activeTab = tabs[0]

    if (!activeTab?.id) {
      setStatus("Could not access current tab")
      return
    }

    try {
      const response = (await chrome.tabs.sendMessage(activeTab.id, {
        type: "AUTOTIME_AUTOFILL_PROFILE"
      })) as AutofillResponse

      if (response.message) {
        setStatus(response.message)
      } else if (response.filledFields.length === 0) {
        setStatus("No obvious empty fields found")
      } else {
        setStatus(`Filled ${response.filledFields.length} fields`)
      }
    } catch {
      setStatus("Autofill is not available on this page")
    }

    setTimeout(() => setStatus(""), 2500)
  }

  const deleteSavedApplication = async (id: string) => {
    await deleteApplication(id)
    setApplications((current) => current.filter((record) => record.id !== id))
  }

  const updateSavedApplication = async (
    id: string,
    changes: Partial<Pick<ApplicationRecord, "notes" | "status">>
  ) => {
    await updateApplication(id, changes)
    setApplications((current) =>
      current.map((record) =>
        record.id === id ? { ...record, ...changes } : record
      )
    )
  }

  const formatCreatedDate = (createdAt: string) =>
    new Date(createdAt).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    })

  return (
    <main>
      <h1>AutoTime EU Apply</h1>

      <div style={{ display: "grid", gap: 12 }}>
        <button onClick={openSettings}>Open Profile Settings</button>
        <button onClick={saveCurrentTabAsDraft}>Save Application Draft</button>
        <button onClick={autofillCurrentPage}>Autofill Profile Fields</button>
        {status && <p>{status}</p>}
      </div>

      <section>
        <h2>Saved Applications</h2>

        {applications.length === 0 ? (
          <p>No saved applications yet.</p>
        ) : (
          <div className="application-list">
            {applications.map((record) => (
              <article className="application-record" key={record.id}>
                <div>
                  <h3>{record.title}</h3>
                  <a href={record.url} target="_blank" rel="noreferrer">
                    {record.url}
                  </a>
                  <p>
                    {formatCreatedDate(record.createdAt)} - {record.status}
                  </p>
                </div>

                <label>
                  Status
                  <select
                    value={record.status}
                    onChange={(event) =>
                      updateSavedApplication(record.id, {
                        status: event.target.value as ApplicationStatus
                      })
                    }
                  >
                    {applicationStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <textarea
                  placeholder="Notes"
                  value={record.notes ?? ""}
                  onChange={(event) =>
                    updateSavedApplication(record.id, {
                      notes: event.target.value
                    })
                  }
                />

                <button onClick={() => deleteSavedApplication(record.id)}>
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
