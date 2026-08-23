export type SponsorshipStrictness = "open" | "mixed" | "strict"
export type RelocationFriction = "low" | "medium" | "high"

export type CountryRule = {
  code: string
  name: string
  aliases: string[]
  marketNote: string
  sponsorshipStrictness: SponsorshipStrictness
  relocationFriction: RelocationFriction
  positiveSponsorshipSignals: string[]
  negativeSponsorshipSignals: string[]
  workRightSignals: string[]
  locationSignals: string[]
  languageSignals: string[]
  evidencePrompts: string[]
}

export const countryRules: CountryRule[] = [
  {
    code: "GB",
    name: "United Kingdom",
    aliases: ["united kingdom", "uk", "great britain", "england", "london"],
    marketNote:
      "UK roles often screen early for Skilled Worker sponsorship or existing right to work.",
    sponsorshipStrictness: "strict",
    relocationFriction: "high",
    positiveSponsorshipSignals: [
      "skilled worker",
      "certificate of sponsorship",
      "cos",
      "visa sponsorship",
      "licensed sponsor"
    ],
    negativeSponsorshipSignals: [
      "unable to sponsor",
      "no sponsorship",
      "without sponsorship",
      "existing right to work",
      "must have right to work"
    ],
    workRightSignals: [
      "right to work",
      "british citizen",
      "settled status",
      "pre-settled status",
      "indefinite leave",
      "skilled worker"
    ],
    locationSignals: ["united kingdom", "uk", "london", "manchester", "leeds"],
    languageSignals: [],
    evidencePrompts: [
      "Confirm whether the employer can sponsor Skilled Worker visas.",
      "State current UK work authorisation clearly before generating content."
    ]
  },
  {
    code: "IE",
    name: "Ireland",
    aliases: ["ireland", "dublin", "cork", "galway"],
    marketNote:
      "Ireland can be viable for international tech candidates, but permits and local availability should be explicit.",
    sponsorshipStrictness: "mixed",
    relocationFriction: "medium",
    positiveSponsorshipSignals: [
      "critical skills",
      "employment permit",
      "visa sponsorship",
      "permit sponsorship"
    ],
    negativeSponsorshipSignals: [
      "no sponsorship",
      "must have eu work rights",
      "must have irish work rights"
    ],
    workRightSignals: [
      "irish citizen",
      "eu citizen",
      "stamp 1g",
      "critical skills",
      "employment permit",
      "right to work"
    ],
    locationSignals: ["ireland", "dublin", "cork", "galway"],
    languageSignals: [],
    evidencePrompts: [
      "Check whether the role supports an Irish employment permit route.",
      "Mention Ireland availability and relocation timing."
    ]
  },
  {
    code: "DE",
    name: "Germany",
    aliases: ["germany", "berlin", "munich", "hamburg", "frankfurt"],
    marketNote:
      "Germany has a large tech market, but German language and relocation readiness can materially change fit.",
    sponsorshipStrictness: "mixed",
    relocationFriction: "medium",
    positiveSponsorshipSignals: [
      "visa support",
      "relocation support",
      "blue card",
      "work permit support"
    ],
    negativeSponsorshipSignals: [
      "no visa support",
      "must be based in germany",
      "eu work permit required"
    ],
    workRightSignals: [
      "eu citizen",
      "german work permit",
      "blue card",
      "right to work",
      "visa"
    ],
    locationSignals: ["germany", "berlin", "munich", "hamburg", "frankfurt"],
    languageSignals: ["german", "deutsch", "b1", "b2", "c1"],
    evidencePrompts: [
      "Check German language expectations before applying.",
      "State relocation timing and visa status in one line."
    ]
  },
  {
    code: "NL",
    name: "Netherlands",
    aliases: ["netherlands", "holland", "amsterdam", "rotterdam", "utrecht"],
    marketNote:
      "The Netherlands can be friendly to international tech talent, but employer sponsorship and hybrid location rules matter.",
    sponsorshipStrictness: "mixed",
    relocationFriction: "medium",
    positiveSponsorshipSignals: [
      "highly skilled migrant",
      "recognized sponsor",
      "visa support",
      "relocation support"
    ],
    negativeSponsorshipSignals: [
      "no sponsorship",
      "must be based in the netherlands",
      "eu work rights required"
    ],
    workRightSignals: [
      "eu citizen",
      "right to work",
      "highly skilled migrant",
      "recognized sponsor",
      "visa"
    ],
    locationSignals: ["netherlands", "amsterdam", "rotterdam", "utrecht"],
    languageSignals: ["dutch", "nederlands"],
    evidencePrompts: [
      "Check whether the employer is a recognized sponsor.",
      "Clarify hybrid-office expectations before spending time on content."
    ]
  },
  {
    code: "FR",
    name: "France",
    aliases: ["france", "paris", "lyon", "lille"],
    marketNote:
      "France can require stronger local language and work-right evidence outside internationally oriented teams.",
    sponsorshipStrictness: "mixed",
    relocationFriction: "medium",
    positiveSponsorshipSignals: ["visa support", "relocation support", "talent passport"],
    negativeSponsorshipSignals: ["no sponsorship", "must be based in france"],
    workRightSignals: ["eu citizen", "right to work", "talent passport", "visa"],
    locationSignals: ["france", "paris", "lyon", "lille"],
    languageSignals: ["french", "francais", "français"],
    evidencePrompts: [
      "Check whether French language is required or only a plus.",
      "Show local availability and work-right status clearly."
    ]
  },
  {
    code: "EU",
    name: "European Union",
    aliases: ["europe", "eu", "european union", "emea"],
    marketNote:
      "Broad EU roles need country-specific follow-up because work rights are enforced by hiring location.",
    sponsorshipStrictness: "mixed",
    relocationFriction: "medium",
    positiveSponsorshipSignals: ["visa support", "relocation support", "work permit"],
    negativeSponsorshipSignals: ["eu work rights required", "no sponsorship"],
    workRightSignals: ["eu citizen", "right to work", "work permit", "visa"],
    locationSignals: ["europe", "eu", "emea"],
    languageSignals: [],
    evidencePrompts: [
      "Narrow the role to a hiring country before final apply/skip decision.",
      "Ask whether the employer hires from the candidate's current country."
    ]
  }
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// A bare `.includes()` check lets a short alias like "uk" match inside an
// unrelated word that happens to start the same way (e.g. "ukraine"),
// silently returning the wrong country's rules. Require the shorter string
// to appear as a whole word (bounded by the string edge or a non-alphanumeric
// character) inside the longer one.
function containsWholeWord(haystack: string, needle: string): boolean {
  if (!needle) {
    return false
  }
  const boundary = "(?:^|[^a-z0-9])"
  const boundaryEnd = "(?:[^a-z0-9]|$)"
  return new RegExp(`${boundary}${escapeRegExp(needle)}${boundaryEnd}`).test(haystack)
}

function matchesAlias(target: string, alias: string): boolean {
  return containsWholeWord(target, alias) || containsWholeWord(alias, target)
}

export function getCountryRule(targetCountry: string) {
  const target = targetCountry.trim().toLowerCase()

  if (!target) {
    return countryRules[countryRules.length - 1]
  }

  return (
    countryRules.find((rule) =>
      rule.aliases.some((alias) => matchesAlias(target, alias))
    ) ?? countryRules[countryRules.length - 1]
  )
}
