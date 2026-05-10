import { getLinkedInManualInputMessage } from "../lib/job-page"
import type { JobPageResponse } from "./types"

export type DetectionState = "detecting" | "detected" | "unsupported" | "none"

type JobDetectionChipProps = {
  details: JobPageResponse | null
  state: DetectionState
}

function getStatusLabel(state: DetectionState, platform?: string) {
  if (state === "detecting") {
    return "Detecting"
  }

  if (state === "detected") {
    return `Job detected${platform ? ` on ${platform}` : ""}`
  }

  if (state === "unsupported") {
    return "Manual input required"
  }

  return "No job detected"
}

function getStatusClasses(state: DetectionState) {
  if (state === "detected") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (state === "unsupported") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  if (state === "detecting") {
    return "border-sky-200 bg-sky-50 text-sky-700"
  }

  return "border-slate-200 bg-slate-50 text-slate-600"
}

function getSourceIcon(platform?: string) {
  if (platform === "LinkedIn") {
    return "ti-brand-linkedin"
  }

  return "ti-briefcase"
}

export function JobDetectionChip({ details, state }: JobDetectionChipProps) {
  const role = details?.roleTitle || details?.pageTitle || "Open a job page"
  const company = details?.company || "Company not detected"
  const location = details?.location || "Location unknown"
  const statusClasses = getStatusClasses(state)

  return (
    <section
      className={`rounded-xl border px-3 py-3 ${statusClasses}`}
      tabIndex={0}
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className={`ti ${getSourceIcon(details?.platform)} text-sm`} aria-hidden="true" />
        <p className="text-xs font-semibold">{getStatusLabel(state, details?.platform)}</p>
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900">
        {role}
      </p>
      <p className="mt-0.5 truncate text-xs text-slate-600">
        {company} &middot; {location}
      </p>
      {state === "unsupported" ? (
        <p className="mt-2 text-xs leading-5 text-amber-800">
          {getLinkedInManualInputMessage()}
        </p>
      ) : null}
    </section>
  )
}
