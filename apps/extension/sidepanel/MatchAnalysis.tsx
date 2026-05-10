import { useState } from "react"
import { appUrl } from "../lib/openai"
import type { AccountSession } from "../lib/storage"
import type { JobPageResponse } from "./types"

const insightKeywords = [
  "python",
  "openai",
  "anthropic",
  "llm",
  "rag",
  "nlp",
  "api",
  "document",
  "financial",
  "dashboard",
  "data",
  "analysis",
  "modelling",
  "legal",
  "risk",
  "market"
]

const noJobDescriptionMessage =
  "No job description found. Save a job with a parsed description to retrieve insights."

function getWordCount(text = "") {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
}

function getDetectedKeywords(description = "") {
  const normalized = description.toLowerCase()

  return insightKeywords
    .filter((keyword) => normalized.includes(keyword))
    .slice(0, 6)
}

function getBasicInsights(details: JobPageResponse | null) {
  if (!details?.jobDescription.trim()) {
    return [noJobDescriptionMessage]
  }

  const wordCount = getWordCount(details.jobDescription)
  const keywords = getDetectedKeywords(details.jobDescription)

  return [
    details.platform !== "Generic"
      ? `Detected from ${details.platform}.`
      : "Detected from the current job page.",
    `${wordCount} words in the visible job description.`,
    details.location
      ? `Location signal: ${details.location}.`
      : "Location was not clearly detected.",
    keywords.length > 0
      ? `Core signals: ${keywords.join(", ")}.`
      : "No keyword signals detected yet."
  ]
}

function getDeepInsights(details: JobPageResponse | null) {
  if (!details) {
    return [
      "Role positioning angle",
      "Evidence gaps against the job description",
      "Application risk and priority recommendation"
    ]
  }

  const keywords = getDetectedKeywords(details.jobDescription)
  const role = details.roleTitle || "this role"
  const company = details.company || "the company"

  return [
    `Position ${role} around ${keywords[0] ?? "the strongest repeated job signal"}.`,
    `Prepare evidence for ${keywords.slice(0, 3).join(", ") || "the top requirements"} before applying.`,
    `Review ${company} fit, location and work-right risk in the dashboard before sending materials.`
  ]
}

function getSummary(details: JobPageResponse | null) {
  if (!details?.jobDescription.trim()) {
    return "Analysis ready after job text is detected"
  }

  const keywords = getDetectedKeywords(details.jobDescription)
  const score = Math.min(92, Math.max(48, 56 + keywords.length * 7))

  return `${score}% match \u00b7 ${keywords.length} keyword${keywords.length === 1 ? "" : "s"} found`
}

export function MatchAnalysis({
  accountSession,
  details
}: {
  accountSession: AccountSession | null
  details: JobPageResponse | null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isProCustomer = accountSession?.plan === "pro"
  const basicInsights = getBasicInsights(details)
  const deepInsights = getDeepInsights(details)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span>
          <span className="block text-sm font-semibold text-slate-900">
            Match analysis
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            {getSummary(details)}
          </span>
        </span>
        <span className="text-sm text-slate-400" aria-hidden="true">
          {isOpen ? "\u25b4" : "\u25be"}
        </span>
      </button>

      {isOpen ? (
        <div className="grid gap-3 border-t border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-500">
              Basic insight
            </h3>
            <ul className="mt-2 grid gap-2 text-xs leading-5 text-slate-700">
              {basicInsights.map((insight) => (
                <li key={insight}>{insight}</li>
              ))}
            </ul>
          </div>

          {isProCustomer ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Pro insight
              </h3>
              <ul className="mt-2 grid gap-2 text-xs leading-5 text-slate-700">
                {deepInsights.map((insight) => (
                  <li key={insight}>{insight}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Deeper match analysis is a Pro feature
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Upgrade for gap analysis, positioning guidance, and priority
                recommendations.
              </p>
              <a
                className="mt-2 inline-flex text-xs font-semibold text-accent hover:text-accent/80"
                href={`${appUrl}/pricing`}
                rel="noreferrer"
                target="_blank"
              >
                Upgrade to Pro <span aria-hidden="true">{"\u2197"}</span>
              </a>
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}
