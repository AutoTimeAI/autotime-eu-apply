import type { OfficialSource } from "./types"

export const officialSourceFallback: OfficialSource[] = [
  {
    label: "EU immigration portal",
    url: "https://immigration-portal.ec.europa.eu/index_en",
    note: "Use this as a starting point, then verify the hiring country directly."
  }
]

export const officialCountrySources: Record<string, OfficialSource[]> = {
  "United Kingdom": [
    {
      label: "GOV.UK Skilled Worker visa",
      url: "https://www.gov.uk/skilled-worker-visa",
      note: "Verify job, salary, sponsor and document requirements."
    },
    {
      label: "GOV.UK sponsor licence guidance",
      url: "https://www.gov.uk/uk-visa-sponsorship-employers",
      note: "Check employer sponsorship responsibilities and limits."
    }
  ],
  Ireland: [
    {
      label: "Ireland Critical Skills Employment Permit",
      url: "https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/critical-skills-employment-permit/",
      note: "Verify eligibility, remuneration and permit requirements."
    },
    {
      label: "Ireland employment permit types",
      url: "https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/",
      note: "Compare permit routes before assuming a role is viable."
    }
  ],
  Germany: [
    {
      label: "Make it in Germany work visa",
      url: "https://www.make-it-in-germany.com/en/visa-residence/types/work-qualified-professionals",
      note: "Verify qualification, job offer and work visa requirements."
    },
    {
      label: "Make it in Germany visa procedure",
      url: "https://www.make-it-in-germany.com/en/visa-residence/procedure/entry-process",
      note: "Check the visa process and required verification steps."
    }
  ],
  Netherlands: [
    {
      label: "IND highly skilled migrant",
      url: "https://ind.nl/en/residence-permits/work/highly-skilled-migrant",
      note: "Verify recognised sponsor, contract and income requirements."
    },
    {
      label: "IND recognised sponsor background",
      url: "https://ind.nl/en/about-us/background-articles/national-highly-skilled-migrant-scheme",
      note: "Understand recognised sponsor obligations and register context."
    }
  ],
  France: [
    {
      label: "France-Visas salaried employment",
      url: "https://www.france-visas.gouv.fr/en/salaried-employment",
      note: "Verify work permit and visa route requirements."
    },
    {
      label: "Service-Public work authorisation",
      url: "https://www.service-public.fr/particuliers/vosdroits/F2728",
      note: "Check when work authorisation is required in France."
    }
  ]
}

export function getOfficialSources(targetCountry: string) {
  return officialCountrySources[targetCountry] ?? officialSourceFallback
}
