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
import {
  applicationsToCsv,
  filterApplications,
  hasApplicationWithUrl,
  type ApplicationStatusFilter
} from "../lib/applications"

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

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

export default function Popup() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<ApplicationStatusFilter>("all")
  const [status, setStatus] = useState("")

  const visibleApplications = filterApplications(
    applications,
    searchQuery,
    statusFilter
  )

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

    if (hasApplicationWithUrl(applications, activeTab.url)) {
      setStatus("This application is already saved")
      setTimeout(() => setStatus(""), 2500)
      return
    }

    const record: ApplicationRecord = {
      id: crypto.randomUUID(),
      title: activeTab.title,
      roleTitle: activeTab.title,
      url: activeTab.url,
      source: getHostname(activeTab.url),
      createdAt: new Date().toISOString(),
      status: "draft"
    }

    await saveApplication(record)
    setApplications((current) => [record, ...current])

    setStatus("Application draft saved")
    setTimeout(() => setStatus(""), 2000)
  }

  const exportApplications = () => {
    if (applications.length === 0) {
      setStatus("No applications to export")
      setTimeout(() => setStatus(""), 2500)
      return
    }

    const csv = applicationsToCsv(applications)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "autotime-applications.csv"
    link.click()
    URL.revokeObjectURL(url)

    setStatus("Applications exported")
    setTimeout(() => setStatus(""), 2500)
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
    changes: Partial<
      Pick<
        ApplicationRecord,
        | "company"
        | "notes"
        | "roleTitle"
        | "source"
        | "status"
        | "nextAction"
        | "nextActionDate"
      >
    >
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
        <button onClick={exportApplications}>Export CSV</button>
        {status && <p>{status}</p>}
      </div>

      <section>
        <h2>Saved Applications</h2>

        <div className="application-filters">
          <input
            placeholder="Search applications"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as ApplicationStatusFilter)
            }
          >
            <option value="all">all</option>
            {applicationStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {applications.length === 0 ? (
          <p>No saved applications yet.</p>
        ) : visibleApplications.length === 0 ? (
          <p>No applications match your filters.</p>
        ) : (
          <div className="application-list">
            {visibleApplications.map((record) => (
              <article className="application-record" key={record.id}>
                <div>
                  <h3>{record.roleTitle || record.title}</h3>
                  {record.company && <p>{record.company}</p>}
                  <a href={record.url} target="_blank" rel="noreferrer">
                    {record.url}
                  </a>
                  <p>
                    {formatCreatedDate(record.createdAt)} - {record.status}
                    {record.source ? ` - ${record.source}` : ""}
                  </p>
                </div>

                <label>
                  Role title
                  <input
                    value={record.roleTitle ?? record.title}
                    onChange={(event) =>
                      updateSavedApplication(record.id, {
                        roleTitle: event.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Company
                  <input
                    placeholder="Company"
                    value={record.company ?? ""}
                    onChange={(event) =>
                      updateSavedApplication(record.id, {
                        company: event.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Source
                  <input
                    placeholder="Source"
                    value={record.source ?? ""}
                    onChange={(event) =>
                      updateSavedApplication(record.id, {
                        source: event.target.value
                      })
                    }
                  />
                </label>

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

                <label>
                  Next action
                  <input
                    placeholder="Next action"
                    value={record.nextAction ?? ""}
                    onChange={(event) =>
                      updateSavedApplication(record.id, {
                        nextAction: event.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Next action date
                  <input
                    type="date"
                    value={record.nextActionDate ?? ""}
                    onChange={(event) =>
                      updateSavedApplication(record.id, {
                        nextActionDate: event.target.value
                      })
                    }
                  />
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
