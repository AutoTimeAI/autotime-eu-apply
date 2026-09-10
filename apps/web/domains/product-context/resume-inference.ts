import {
  euCountryOptions,
  experienceLevelOptions,
  fallbackProductContext,
  roleMarkets,
  type ProductContext,
  type ResolvedProductContext,
  type RoleMarket
} from "./model"

export type ContextSuggestion = ResolvedProductContext & {
  targetRoles: string
  workRightPrompt: string
  confidence: "Low" | "Medium" | "High"
  reasons: string[]
}

export function resolveProductContext(
  context: ProductContext
): ResolvedProductContext {
  return {
    roleMarket: context.roleMarket || fallbackProductContext.roleMarket,
    candidatePosition:
      context.candidatePosition || fallbackProductContext.candidatePosition,
    urgency: context.urgency || fallbackProductContext.urgency,
    targetCountry: context.targetCountry || fallbackProductContext.targetCountry,
    experienceLevel:
      context.experienceLevel || fallbackProductContext.experienceLevel
  }
}

export function getMissingProductContextFields(context: ProductContext) {
  return [
    !context.roleMarket && "target role focus",
    !context.candidatePosition && "work authorisation status",
    !context.targetCountry.trim() && "target country",
    !context.experienceLevel.trim() && "experience level",
    !context.urgency && "search pace"
  ].filter(Boolean) as string[]
}

export function getMarketLabel(context: ProductContext) {
  return roleMarkets.find((market) => market.id === context.roleMarket)?.label
}

export function getRoleMarket(context: Pick<ProductContext, "roleMarket">) {
  return (
    roleMarkets.find((market) => market.id === context.roleMarket) ??
    roleMarkets[0]
  )
}

export function getCountryGuidance(context: ProductContext) {
  if (getMissingProductContextFields(context).length > 0) {
    return "Start with your CV, then choose target role focus, work authorisation status, target country, experience level and search pace before applying settings to My Profile."
  }

  const country = context.targetCountry || "selected country"

  if (context.candidatePosition === "foreign-candidate") {
    return `${country} requirements: work-right, sponsorship, relocation, location fit, missing evidence.`
  }

  return `${country} requirements: availability, salary, notice period, role fit, missing evidence.`
}

export function getMarketPositioning(context: ProductContext) {
  return getRoleMarket(context).positioning
}

export function getUrgencyGuidance(context: ProductContext) {
  if (!context.urgency) {
    return "Choose a search pace before relying on job priority guidance."
  }

  if (context.urgency === "urgent") {
    return "Prioritise roles with strong fit, clear work-right path and fast application execution. Avoid low-fit speculative applications."
  }

  if (context.urgency === "exploring") {
    return "Compare countries, learn role language and strengthen your profile before applying heavily."
  }

  return "Balance targeted applications with quality. Track next actions and improve positioning after each outcome."
}

export function includesAny(value: string, words: string[]) {
  const text = value.toLowerCase()
  return words.some((word) => text.includes(word.toLowerCase()))
}

export function inferRoleMarketFromText(value: string, fallback: RoleMarket) {
  const ranked = roleMarkets
    .map((market) => ({
      market,
      score: market.keywords.filter((keyword) =>
        value.toLowerCase().includes(keyword.toLowerCase())
      ).length
    }))
    .sort((a, b) => b.score - a.score)

  return ranked[0]?.score
    ? ranked[0].market
    : getRoleMarket({ roleMarket: fallback })
}

export function findSupportedCountryInText(value: string) {
  const normalized = value.toLowerCase()
  const countryAliases: Record<string, string[]> = {
    "United Kingdom": [
      "united kingdom",
      "uk",
      "u.k.",
      "england",
      "scotland",
      "wales"
    ]
  }

  return (
    euCountryOptions.find((country) => {
      const aliases = countryAliases[country] ?? [country]

      return aliases.some((alias) =>
        new RegExp(
          `\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i"
        ).test(normalized)
      )
    }) || ""
  )
}

export function inferTargetCountryFromResume(
  resumeText: string,
  fallbackCountry: string
) {
  const lines = resumeText
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
  const targetLine = lines.find(
    (line) =>
      /\b(target|seeking|looking for|open to|relocat|visa|sponsor|authori[sz]ation|work permit)\b/i.test(
        line
      ) && findSupportedCountryInText(line)
  )

  return targetLine
    ? findSupportedCountryInText(targetLine) || fallbackCountry
    : fallbackCountry
}

export function inferContextFromResume(
  resumeText: string,
  current: ProductContext
): ContextSuggestion {
  const words = resumeText.trim().split(/\s+/).filter(Boolean)
  const resolvedCurrent = resolveProductContext(current)
  const inferredMarket = inferRoleMarketFromText(
    resumeText,
    resolvedCurrent.roleMarket
  )
  const roleMarket = inferredMarket.id
  const targetCountry = inferTargetCountryFromResume(
    resumeText,
    current.targetCountry || resolvedCurrent.targetCountry
  )
  const candidatePosition = includesAny(resumeText, [
    "visa",
    "sponsorship",
    "relocation",
    "work permit",
    "student visa",
    "graduate visa",
    "skilled worker"
  ])
    ? "foreign-candidate"
    : current.candidatePosition || resolvedCurrent.candidatePosition
  const experienceLevel = includesAny(resumeText, [
    "lead",
    "principal",
    "manager",
    "senior"
  ])
    ? "Senior"
    : includesAny(resumeText, ["graduate", "intern", "junior", "entry level"])
      ? "Junior"
      : current.experienceLevel || resolvedCurrent.experienceLevel
  const targetRoles = [
    includesAny(resumeText, ["technical business analyst"]) &&
      "Technical Business Analyst",
    includesAny(resumeText, ["business analyst"]) && "Business Analyst",
    includesAny(resumeText, ["systems analyst"]) && "Systems Analyst",
    includesAny(resumeText, ["product analyst"]) && "Product Analyst",
    includesAny(resumeText, ["data analyst"]) && "Data Analyst",
    includesAny(resumeText, ["application support"]) &&
      "Application Support Analyst"
  ]
    .filter(Boolean)
    .join(", ")

  return {
    ...resolvedCurrent,
    roleMarket,
    candidatePosition,
    experienceLevel,
    targetCountry,
    targetRoles: targetRoles || inferredMarket.targetRoles,
    workRightPrompt:
      candidatePosition === "foreign-candidate"
        ? "Confirm visa/work-right status, sponsorship need, relocation timing and eligible countries before applying."
        : "Confirm local work-right status, notice period, salary expectations and availability before applying.",
    confidence:
      words.length > 120 ? "High" : words.length > 50 ? "Medium" : "Low",
    reasons: [
      inferredMarket.detectedReason,
      targetCountry !== current.targetCountry
        ? `Detected target country: ${targetCountry}.`
        : `Target country kept as ${targetCountry}.`,
      candidatePosition === "foreign-candidate"
        ? "Detected visa, sponsorship, work permit or relocation language."
        : "No strong visa or relocation signal was detected; user approval is still required.",
      `Suggested experience level: ${experienceLevel}.`
    ]
  }
}

export function getReadableResumeLines(resumeText: string) {
  return resumeText
    .split(/\r?\n|[•*]|(?<=[.!?])\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 24)
    .map((line) => (line.length > 240 ? `${line.slice(0, 237)}...` : line))
}

export function inferEvidenceFromResume(resumeText: string) {
  const lines = getReadableResumeLines(resumeText)
  const experienceKeywords = [
    "analyst",
    "support",
    "managed",
    "led",
    "delivered",
    "improved",
    "worked",
    "responsible",
    "stakeholder",
    "requirements",
    "operations",
    "payments",
    "systems"
  ]
  const projectKeywords = [
    "project",
    "migration",
    "implementation",
    "workflow",
    "process",
    "automation",
    "integration",
    "delivery",
    "rollout",
    "improvement",
    "platform",
    "system"
  ]
  const pickLines = (keywords: string[]) =>
    lines
      .filter((line) => includesAny(line, keywords))
      .slice(0, 3)
      .join("\n")

  return {
    experienceHighlights: pickLines(experienceKeywords),
    projectSummaries: pickLines(projectKeywords)
  }
}

export function inferCandidateDetailsFromResume(resumeText: string) {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
  const roleTitleKeywords = [
    "analyst",
    "engineer",
    "developer",
    "manager",
    "consultant",
    "specialist",
    "administrator",
    "architect",
    "lead",
    "support",
    "product",
    "project",
    "programme",
    "scrum",
    "agile"
  ]
  const email = resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  const phone = resumeText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]
  const linkedInUrl = resumeText.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0]
  const githubUrl = resumeText.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i)?.[0]
  const portfolioUrl = resumeText.match(
    /https?:\/\/(?![^/\s]*linkedin\.com)(?![^/\s]*github\.com)[^\s)]+/i
  )?.[0]
  const fullName = lines
    .slice(0, 5)
    .find((line) => {
      const words = line.split(" ").filter(Boolean)

      return (
        !includesAny(line, roleTitleKeywords) &&
        !/[0-9@:/\\]/.test(line) &&
        words.length >= 2 &&
        words.length <= 4 &&
        words.every((word) => /^[A-Z][A-Za-z'.-]+$/.test(word))
      )
    })
  const locationLine = lines.find((line) =>
    /\b(location|based in|current city|address)\b/i.test(line)
  )
  const currentCountry = locationLine
    ? findSupportedCountryInText(locationLine)
    : ""
  const currentCity = locationLine
    ?.replace(/\b(location|based in|current city|address)\b\s*:?\s*/i, "")
    .replace(currentCountry, "")
    .split(/,|\|/)[0]
    ?.trim()

  return {
    currentCity: currentCity || "",
    currentCountry,
    email: email ?? "",
    fullName: fullName ?? "",
    githubUrl: githubUrl ?? "",
    linkedInUrl: linkedInUrl ?? "",
    phone: phone?.trim() ?? "",
    portfolioUrl: portfolioUrl ?? ""
  }
}

export function normalizeContextSuggestionForApproval({
  fallback,
  suggestion
}: {
  fallback: ContextSuggestion
  suggestion: ContextSuggestion
}): ContextSuggestion {
  const targetCountry = euCountryOptions.includes(suggestion.targetCountry)
    ? suggestion.targetCountry
    : fallback.targetCountry
  const experienceLevel = experienceLevelOptions.includes(
    suggestion.experienceLevel
  )
    ? suggestion.experienceLevel
    : fallback.experienceLevel
  const targetRoles =
    suggestion.targetRoles.trim() || fallback.targetRoles.trim()
  const workRightPrompt =
    suggestion.workRightPrompt.trim() || fallback.workRightPrompt.trim()

  return {
    ...suggestion,
    experienceLevel,
    targetCountry,
    targetRoles,
    workRightPrompt,
    reasons: suggestion.reasons.length ? suggestion.reasons : fallback.reasons
  }
}
