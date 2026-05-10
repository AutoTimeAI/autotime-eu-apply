import { useEffect, useState } from "react"
import { appUrl } from "../lib/openai"
import { getApplications, type ApplicationRecord } from "../lib/storage"

type PipelineListProps = {
  refreshKey: number
}

function getTimeAgo(createdAt: string) {
  const created = new Date(createdAt).getTime()
  const diffMs = Date.now() - created
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60_000))

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function getStatusClasses(status: ApplicationRecord["status"]) {
  if (status === "Applied" || status === "Interview") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  }

  if (status === "Rejected" || status === "Closed") {
    return "bg-slate-100 text-slate-600 ring-slate-200"
  }

  if (status === "Applying") {
    return "bg-amber-50 text-amber-700 ring-amber-200"
  }

  return "bg-indigo-50 text-indigo-700 ring-indigo-200"
}

export function PipelineList({ refreshKey }: PipelineListProps) {
  const [applications, setApplications] = useState<ApplicationRecord[]>([])

  useEffect(() => {
    let isMounted = true

    void getApplications().then((records) => {
      if (isMounted) {
        setApplications(records)
      }
    })

    return () => {
      isMounted = false
    }
  }, [refreshKey])

  const recentApplications = applications.slice(0, 8)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">My pipeline</h2>
        <span className="text-xs font-medium text-slate-500">
          {applications.length} saved
        </span>
      </div>

      {recentApplications.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {recentApplications.map((application) => (
            <li
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
              key={application.id}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {application.roleTitle || application.title}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {application.company || application.source || "Company unknown"}{" "}
                  &middot;{" "}
                  {getTimeAgo(application.createdAt)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${getStatusClasses(
                  application.status
                )}`}
              >
                {application.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
          No saved jobs yet. Click Save job above to start tracking.
        </p>
      )}

      <a
        className="mt-3 inline-flex text-xs font-semibold text-accent hover:text-accent/80"
        href={`${appUrl}/dashboard`}
        rel="noreferrer"
        target="_blank"
      >
        View all in dashboard <span aria-hidden="true">{"\u2197"}</span>
      </a>
    </section>
  )
}
