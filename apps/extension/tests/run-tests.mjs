import assert from "node:assert/strict"
import {
  applicationsToCsv,
  filterApplications,
  getApplicationValidationMetrics,
  hasApplicationWithUrl,
  mergeDashboardApplications,
  validationMetricsToCsv
} from "../lib/applications.ts"
import {
  canFillInput,
  detectApplicationContentFromText,
  detectFieldFromText,
  detectReusableAnswerFromText,
  getApplicationContentValues,
  getFieldValues,
  getNameParts,
  getReusableAnswerValues
} from "../lib/autofill.ts"
import {
  extractJobPostingFromJsonLd,
  formatJobPageNotes,
  getLinkedInCanonicalJobUrl,
  getLinkedInManualInputMessage,
  getJobPlatform,
  inferJobPageDetails,
  isLinkedInUrl,
  parseLinkedInPageTitle
} from "../lib/job-page.ts"
import {
  inferJobFitAnalysis,
  inferLocationFromJobDescription
} from "../lib/job-analysis.ts"
import { generateApplicationContentDraft } from "../lib/content-generation.ts"
import { createV2DashboardState } from "../lib/v2-dashboard.ts"
import {
  companionDashboardStateSchema,
  getCandidateProfileBridgeIssues,
  hasCandidateProfileBridgeEvidence
} from "shared"
import {
  estimateOpenAICostUsd,
  getOpenAIErrorMessage,
  normalizeAIApplicationContent,
  normalizeAIJobAnalysis
} from "../lib/openai.ts"
import {
  clearAIUsageLog,
  clearApplicationContentDraft,
  clearAccountSession,
  clearJobAnalysisDraft,
  clearLegacyOpenAISettings,
  clearProfile,
  clearReusableAnswers,
  clearTrackerDraft,
  getAccountSession,
  deleteApplication,
  getAIUsageLog,
  getApplicationContentDraft,
  getApplications,
  getJobAnalysisDraft,
  getProfile,
  getReusableAnswers,
  getTrackerDraft,
  logAIUsage,
  saveAccountSession,
  saveApplicationContentDraft,
  saveApplication,
  saveJobAnalysisDraft,
  saveProfile,
  saveReusableAnswers,
  saveTrackerDraft,
  updateApplication
} from "../lib/storage.ts"
import {
  countWords,
  validateApplicationContentDraft,
  validateJobAnalysisDraft,
  validateProfile,
  validateReusableAnswers,
  validateTrackerDraft
} from "../lib/validation.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

const store = new Map()

globalThis.chrome = {
  storage: {
    local: {
      async get(key) {
        return { [key]: store.get(key) }
      },
      async set(values) {
        Object.entries(values).forEach(([key, value]) => {
          store.set(key, value)
        })
      },
      async remove(key) {
        store.delete(key)
      }
    }
  }
}

function resetStorage() {
  store.clear()
}

test("splits a full name into first and last name", () => {
  assert.deepEqual(getNameParts("Ada Lovelace"), {
    firstName: "Ada",
    lastName: "Lovelace"
  })

  assert.deepEqual(getNameParts("  Grace Brewster Murray Hopper  "), {
    firstName: "Grace",
    lastName: "Brewster Murray Hopper"
  })
})

test("maps profile values to autofill fields", () => {
  assert.deepEqual(
    getFieldValues({
      fullName: "Alan Turing",
      email: "alan@example.com",
      phone: "+44 1234"
    }),
    {
      firstName: "Alan",
      lastName: "Turing",
      email: "alan@example.com",
      phone: "+44 1234"
    }
  )
})

test("detects obvious application form fields", () => {
  assert.equal(detectFieldFromText("text", "first name"), "firstName")
  assert.equal(detectFieldFromText("text", "surname"), "lastName")
  assert.equal(detectFieldFromText("email", ""), "email")
  assert.equal(detectFieldFromText("tel", ""), "phone")
  assert.equal(detectFieldFromText("text", "mobile number"), "phone")
})

test("maps reusable answers to autofill fields", () => {
  assert.deepEqual(
    getReusableAnswerValues({
      sponsorshipAnswer: "I do not require sponsorship.",
      relocationAnswer: "I am open to relocation.",
      workAuthorisationAnswer: "I am authorised to work.",
      noticePeriodAnswer: "My notice period is one month.",
      salaryExpectationAnswer: "My expected salary is GBP 45,000.",
      motivationAnswer: "I am motivated by product delivery.",
      strengthsAnswer: "My strengths are analysis and UAT.",
      availabilityAnswer: "I am available for interviews next week."
    }),
    {
      sponsorshipAnswer: "I do not require sponsorship.",
      relocationAnswer: "I am open to relocation.",
      workAuthorisationAnswer: "I am authorised to work.",
      noticePeriodAnswer: "My notice period is one month.",
      salaryExpectationAnswer: "My expected salary is GBP 45,000.",
      motivationAnswer: "I am motivated by product delivery.",
      strengthsAnswer: "My strengths are analysis and UAT.",
      availabilityAnswer: "I am available for interviews next week."
    }
  )
})

test("maps application content to insertable fields", () => {
  assert.deepEqual(
    getApplicationContentValues({
      coverLetter: "Tailored cover letter.",
      profileSummary: "Profile summary.",
      motivationAnswer: "Motivation answer.",
      strengthsAnswer: "Strengths answer.",
      availabilityAnswer: "Availability answer."
    }),
    {
      coverLetter: "Tailored cover letter.",
      profileSummary: "Profile summary.",
      motivationAnswer: "Motivation answer.",
      strengthsAnswer: "Strengths answer.",
      availabilityAnswer: "Availability answer."
    }
  )
})

test("detects obvious reusable answer questions", () => {
  assert.equal(
    detectReusableAnswerFromText("Do you require visa sponsorship?"),
    "sponsorshipAnswer"
  )
  assert.equal(
    detectReusableAnswerFromText("Are you willing to relocate?"),
    "relocationAnswer"
  )
  assert.equal(
    detectReusableAnswerFromText("Are you authorised to work in this country?"),
    "workAuthorisationAnswer"
  )
  assert.equal(
    detectReusableAnswerFromText("What is your notice period?"),
    "noticePeriodAnswer"
  )
  assert.equal(
    detectReusableAnswerFromText("What are your salary expectations?"),
    "salaryExpectationAnswer"
  )
  assert.equal(
    detectReusableAnswerFromText("Why are you interested in this role?"),
    "motivationAnswer"
  )
  assert.equal(
    detectReusableAnswerFromText("What strengths can you bring?"),
    "strengthsAnswer"
  )
  assert.equal(
    detectReusableAnswerFromText("What is your availability for interview?"),
    "availabilityAnswer"
  )
})

test("detects obvious application content fields", () => {
  assert.equal(
    detectApplicationContentFromText("Upload or paste your cover letter"),
    "coverLetter"
  )
  assert.equal(
    detectApplicationContentFromText("Tell us about yourself"),
    "profileSummary"
  )
  assert.equal(
    detectApplicationContentFromText("Why are you interested in this role?"),
    "motivationAnswer"
  )
  assert.equal(
    detectApplicationContentFromText("What strengths can you bring?"),
    "strengthsAnswer"
  )
  assert.equal(
    detectApplicationContentFromText("What is your availability for interview?"),
    "availabilityAnswer"
  )
})

test("ignores unclear fields", () => {
  assert.equal(detectFieldFromText("text", "search jobs"), null)
  assert.equal(detectFieldFromText("url", "portfolio"), null)
  assert.equal(detectReusableAnswerFromText("Tell us about yourself"), null)
  assert.equal(detectApplicationContentFromText("Internal referral code"), null)
})

test("fills only empty visible enabled supported inputs", () => {
  const fillable = {
    disabled: false,
    readOnly: false,
    isVisible: true,
    type: "text",
    value: ""
  }

  assert.equal(canFillInput(fillable), true)
  assert.equal(canFillInput({ ...fillable, value: "Already filled" }), false)
  assert.equal(canFillInput({ ...fillable, disabled: true }), false)
  assert.equal(canFillInput({ ...fillable, readOnly: true }), false)
  assert.equal(canFillInput({ ...fillable, isVisible: false }), false)
  assert.equal(canFillInput({ ...fillable, type: "password" }), false)
})

test("reads explicit job page fields without title fallbacks", () => {
  assert.deepEqual(
    inferJobPageDetails({
      title: "Senior Frontend Engineer at Example Co - Careers",
      url: "https://example.com/jobs/frontend"
    }),
    {
      roleTitle: "",
      company: "",
      location: "",
      jobDescription: "",
      url: "https://example.com/jobs/frontend",
      source: "example.com",
      platform: "Generic",
      pageTitle: "Senior Frontend Engineer at Example Co - Careers"
    }
  )

  assert.deepEqual(
    inferJobPageDetails({
      title: "Backend Engineer | Example Jobs",
      heading: "Staff Backend Engineer",
      company: "Example Co",
      location: "London, United Kingdom",
      salary: "GBP 50000-60000 YEAR",
      employmentType: "FULL_TIME",
      url: "https://jobs.example.co/backend"
    }),
    {
      roleTitle: "Staff Backend Engineer",
      company: "Example Co",
      location: "London, United Kingdom",
      jobDescription: "",
      salary: "GBP 50000-60000 YEAR",
      employmentType: "FULL_TIME",
      url: "https://jobs.example.co/backend",
      source: "jobs.example.co",
      platform: "Generic",
      pageTitle: "Backend Engineer | Example Jobs"
    }
  )
})

test("cleans job page descriptions and infers missing location", () => {
  assert.deepEqual(
    inferJobPageDetails({
      title: "Product Analyst at Example Co",
      heading: "Product Analyst",
      company: "Example Co",
      description:
        "<p>Location: Dublin, Ireland</p><p>Analyse payments workflows, APIs and dashboards for European teams.</p>",
      url: "https://example.com/jobs/product-analyst"
    }),
    {
      roleTitle: "Product Analyst",
      company: "Example Co",
      location: "Dublin, Ireland",
      jobDescription:
        "Location: Dublin, Ireland Analyse payments workflows, APIs and dashboards for European teams.",
      url: "https://example.com/jobs/product-analyst",
      source: "example.com",
      platform: "Generic",
      pageTitle: "Product Analyst at Example Co"
    }
  )
})

test("stops flattened location parsing at following job sections", () => {
  const details = inferJobPageDetails({
    title: "Founder's Associate",
    description:
      "Location London (Full-time, office-based) Salary: £60,000 – £80,000 + Equity (2–5%) About the Opportunity We are working with a high-growth business. The Role This is a highly dynamic role. Requirements 1–3 years experience.",
    url: "https://example.com/jobs/founders-associate"
  })

  assert.equal(details.location, "London (Full-time, office-based)")
  assert.ok(details.jobDescription.includes("Salary: £60,000"))
  assert.ok(details.jobDescription.includes("Requirements 1–3 years"))
})

test("rejects job description paragraphs as location values", () => {
  const details = inferJobPageDetails({
    title: "Operations Associate",
    description:
      "Location We are working with a profitable company to hire an operator who will own projects across sales, marketing and support. Requirements Excellent communication skills. Application Send your CV.",
    url: "https://example.com/jobs/operations-associate"
  })

  assert.equal(details.location, "")
  assert.ok(details.jobDescription.includes("Requirements Excellent"))
})

test("ignores scraped paragraph text in explicit job fields", () => {
  const badScrape =
    "Location We are working with a profitable company to hire an operator who will own projects across sales, marketing and support. Requirements Excellent communication skills. Application Send your CV."
  const details = inferJobPageDetails({
    title: "Senior Product Analyst at Example Co - Careers",
    heading: badScrape,
    company: badScrape,
    location: badScrape,
    description:
      "Location: Dublin, Ireland Analyse payments workflows, APIs and dashboards for European teams.",
    url: "https://example.com/jobs/product-analyst"
  })

  assert.equal(details.roleTitle, "")
  assert.equal(details.company, "")
  assert.equal(details.location, "Dublin, Ireland")
  assert.equal(
    details.jobDescription,
    "Location: Dublin, Ireland Analyse payments workflows, APIs and dashboards for European teams."
  )
})

test("detects priority job platforms from urls", () => {
  assert.equal(getJobPlatform("https://www.linkedin.com/jobs/view/123"), "LinkedIn")
  assert.equal(getJobPlatform("https://jobs.linkedin.com/view/123"), "LinkedIn")
  assert.equal(getJobPlatform("https://www.stepstone.de/stellenangebote--123"), "Stepstone")
  assert.equal(getJobPlatform("https://uk.indeed.com/viewjob?jk=123"), "Indeed")
  assert.equal(getJobPlatform("https://de.indeed.com/viewjob?jk=123"), "Indeed")
  assert.equal(getJobPlatform("https://eures.europa.eu/jobs/application-support"), "EURES")
  assert.equal(getJobPlatform("https://eures.ec.europa.eu/jobs/application-support"), "EURES")
  assert.equal(getJobPlatform("https://www.eurotechjobs.com/job/123"), "EuroTechJobs")
  assert.equal(getJobPlatform("https://www.eurojobs.com/jobs/123"), "EuroJobs")
  assert.equal(getJobPlatform("https://www.nextleveljobs.eu/jobs/123"), "NextLevelJobs")
  assert.equal(getJobPlatform("https://wellfound.com/jobs/123"), "Wellfound")
  assert.equal(getJobPlatform("https://angel.co/jobs/123"), "Wellfound")
  assert.equal(getJobPlatform("https://www.xing.com/jobs/acme-application-support-123"), "Xing")
  assert.equal(
    getJobPlatform("https://www.welcometothejungle.com/en/companies/acme/jobs/application-support"),
    "WelcomeToTheJungle"
  )
  assert.equal(
    getJobPlatform("https://www.nationalevacaturebank.nl/vacature/application-support"),
    "NationaleVacaturebank"
  )
  assert.equal(getJobPlatform("https://www.infojobs.net/madrid/application-support/of-i123"), "InfoJobs")
  assert.equal(getJobPlatform("https://www.infojobs.it/offerta-lavoro/application-support"), "InfoJobs")
  assert.equal(getJobPlatform("https://www.monster.co.uk/job-openings/application-support"), "Monster")
  assert.equal(getJobPlatform("https://www.monster.de/stellenangebot/application-support"), "Monster")
  assert.equal(getJobPlatform("https://www.eurotoptech.com/jobs/123"), "EuroTopTech")
  assert.equal(getJobPlatform("https://www.jobteaser.com/en/job-offers/123"), "JobTeaser")
  assert.equal(getJobPlatform("https://boards.greenhouse.io/acme/jobs/123"), "Greenhouse")
  assert.equal(getJobPlatform("https://jobs.lever.co/acme/123"), "Lever")
  assert.equal(getJobPlatform("https://acme.wd3.myworkdayjobs.com/jobs/job/123"), "Workday")
  assert.equal(getJobPlatform("https://jobs.ashbyhq.com/acme/123"), "Ashby")
  assert.equal(getJobPlatform("https://jobs.smartrecruiters.com/acme/123"), "SmartRecruiters")
  assert.equal(getJobPlatform("https://careers.icims.com/jobs/123"), "iCIMS")
  assert.equal(getJobPlatform("https://acme.bamboohr.com/careers/123"), "BambooHR")
  assert.equal(getJobPlatform("https://jobs.teamtailor.com/acme/123"), "Teamtailor")
  assert.equal(getJobPlatform("https://acme.recruitee.com/o/role"), "Recruitee")
  assert.equal(getJobPlatform("https://jobs.jobvite.com/acme/job/123"), "Jobvite")
  assert.equal(getJobPlatform("https://acme.jobs.personio.com/job/123"), "Personio")
  assert.equal(getJobPlatform("https://example.com/jobs/123"), "Generic")
  assert.equal(getJobPlatform("https://notlinkedin.com/jobs/123"), "Generic")
})

test("detects Tier 1 EU JSON-LD boards as priority platforms", () => {
  const boards = [
    ["https://www.stepstone.de/stellenangebote--application-support", "Stepstone"],
    ["https://ie.indeed.com/viewjob?jk=abc123", "Indeed"],
    ["https://eures.europa.eu/jobs/application-support", "EURES"],
    ["https://eures.ec.europa.eu/jobs/application-support", "EURES"],
    ["https://www.eurotechjobs.com/job/123/application-support", "EuroTechJobs"],
    ["https://www.eurojobs.com/job/123", "EuroJobs"],
    ["https://nextleveljobs.eu/jobs/123", "NextLevelJobs"],
    ["https://wellfound.com/jobs/123", "Wellfound"]
  ]

  boards.forEach(([url, platform]) => {
    const details = inferJobPageDetails({
      title: "Application Support Analyst",
      heading: "Application Support Analyst",
      company: "Example Co",
      description: "Support production applications for European customers.",
      salary: "EUR 55000-70000 YEAR",
      employmentType: "FULL_TIME",
      url
    })

    assert.equal(details.platform, platform)
    assert.equal(details.salary, "EUR 55000-70000 YEAR")
    assert.equal(details.employmentType, "FULL_TIME")
  })
})

test("detects Tier 2 EU selector boards as priority platforms", () => {
  const boards = [
    ["https://www.xing.com/jobs/acme-application-support-123", "Xing"],
    [
      "https://www.welcometothejungle.com/en/companies/acme/jobs/application-support",
      "WelcomeToTheJungle"
    ],
    [
      "https://www.nationalevacaturebank.nl/vacature/application-support",
      "NationaleVacaturebank"
    ],
    ["https://www.infojobs.net/madrid/application-support/of-i123", "InfoJobs"],
    ["https://www.monster.fr/emploi/recherche?q=application-support", "Monster"],
    ["https://www.eurotoptech.com/jobs/123", "EuroTopTech"],
    ["https://www.jobteaser.com/en/job-offers/123", "JobTeaser"]
  ]

  boards.forEach(([url, platform]) => {
    const details = inferJobPageDetails({
      title: "Application Support Analyst",
      heading: "Application Support Analyst",
      company: "Example Co",
      location: "Amsterdam, Netherlands",
      description: "Support production applications for European customers.",
      url
    })

    assert.equal(details.platform, platform)
    assert.equal(details.roleTitle, "Application Support Analyst")
    assert.equal(details.company, "Example Co")
    assert.equal(details.location, "Amsterdam, Netherlands")
    assert.equal(details.salary, undefined)
    assert.equal(details.employmentType, undefined)
  })
})

test("marks LinkedIn as visible import with manual application boundary", () => {
  assert.equal(isLinkedInUrl("https://www.linkedin.com/jobs/view/123"), true)
  assert.equal(
    isLinkedInUrl(
      "https://www.linkedin.com/jobs/search-results/?currentJobId=4390984648&keywords=application%20support"
    ),
    true
  )
  assert.equal(isLinkedInUrl("https://uk.linkedin.com/jobs/view/123"), true)
  assert.equal(isLinkedInUrl("https://jobs.lever.co/acme/123"), false)
  assert.match(getLinkedInManualInputMessage(), /import visible job details/i)
  assert.match(getLinkedInManualInputMessage(), /will not auto-submit/i)
})

test("canonicalizes LinkedIn currentJobId search urls", () => {
  assert.equal(
    getLinkedInCanonicalJobUrl(
      "https://www.linkedin.com/jobs/search-results/?currentJobId=4390984648&keywords=application%20support&origin=SUGGESTION"
    ),
    "https://www.linkedin.com/jobs/view/4390984648/"
  )
  assert.equal(
    getLinkedInCanonicalJobUrl("https://www.linkedin.com/jobs/view/123"),
    "https://www.linkedin.com/jobs/view/123/"
  )
  assert.equal(
    getLinkedInCanonicalJobUrl("https://jobs.lever.co/acme/123"),
    "https://jobs.lever.co/acme/123"
  )
  assert.equal(
    getLinkedInCanonicalJobUrl(
      "https://www.linkedin.com/jobs/search-results/?currentJobId=https://www.linkedin.com/jobs/search-results/?currentJobId=4411361553&keywords=application%20support"
    ),
    "https://www.linkedin.com/jobs/view/4411361553/"
  )
})

test("rejects widget fallback text and urls as job details", () => {
  const noisyUrl =
    "https://www.linkedin.com/jobs/search-results/?currentJobId=https://www.linkedin.com/jobs/search-results/?currentJobId=4411361553&keywords=application%20support"
  const details = inferJobPageDetails({
    heading: "Not tracked yet",
    company: "wide",
    location: noisyUrl.repeat(2),
    description: "",
    url: noisyUrl
  })

  assert.equal(details.roleTitle, "")
  assert.equal(details.company, "")
  assert.equal(details.location, "")
  assert.equal(details.url, noisyUrl)
})

test("reads exact LinkedIn title and company from page title", () => {
  assert.deepEqual(
    parseLinkedInPageTitle(
      "Application Support Specialist (L2/L3) | SOFYNE | LinkedIn"
    ),
    {
      company: "SOFYNE",
      title: "Application Support Specialist (L2/L3)"
    }
  )
  assert.deepEqual(parseLinkedInPageTitle("Application Support - LinkedIn"), {
    company: "",
    title: ""
  })
})

test("does not split priority platform page titles into guessed fields", () => {
  assert.deepEqual(
    inferJobPageDetails({
      title: "Job Application for Product Analyst at Example Co",
      url: "https://boards.greenhouse.io/example/jobs/123"
    }),
    {
      roleTitle: "",
      company: "",
      location: "",
      jobDescription: "",
      url: "https://boards.greenhouse.io/example/jobs/123",
      source: "boards.greenhouse.io",
      platform: "Greenhouse",
      pageTitle: "Job Application for Product Analyst at Example Co"
    }
  )

  assert.deepEqual(
    inferJobPageDetails({
      title: "Example Co - Senior Product Analyst - Lever",
      url: "https://jobs.lever.co/example/123"
    }),
    {
      roleTitle: "",
      company: "",
      location: "",
      jobDescription: "",
      url: "https://jobs.lever.co/example/123",
      source: "jobs.lever.co",
      platform: "Lever",
      pageTitle: "Example Co - Senior Product Analyst - Lever"
    }
  )

  assert.deepEqual(
    inferJobPageDetails({
      title: "Job Description - Business Systems Analyst",
      url: "https://example.wd3.myworkdayjobs.com/jobs/job/123"
    }),
    {
      roleTitle: "",
      company: "",
      location: "",
      jobDescription: "",
      url: "https://example.wd3.myworkdayjobs.com/jobs/job/123",
      source: "example.wd3.myworkdayjobs.com",
      platform: "Workday",
      pageTitle: "Job Description - Business Systems Analyst"
    }
  )
})

test("reads priority ATS details from explicit metadata only", () => {
  const cases = [
    {
      input: {
        title: "Senior Data Analyst - Example Co",
        heading: "Senior Data Analyst",
        company: "Example Co",
        location: "Berlin, Germany",
        url: "https://jobs.ashbyhq.com/example/abc123"
      },
      expected: {
        roleTitle: "Senior Data Analyst",
        company: "Example Co",
        location: "Berlin, Germany",
        platform: "Ashby"
      }
    },
    {
      input: {
        title: "Product Operations Analyst | Example Co",
        heading: "Product Operations Analyst",
        company: "Example Co",
        url: "https://jobs.smartrecruiters.com/example/123"
      },
      expected: {
        roleTitle: "Product Operations Analyst",
        company: "Example Co",
        location: "",
        platform: "SmartRecruiters"
      }
    },
    {
      input: {
        title: "Business Analyst - Example Co Careers",
        heading: "Business Analyst",
        company: "Example Co Careers",
        url: "https://careers.icims.com/jobs/123/business-analyst"
      },
      expected: {
        roleTitle: "Business Analyst",
        company: "Example Co Careers",
        location: "",
        platform: "iCIMS"
      }
    },
    {
      input: {
        title: "Application Support Analyst at Example Co",
        heading: "Application Support Analyst",
        company: "Example Co",
        url: "https://example.bamboohr.com/careers/123"
      },
      expected: {
        roleTitle: "Application Support Analyst",
        company: "Example Co",
        location: "",
        platform: "BambooHR"
      }
    },
    {
      input: {
        title: "Systems Analyst - Example Co - Teamtailor",
        heading: "Systems Analyst",
        company: "Example Co",
        url: "https://jobs.teamtailor.com/example/123"
      },
      expected: {
        roleTitle: "Systems Analyst",
        company: "Example Co",
        location: "",
        platform: "Teamtailor"
      }
    },
    {
      input: {
        title: "Implementation Analyst - Example Co - Recruitee",
        heading: "Implementation Analyst",
        company: "Example Co",
        url: "https://example.recruitee.com/o/implementation-analyst"
      },
      expected: {
        roleTitle: "Implementation Analyst",
        company: "Example Co",
        location: "",
        platform: "Recruitee"
      }
    },
    {
      input: {
        title: "Technical Business Analyst | Example Co | Jobvite",
        heading: "Technical Business Analyst",
        company: "Example Co",
        url: "https://jobs.jobvite.com/example/job/123"
      },
      expected: {
        roleTitle: "Technical Business Analyst",
        company: "Example Co",
        location: "",
        platform: "Jobvite"
      }
    },
    {
      input: {
        title: "Revenue Operations Analyst - Example Co",
        heading: "Revenue Operations Analyst",
        company: "Example Co",
        url: "https://example.jobs.personio.com/job/123"
      },
      expected: {
        roleTitle: "Revenue Operations Analyst",
        company: "Example Co",
        location: "",
        platform: "Personio"
      }
    }
  ]

  cases.forEach(({ input, expected }) => {
    const details = inferJobPageDetails(input)

    assert.equal(details.roleTitle, expected.roleTitle)
    assert.equal(details.company, expected.company)
    assert.equal(details.location, expected.location)
    assert.equal(details.platform, expected.platform)
    assert.equal(details.url, input.url)
  })
})

test("extracts JSON-LD JobPosting enrichment from ATS schemas", () => {
  const structured = extractJobPostingFromJsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Example Co"
      },
      {
        "@type": "JobPosting",
        title: "Application Support Analyst",
        hiringOrganization: { name: "Example Co" },
        jobLocation: {
          "@type": "Place",
          address: {
            addressLocality: "London",
            addressCountry: "United Kingdom"
          }
        },
        baseSalary: {
          "@type": "MonetaryAmount",
          currency: "GBP",
          value: {
            "@type": "QuantitativeValue",
            minValue: 50000,
            maxValue: 65000,
            unitText: "YEAR"
          }
        },
        employmentType: ["FULL_TIME", "CONTRACTOR"],
        description:
          "<p>Own EU application support for production systems.</p><p>Partner with engineering and operations teams.</p>"
      }
    ]
  })

  assert.deepEqual(structured, {
    roleTitle: "Application Support Analyst",
    company: "Example Co",
    location: "London, United Kingdom",
    salary: "GBP 50000-65000 YEAR",
    employmentType: "FULL_TIME, CONTRACTOR",
    description:
      "Own EU application support for production systems. Partner with engineering and operations teams."
  })
})

test("formats imported job page notes from detected metadata", () => {
  assert.equal(
    formatJobPageNotes({
      roleTitle: "Staff Backend Engineer",
      company: "Example Co",
      location: "London, United Kingdom",
      jobDescription: "",
      salary: "GBP 50000-60000 YEAR",
      employmentType: "FULL_TIME",
      url: "https://jobs.example.co/backend",
      source: "jobs.example.co",
      platform: "Generic",
      pageTitle: "Backend Engineer | Example Jobs"
    }),
    [
      "Location: London, United Kingdom",
      "Salary: GBP 50000-60000 YEAR",
      "Employment type: FULL_TIME",
      "Source: jobs.example.co",
      "Page title: Backend Engineer | Example Jobs"
    ].join("\n")
  )

  assert.equal(
    formatJobPageNotes({
      roleTitle: "Senior Frontend Engineer",
      company: "Example Co",
      location: "",
      jobDescription: "",
      url: "https://example.com/jobs/frontend",
      source: "example.com",
      platform: "Generic",
      pageTitle: "Senior Frontend Engineer at Example Co - Careers"
    }),
    [
      "Source: example.com",
      "Page title: Senior Frontend Engineer at Example Co - Careers"
    ].join("\n")
  )
})

test("formats priority platform in job page notes", () => {
  assert.equal(
    formatJobPageNotes({
      roleTitle: "Product Analyst",
      company: "Example Co",
      location: "London",
      jobDescription: "",
      url: "https://www.linkedin.com/jobs/view/123",
      source: "linkedin.com",
      platform: "LinkedIn",
      pageTitle: "Product Analyst | Example Co | LinkedIn"
    }),
    [
      "Location: London",
      "Platform: LinkedIn",
      "Source: linkedin.com",
      "Page title: Product Analyst | Example Co | LinkedIn"
    ].join("\n")
  )
})

test("infers transparent job fit analysis", () => {
  const analysis = inferJobFitAnalysis(
    {
      jobTitle: "FinTech Business Analyst",
      company: "Example Bank",
      jobUrl: "https://example.com/jobs/business-analyst",
      location: "United Kingdom",
      workMode: "hybrid",
      jobDescription: "",
      notes: "Payments platform requirements and stakeholder delivery."
    },
    {
      fullName: "Rajan Kumar",
      email: "rajan@example.com",
      phone: "+44 1234 567890",
      currentCountry: "United Kingdom",
      currentCity: "London",
      sponsorshipNeeded: false,
      relocationWillingness: "depends",
      noticePeriod: "1 month"
    }
  )

  assert.equal(analysis.recommendation, "High Priority")
  assert.equal(analysis.fitScore, 100)
  assert.equal(
    analysis.positioningAngle,
    "Position around FinTech systems, application support, and cross-functional delivery."
  )
  assert.ok(
    analysis.scoreFactors?.includes(
      "Role title aligns with the target analyst/systems role family."
    )
  )
  assert.deepEqual(analysis.skills, [
    "Requirements analysis",
    "Stakeholder management",
    "Payments",
    "FinTech"
  ])
  assert.equal(analysis.seniority, "Mid-level")
  assert.match(analysis.summary, /FinTech Business Analyst at Example Bank/)
  assert.ok(
    analysis.gaps?.includes(
      "Pasted job description is missing, so requirements may be incomplete."
    )
  )
})

test("uses pasted job description text in job fit analysis", () => {
  const analysis = inferJobFitAnalysis(
    {
      jobTitle: "Associate Consultant",
      company: "Example Co",
      jobUrl: "https://example.com/jobs/consultant",
      location: "United Kingdom",
      workMode: "remote",
      jobDescription:
        "Business analyst role supporting payments requirements and systems stakeholders.",
      notes: ""
    },
    null
  )

  assert.equal(analysis.recommendation, "High Priority")
  assert.equal(
    analysis.positioningAngle,
    "Position around FinTech systems, application support, and cross-functional delivery."
  )
  assert.ok(
    analysis.scoreFactors?.includes(
      "Role title aligns with the target analyst/systems role family."
    )
  )
})

test("infers location from pasted job descriptions", () => {
  assert.equal(
    inferLocationFromJobDescription(
      "Role: Business Analyst\nLocation: London, United Kingdom\nWe work hybrid."
    ),
    "London, United Kingdom"
  )
  assert.equal(
    inferLocationFromJobDescription(
      "This is a hybrid role based in Manchester, United Kingdom."
    ),
    "Manchester, United Kingdom"
  )
  assert.equal(
    inferLocationFromJobDescription(
      "Remote role open to candidates across the UK."
    ),
    ""
  )
  assert.equal(
    inferLocationFromJobDescription("No location is listed in this posting."),
    ""
  )
})

test("saves and loads candidate profile", async () => {
  resetStorage()

  const profile = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+44 1234",
    linkedInUrl: "https://www.linkedin.com/in/ada",
    githubUrl: "https://github.com/ada",
    portfolioUrl: "https://ada.example.com",
    currentCountry: "United Kingdom",
    currentCity: "London",
    targetCountries: "United Kingdom, Germany, Netherlands",
    targetRoles: "Business Analyst, Product Analyst",
    workRightDetails: "Graduate visa until 2027.",
    sponsorshipNeeded: false,
    relocationWillingness: "depends",
    salaryExpectation: "GBP 45,000+",
    noticePeriod: "1 month",
    baseCvText: "Analyst CV with payments and systems delivery experience.",
    projectSummaries: "Payments migration; operations dashboard.",
    experienceHighlights: "Stakeholder management, requirements, UAT."
  }

  await saveProfile(profile)

  assert.deepEqual(await getProfile(), profile)

  await clearProfile()

  assert.equal(await getProfile(), null)
})

test("loads legacy candidate profile with expanded memory defaults", async () => {
  resetStorage()

  await chrome.storage.local.set({
    "candidate-profile": {
      fullName: "Grace Hopper",
      email: "grace@example.com",
      phone: "+1 555 0100",
      currentCountry: "United States",
      currentCity: "Arlington",
      sponsorshipNeeded: true,
      relocationWillingness: "yes",
      noticePeriod: "2 months"
    }
  })

  assert.deepEqual(await getProfile(), {
    fullName: "Grace Hopper",
    email: "grace@example.com",
    phone: "+1 555 0100",
    linkedInUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    currentCountry: "United States",
    currentCity: "Arlington",
    targetCountries: "",
    targetRoles: "",
    workRightDetails: "",
    sponsorshipNeeded: true,
    relocationWillingness: "yes",
    salaryExpectation: "",
    noticePeriod: "2 months",
    baseCvText: "",
    projectSummaries: "",
    experienceHighlights: ""
  })
})

test("saves and loads reusable answers", async () => {
  resetStorage()

  const answers = {
    sponsorshipAnswer: "I do not require sponsorship.",
    relocationAnswer: "I am open to relocation.",
    workAuthorisationAnswer: "I am authorised to work.",
    noticePeriodAnswer: "My notice period is one month.",
    salaryExpectationAnswer: "My expected salary is GBP 45,000.",
    motivationAnswer: "I am motivated by product delivery.",
    strengthsAnswer: "My strengths are analysis and UAT.",
    availabilityAnswer: "I am available for interviews next week."
  }

  await saveReusableAnswers(answers)

  assert.deepEqual(await getReusableAnswers(), answers)

  await clearReusableAnswers()

  assert.equal(await getReusableAnswers(), null)
})

test("logs and clears AI usage entries", async () => {
  resetStorage()

  const entry = await logAIUsage({
    featureName: "Application content generation",
    model: "local-template",
    approximateCostUsd: 0,
    createdAt: "2026-05-02T12:00:00.000Z"
  })

  assert.equal(entry.featureName, "Application content generation")
  assert.equal(entry.model, "local-template")
  assert.equal(entry.approximateCostUsd, 0)
  assert.equal(entry.createdAt, "2026-05-02T12:00:00.000Z")

  await logAIUsage({
    featureName: "Job analysis",
    model: "controlled-cost-model",
    approximateCostUsd: 0.004,
    createdAt: "2026-05-02T12:01:00.000Z"
  })

  assert.deepEqual(
    (await getAIUsageLog()).map((usageEntry) => ({
      featureName: usageEntry.featureName,
      model: usageEntry.model,
      approximateCostUsd: usageEntry.approximateCostUsd,
      createdAt: usageEntry.createdAt
    })),
    [
      {
        featureName: "Job analysis",
        model: "controlled-cost-model",
        approximateCostUsd: 0.004,
        createdAt: "2026-05-02T12:01:00.000Z"
      },
      {
        featureName: "Application content generation",
        model: "local-template",
        approximateCostUsd: 0,
        createdAt: "2026-05-02T12:00:00.000Z"
      }
    ]
  )

  await clearAIUsageLog()

  assert.deepEqual(await getAIUsageLog(), [])
})

test("saves and clears account session", async () => {
  resetStorage()

  await saveAccountSession({
    authToken: "supabase-token",
    email: "user@example.com",
    plan: "pro"
  })

  assert.deepEqual(await getAccountSession(), {
    authToken: "supabase-token",
    email: "user@example.com",
    plan: "pro"
  })

  await clearAccountSession()

  assert.equal(await getAccountSession(), null)
})

test("clears legacy OpenAI settings", async () => {
  resetStorage()

  await chrome.storage.local.set({
    "openai-settings": {
      apiKey: "sk-test",
      model: "gpt-4.1-mini",
      monthlyBudgetUsd: 2
    }
  })

  await clearLegacyOpenAISettings()

  assert.deepEqual(await chrome.storage.local.get("openai-settings"), {
    "openai-settings": undefined
  })
})

test("estimates OpenAI usage cost from token counts", () => {
  assert.equal(
    estimateOpenAICostUsd("gpt-4.1-mini", {
      input_tokens: 1000,
      output_tokens: 500
    }),
    0.0012
  )
})

test("formats AI errors for user-visible status", () => {
  assert.equal(
    getOpenAIErrorMessage(new Error("OpenAI request failed with 401")),
    "OpenAI request failed with 401"
  )
  assert.equal(
    getOpenAIErrorMessage(new SyntaxError("Unexpected token")),
    "AutoTime AI returned a response that was not valid JSON."
  )
})

test("normalizes partial AI application content", () => {
  assert.deepEqual(
    normalizeAIApplicationContent({
      coverLetter: "Cover letter.",
      motivationAnswer: "Motivation."
    }),
    {
      coverLetter: "Cover letter.",
      profileSummary: "",
      motivationAnswer: "Motivation.",
      strengthsAnswer: "",
      availabilityAnswer: ""
    }
  )
})

test("normalizes partial AI job analysis", () => {
  assert.deepEqual(
    normalizeAIJobAnalysis({
      fitScore: 150,
      recommendation: "Invalid label",
      scoreFactors: ["Clear fit", 1],
      skills: ["Payments", null],
      gaps: ["Check sponsorship"]
    }),
    {
      fitScore: 100,
      recommendation: "Stretch",
      positioningAngle: "",
      scoreFactors: ["Clear fit"],
      skills: ["Payments"],
      seniority: "",
      summary: "",
      gaps: ["Check sponsorship"]
    }
  )
})

test("normalizes legacy AI usage log entries", async () => {
  resetStorage()

  await chrome.storage.local.set({
    "ai-usage-log": [
      {
        featureName: "Legacy feature"
      }
    ]
  })

  const [entry] = await getAIUsageLog()

  assert.equal(entry.featureName, "Legacy feature")
  assert.equal(entry.model, "unknown")
  assert.equal(entry.approximateCostUsd, 0)
  assert.equal(typeof entry.id, "string")
  assert.equal(typeof entry.createdAt, "string")
})

test("loads legacy reusable answers with snippet defaults", async () => {
  resetStorage()

  await chrome.storage.local.set({
    "reusable-answers": {
      sponsorshipAnswer: "I do not require sponsorship.",
      relocationAnswer: "I am open to relocation.",
      workAuthorisationAnswer: "I am authorised to work.",
      noticePeriodAnswer: "My notice period is one month."
    }
  })

  assert.deepEqual(await getReusableAnswers(), {
    sponsorshipAnswer: "I do not require sponsorship.",
    relocationAnswer: "I am open to relocation.",
    workAuthorisationAnswer: "I am authorised to work.",
    noticePeriodAnswer: "My notice period is one month.",
    salaryExpectationAnswer: "",
    motivationAnswer: "",
    strengthsAnswer: "",
    availabilityAnswer: ""
  })
})

test("saves and loads job analysis draft", async () => {
  resetStorage()

  const draft = {
    jobTitle: "Frontend Engineer",
    company: "Example Co",
    jobUrl: "https://example.com/jobs/frontend",
    location: "Germany",
    workMode: "remote",
    jobDescription: "Frontend role using React and TypeScript.",
    notes: "Manual notes only."
  }

  await saveJobAnalysisDraft(draft)

  assert.deepEqual(await getJobAnalysisDraft(), draft)

  await clearJobAnalysisDraft()

  assert.equal(await getJobAnalysisDraft(), null)
})

test("loads legacy job analysis draft without pasted description", async () => {
  resetStorage()

  await chrome.storage.local.set({
    "job-analysis-draft": {
      jobTitle: "Legacy Analyst",
      company: "Example Co",
      jobUrl: "https://example.com/jobs/legacy",
      location: "United Kingdom",
      workMode: "hybrid",
      notes: "Saved before pasted descriptions existed."
    }
  })

  assert.deepEqual(await getJobAnalysisDraft(), {
    jobTitle: "Legacy Analyst",
    company: "Example Co",
    jobUrl: "https://example.com/jobs/legacy",
    location: "United Kingdom",
    workMode: "hybrid",
    jobDescription: "",
    notes: "Saved before pasted descriptions existed."
  })
})

test("loads legacy job analysis recommendation as spec label", async () => {
  resetStorage()

  await chrome.storage.local.set({
    "job-analysis-draft": {
      jobTitle: "Legacy Analyst",
      company: "Example Co",
      jobUrl: "https://example.com/jobs/legacy",
      location: "United Kingdom",
      workMode: "hybrid",
      jobDescription: "",
      notes: "",
      fitScore: 76,
      recommendation: "strong-fit"
    }
  })

  assert.deepEqual(await getJobAnalysisDraft(), {
    jobTitle: "Legacy Analyst",
    company: "Example Co",
    jobUrl: "https://example.com/jobs/legacy",
    location: "United Kingdom",
    workMode: "hybrid",
    jobDescription: "",
    notes: "",
    fitScore: 76,
    recommendation: "High Priority"
  })
})

test("saves and loads application content draft", async () => {
  resetStorage()

  const draft = {
    coverLetter: "Dear hiring team...",
    profileSummary: "Frontend engineer with EU product experience.",
    motivationAnswer: "I am interested in this role because...",
    strengthsAnswer: "My strengths include...",
    availabilityAnswer: "I am available after one month."
  }

  await saveApplicationContentDraft(draft)

  assert.deepEqual(await getApplicationContentDraft(), draft)

  await clearApplicationContentDraft()

  assert.equal(await getApplicationContentDraft(), null)
})

test("generates application content from saved profile and job analysis", () => {
  const draft = generateApplicationContentDraft(
    {
      fullName: "Rajan Kumar",
      email: "rajan@example.com",
      phone: "+44 1234 567890",
      linkedInUrl: "https://www.linkedin.com/in/rajan",
      githubUrl: "",
      portfolioUrl: "",
      currentCountry: "United Kingdom",
      currentCity: "London",
      targetCountries: "United Kingdom, Netherlands",
      targetRoles: "Business Analyst, Application Analyst",
      workRightDetails: "Graduate visa with UK work authorisation.",
      sponsorshipNeeded: false,
      relocationWillingness: "depends",
      salaryExpectation: "GBP 45,000+",
      noticePeriod: "1 month",
      baseCvText: "Business analyst with payments and systems delivery experience.",
      projectSummaries: "Payments migration and operations dashboard delivery.",
      experienceHighlights: "Requirements analysis, UAT, stakeholder management."
    },
    {
      jobTitle: "FinTech Business Analyst",
      company: "Example Bank",
      jobUrl: "https://example.com/jobs/business-analyst",
      location: "United Kingdom",
      workMode: "hybrid",
      jobDescription: "Payments requirements and stakeholder delivery.",
      notes: "",
      positioningAngle:
        "Position around FinTech systems, application support, and cross-functional delivery.",
      scoreFactors: [
        "Role title aligns with the target analyst/systems role family.",
        "Job location matches the saved current country."
      ]
    },
    {
      sponsorshipAnswer: "I do not require sponsorship.",
      relocationAnswer: "I am open to relocation.",
      workAuthorisationAnswer: "I am authorised to work in the UK.",
      noticePeriodAnswer: "My notice period is one month.",
      salaryExpectationAnswer: "My expected salary is GBP 45,000.",
      motivationAnswer: "I want this role because it matches my BA focus.",
      strengthsAnswer: "Requirements analysis and UAT are my strengths.",
      availabilityAnswer: "I am available for interviews next week."
    }
  )

  assert.match(draft.coverLetter, /FinTech Business Analyst/)
  assert.match(draft.coverLetter, /Example Bank/)
  assert.match(draft.profileSummary, /Rajan Kumar/)
  assert.equal(
    draft.motivationAnswer,
    "I want this role because it matches my BA focus."
  )
  assert.equal(
    draft.strengthsAnswer,
    "Requirements analysis and UAT are my strengths."
  )
  assert.equal(
    draft.availabilityAnswer,
    "I am available for interviews next week."
  )
})

test("saves and loads tracker draft", async () => {
  resetStorage()

  const draft = {
    roleTitle: "Frontend Engineer",
    company: "Example Co",
    applicationUrl: "https://example.com/jobs/frontend",
    status: "Applying",
    nextAction: "Tailor cover letter",
    nextActionDate: "2026-05-01",
    notes: "Manual tracker draft only.",
    contentSnapshot: {
      coverLetter: "Cover letter snapshot with enough detail.",
      profileSummary: "Profile summary snapshot.",
      motivationAnswer: "Motivation snapshot.",
      strengthsAnswer: "Strengths snapshot.",
      availabilityAnswer: "Availability snapshot.",
      savedAt: "2026-05-01T12:00:00.000Z"
    }
  }

  await saveTrackerDraft(draft)

  assert.deepEqual(await getTrackerDraft(), draft)

  await clearTrackerDraft()

  assert.equal(await getTrackerDraft(), null)
})

test("loads legacy tracker status as spec status", async () => {
  resetStorage()

  await chrome.storage.local.set({
    "tracker-draft": {
      roleTitle: "Frontend Engineer",
      company: "Example Co",
      applicationUrl: "https://example.com/jobs/frontend",
      status: "draft",
      nextAction: "Tailor cover letter",
      nextActionDate: "2026-05-01",
      notes: "Legacy status value."
    }
  })

  assert.deepEqual(await getTrackerDraft(), {
    roleTitle: "Frontend Engineer",
    company: "Example Co",
    applicationUrl: "https://example.com/jobs/frontend",
    status: "Saved",
    nextAction: "Tailor cover letter",
    nextActionDate: "2026-05-01",
    notes: "Legacy status value."
  })
})

test("normalizes legacy tracker content snapshot defaults", async () => {
  resetStorage()

  await chrome.storage.local.set({
    "tracker-draft": {
      roleTitle: "Frontend Engineer",
      company: "Example Co",
      applicationUrl: "https://example.com/jobs/frontend",
      status: "applied",
      nextAction: "Follow up",
      nextActionDate: "2026-05-01",
      notes: "Partial legacy snapshot.",
      contentSnapshot: {
        coverLetter: "Saved cover letter."
      }
    }
  })

  const draft = await getTrackerDraft()

  assert.equal(draft.status, "Applied")
  assert.equal(draft.contentSnapshot.coverLetter, "Saved cover letter.")
  assert.equal(draft.contentSnapshot.profileSummary, "")
  assert.equal(typeof draft.contentSnapshot.savedAt, "string")
})

test("validates missing and mismatched profile fields", () => {
  const issues = validateProfile({
    fullName: "",
    email: "not-an-email",
    phone: "abc",
    currentCountry: "",
    currentCity: "",
    targetCountries: "",
    targetRoles: "",
    workRightDetails: "",
    sponsorshipNeeded: false,
    relocationWillingness: "depends",
    noticePeriod: "",
    baseCvText: ""
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    [
      "fullName",
      "targetCountries",
      "targetRoles",
      "workRightDetails",
      "baseCvText",
      "email",
      "phone"
    ]
  )
})

test("validates profile phone against selected country calling code", () => {
  const issues = validateProfile({
    fullName: "Rajan Kumar",
    email: "rajan@example.com",
    phone: "+1 202 555 0199",
    currentCountry: "United Kingdom",
    currentCity: "London",
    targetCountries: "United Kingdom",
    targetRoles: "Business Analyst",
    workRightDetails: "Right to work in the UK.",
    sponsorshipNeeded: false,
    relocationWillingness: "depends",
    noticePeriod: "1 month",
    baseCvText: "Business analyst with UAT and stakeholder experience."
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    ["phone"]
  )
  assert.equal(
    issues[0]?.message,
    "Phone must start with United Kingdom's calling code (+44)."
  )
})

test("validates job analysis draft fields", () => {
  const issues = validateJobAnalysisDraft({
    jobTitle: "",
    company: "",
    jobUrl: "ftp://example.com/job",
    location: "",
    workMode: "unknown",
    jobDescription: "",
    notes: ""
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    ["jobTitle", "company", "location", "workMode", "jobUrl"]
  )
})

test("validates application content draft fields", () => {
  const issues = validateApplicationContentDraft({
    coverLetter: "Too short",
    profileSummary: "Short",
    motivationAnswer: "",
    strengthsAnswer: "",
    availabilityAnswer: ""
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    ["motivationAnswer", "coverLetter", "profileSummary"]
  )
})

test("validates application content minimum word counts", () => {
  assert.equal(countWords("  three clear words  "), 3)

  const issues = validateApplicationContentDraft({
    coverLetter:
      "This cover letter has more detail but still not nearly enough words for a credible saved application draft.",
    profileSummary:
      "Analyst with payments experience, stakeholder management, UAT, and delivery.",
    motivationAnswer:
      "This role matches my product analysis background and interest in delivery.",
    strengthsAnswer: "Stakeholder management and requirements analysis.",
    availabilityAnswer: "Next week."
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    [
      "coverLetter",
      "profileSummary",
      "motivationAnswer",
      "strengthsAnswer",
      "availabilityAnswer"
    ]
  )
  assert.ok(
    issues.every((issue) => issue.message.includes("must be at least"))
  )
})

test("validates reusable answer fields", () => {
  const issues = validateReusableAnswers({
    sponsorshipAnswer: "",
    relocationAnswer: "",
    workAuthorisationAnswer: "",
    noticePeriodAnswer: ""
  })

  assert.deepEqual(issues, [])
})

test("validates reusable answer minimum word counts when provided", () => {
  const issues = validateReusableAnswers({
    sponsorshipAnswer: "No sponsorship needed.",
    relocationAnswer: "Open to relocate.",
    workAuthorisationAnswer: "I can work.",
    noticePeriodAnswer: "One month.",
    salaryExpectationAnswer: "GBP 45k",
    motivationAnswer: "Strong match.",
    strengthsAnswer: "Requirements and UAT.",
    availabilityAnswer: "Next week."
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    [
      "sponsorshipAnswer",
      "relocationAnswer",
      "workAuthorisationAnswer",
      "noticePeriodAnswer",
      "salaryExpectationAnswer",
      "motivationAnswer",
      "strengthsAnswer",
      "availabilityAnswer"
    ]
  )
})

test("validates tracker draft fields", () => {
  const issues = validateTrackerDraft({
    roleTitle: "",
    company: "",
    applicationUrl: "not-a-url",
    status: "Saved",
    nextAction: "",
    nextActionDate: "not-a-date",
    notes: ""
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    ["roleTitle", "company", "nextAction", "applicationUrl", "nextActionDate"]
  )
})

test("saves applications newest first and deletes by id", async () => {
  resetStorage()

  const first = {
    id: "first",
    title: "First role",
    url: "https://example.com/first",
    createdAt: "2026-04-01T00:00:00.000Z",
    status: "Saved"
  }

  const second = {
    id: "second",
    title: "Second role",
    url: "https://example.com/second",
    createdAt: "2026-04-02T00:00:00.000Z",
    status: "Saved"
  }

  await saveApplication(first)
  await saveApplication(second)

  assert.deepEqual(await getApplications(), [second, first])

  await deleteApplication("second")

  assert.deepEqual(await getApplications(), [first])
})

test("loads legacy application statuses as spec statuses", async () => {
  resetStorage()

  await chrome.storage.local.set({
    "saved-applications": [
      {
        id: "draft",
        title: "Saved role",
        url: "https://example.com/saved",
        createdAt: "2026-04-01T00:00:00.000Z",
        status: "draft"
      },
      {
        id: "offer",
        title: "Closed role",
        url: "https://example.com/closed",
        createdAt: "2026-04-02T00:00:00.000Z",
        status: "offer"
      }
    ]
  })

  assert.deepEqual(
    (await getApplications()).map((application) => ({
      id: application.id,
      status: application.status
    })),
    [
      { id: "draft", status: "Saved" },
      { id: "offer", status: "Closed" }
    ]
  )
})

test("updates application tracker fields", async () => {
  resetStorage()

  const record = {
    id: "application",
    title: "Saved role",
    url: "https://example.com/role",
    createdAt: "2026-04-03T00:00:00.000Z",
    status: "Saved"
  }

  await saveApplication(record)
  await updateApplication("application", {
    company: "Example Co",
    roleTitle: "Frontend Engineer",
    source: "example.com",
    status: "Interview",
    nextAction: "Send follow-up",
    nextActionDate: "2026-04-10",
    notes: "Recruiter screen booked."
  })

  assert.deepEqual(await getApplications(), [
    {
      ...record,
      company: "Example Co",
      roleTitle: "Frontend Engineer",
      source: "example.com",
      status: "Interview",
      nextAction: "Send follow-up",
      nextActionDate: "2026-04-10",
      notes: "Recruiter screen booked."
    }
  ])
})

test("merges extension tracked jobs into dashboard applications without duplicates", () => {
  const localApplications = [
    {
      id: "local",
      title: "Local role",
      url: "https://Example.com/jobs/123#details",
      createdAt: "2026-04-03T00:00:00.000Z",
      status: "Saved"
    }
  ]
  const dashboardApplications = [
    {
      id: "remote-duplicate",
      title: "Remote duplicate role",
      url: "https://example.com/jobs/123",
      createdAt: "2026-04-02T00:00:00.000Z",
      status: "Saved"
    },
    {
      id: "remote",
      title: "Remote role",
      url: "https://example.com/jobs/456",
      createdAt: "2026-04-01T00:00:00.000Z",
      status: "Applied"
    }
  ]

  assert.deepEqual(
    mergeDashboardApplications(localApplications, dashboardApplications).map(
      (application) => application.id
    ),
    ["remote-duplicate", "remote"]
  )
})

test("filters applications by query and status", () => {
  const applications = [
    {
      id: "draft",
      title: "Original title",
      roleTitle: "Frontend Engineer",
      company: "Example Co",
      source: "example.com",
      url: "https://example.com/jobs/frontend",
      notes: "React role",
      createdAt: "2026-04-01T00:00:00.000Z",
      status: "Saved"
    },
    {
      id: "interview",
      title: "Backend Engineer",
      company: "Server Co",
      source: "server.example",
      url: "https://server.example/jobs/backend",
      nextAction: "Prepare system design notes",
      notes: "Recruiter screen booked",
      createdAt: "2026-04-02T00:00:00.000Z",
      status: "Interview"
    }
  ]

  assert.deepEqual(
    filterApplications(applications, "react", "all").map(
      (application) => application.id
    ),
    ["draft"]
  )

  assert.deepEqual(
    filterApplications(applications, "engineer", "Interview").map(
      (application) => application.id
    ),
    ["interview"]
  )

  assert.deepEqual(filterApplications(applications, "missing", "all"), [])
  assert.deepEqual(
    filterApplications(applications, "system design", "all").map(
      (application) => application.id
    ),
    ["interview"]
  )
})

test("detects duplicate application urls", () => {
  const applications = [
    {
      id: "existing",
      title: "Existing role",
      url: "https://Example.com/jobs/123#overview",
      createdAt: "2026-04-01T00:00:00.000Z",
      status: "Saved"
    }
  ]

  assert.equal(
    hasApplicationWithUrl(applications, "https://example.com/jobs/123"),
    true
  )
  assert.equal(
    hasApplicationWithUrl(applications, "https://example.com/jobs/456"),
    false
  )
})

test("exports applications to csv", () => {
  const csv = applicationsToCsv([
    {
      id: "application",
      title: 'Senior "Frontend" Engineer',
      roleTitle: "Frontend Engineer",
      company: "Example Co",
      source: "example.com",
      url: "https://example.com/jobs/frontend",
      nextAction: "Follow up",
      nextActionDate: "2026-04-10",
    notes: "Remote, EU role",
    createdAt: "2026-04-01T00:00:00.000Z",
      status: "Applied",
      contentSnapshot: {
        coverLetter: "Tailored cover letter.",
        profileSummary: "Analyst profile summary.",
        motivationAnswer: "Motivation answer.",
        strengthsAnswer: "Strengths answer.",
        availabilityAnswer: "Available in one month.",
        savedAt: "2026-04-01T12:00:00.000Z"
      }
    }
  ])

  assert.equal(
    csv,
    [
      '"Title","Role Title","Company","URL","Source","Created At","Status","Next Action","Next Action Date","Notes","Content Snapshot Saved At","Snapshot Cover Letter","Snapshot Profile Summary","Snapshot Motivation Answer","Snapshot Strengths Answer","Snapshot Availability Answer"',
      '"Senior ""Frontend"" Engineer","Frontend Engineer","Example Co","https://example.com/jobs/frontend","example.com","2026-04-01T00:00:00.000Z","Applied","Follow up","2026-04-10","Remote, EU role","2026-04-01T12:00:00.000Z","Tailored cover letter.","Analyst profile summary.","Motivation answer.","Strengths answer.","Available in one month."'
    ].join("\n")
  )
})

test("summarizes founder validation metrics from applications", () => {
  const metrics = getApplicationValidationMetrics([
    {
      id: "saved",
      title: "Saved role",
      url: "https://example.com/saved",
      source: "example.com",
      createdAt: "2026-05-01T00:00:00.000Z",
      status: "Saved"
    },
    {
      id: "applied",
      title: "Applied role",
      url: "https://jobs.example.com/applied",
      source: "jobs.example.com",
      nextAction: "Follow up",
      createdAt: "2026-05-02T00:00:00.000Z",
      status: "Applied",
      contentSnapshot: {
        coverLetter: "Cover letter.",
        profileSummary: "Profile summary.",
        motivationAnswer: "Motivation.",
        strengthsAnswer: "Strengths.",
        availabilityAnswer: "Available.",
        savedAt: "2026-05-02T12:00:00.000Z"
      }
    },
    {
      id: "interview",
      title: "Interview role",
      url: "https://jobs.example.com/interview",
      source: "jobs.example.com",
      nextActionDate: "2026-05-10",
      notes: "Recruiter screen booked after tailored application.",
      createdAt: "2026-05-03T00:00:00.000Z",
      status: "Interview"
    }
  ])

  assert.equal(metrics.totalApplications, 3)
  assert.equal(metrics.applicationsWithContentSnapshots, 1)
  assert.equal(metrics.applicationsWithNextActions, 2)
  assert.equal(metrics.applicationsWithOutcomeNotes, 1)
  assert.equal(metrics.contentSnapshotCoveragePercent, 33)
  assert.equal(metrics.nextActionCoveragePercent, 67)
  assert.equal(metrics.outcomeNoteCoveragePercent, 33)
  assert.equal(metrics.statusCounts.Saved, 1)
  assert.equal(metrics.statusCounts.Applied, 1)
  assert.equal(metrics.statusCounts.Interview, 1)
  assert.deepEqual(metrics.sourceCounts, [
    { source: "jobs.example.com", count: 2 },
    { source: "example.com", count: 1 }
  ])
})

test("exports founder validation metrics to csv", () => {
  const csv = validationMetricsToCsv({
    totalApplications: 2,
    applicationsWithContentSnapshots: 1,
    applicationsWithNextActions: 2,
    applicationsWithOutcomeNotes: 1,
    contentSnapshotCoveragePercent: 50,
    nextActionCoveragePercent: 100,
    outcomeNoteCoveragePercent: 50,
    statusCounts: {
      Saved: 0,
      Applying: 0,
      Applied: 1,
      Interview: 1,
      Rejected: 0,
      Closed: 0
    },
    sourceCounts: [{ source: "jobs.example.com", count: 2 }]
  })

  assert.equal(
    csv,
    [
      '"Metric","Value"',
      '"Total applications tracked","2"',
      '"Applications with content snapshots","1"',
      '"Content snapshot coverage percent","50"',
      '"Applications with next actions","2"',
      '"Next action coverage percent","100"',
      '"Applied/interview/closed applications with notes","1"',
      '"Outcome note coverage percent","50"',
      "",
      '"Status","Count"',
      '"Saved","0"',
      '"Applying","0"',
      '"Applied","1"',
      '"Interview","1"',
      '"Rejected","0"',
      '"Closed","0"',
      "",
      '"Source","Count"',
      '"jobs.example.com","2"'
    ].join("\n")
  )
})

test("creates V2 dashboard export compatible with shared schema", () => {
  const dashboardState = createV2DashboardState({
    profile: {
      fullName: "Rajan Patel",
      email: "rajan@example.com",
      phone: "+447700900000",
      linkedInUrl: "https://linkedin.com/in/rajan",
      githubUrl: "https://github.com/rajan",
      portfolioUrl: "https://example.com",
      currentCountry: "United Kingdom",
      currentCity: "London",
      targetCountries: "United Kingdom, Ireland",
      targetRoles: "Business Analyst",
      workRightDetails: "UK work authorisation",
      sponsorshipNeeded: false,
      relocationWillingness: "depends",
      salaryExpectation: "Negotiable",
      noticePeriod: "1 month",
      baseCvText: "Business analyst with payments and UAT experience.",
      projectSummaries: "AutoTime EU Apply project.",
      experienceHighlights: "Requirements analysis and stakeholder management."
    },
    reusableAnswers: {
      sponsorshipAnswer: "I do not require sponsorship.",
      relocationAnswer: "I can discuss relocation for the right role.",
      workAuthorisationAnswer: "I am authorised to work in the UK.",
      noticePeriodAnswer: "My notice period is one month.",
      salaryExpectationAnswer: "My salary expectations are negotiable.",
      motivationAnswer: "I am motivated by useful systems delivery.",
      strengthsAnswer: "Requirements analysis and UAT are my strengths.",
      availabilityAnswer: "I am available for interviews next week."
    },
    jobAnalysis: {
      jobTitle: "Business Systems Analyst",
      company: "Example Bank",
      jobUrl: "https://example.com/jobs/123",
      location: "London, United Kingdom",
      workMode: "hybrid",
      jobDescription:
        "Business analyst role supporting payments requirements and UAT.",
      notes: "Imported from extension",
      fitScore: 85,
      recommendation: "High Priority",
      positioningAngle:
        "Position around FinTech systems and cross-functional delivery."
    },
    applications: [
      {
        id: "app-1",
        title: "Business Systems Analyst",
        roleTitle: "Business Systems Analyst",
        company: "Example Bank",
        url: "https://example.com/jobs/123",
        source: "example.com",
        createdAt: "2026-05-04T09:00:00.000Z",
        status: "Interview",
        nextAction: "Generate prep pack",
        nextActionDate: "2026-05-10",
        notes: "Recruiter screen booked"
      }
    ]
  })

  const parsed = companionDashboardStateSchema.parse(dashboardState)

  assert.equal(parsed.profile.fullName, "Rajan Patel")
  assert.equal(parsed.jobAnalysis.recommendation, "High Priority")
  assert.equal(parsed.applications[0].status, "Interview")
  assert.deepEqual(parsed.interviewPrepPacks, [])
})

test("requires mandatory candidate profile bridge evidence", () => {
  const profile = {
    fullName: "Rajan Patel",
    email: "",
    phone: "",
    linkedInUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    currentCountry: "United Kingdom",
    currentCity: "",
    targetCountries: "United Kingdom, Ireland",
    targetRoles: "Business Analyst",
    workRightDetails: "UK work authorisation",
    sponsorshipNeeded: false,
    relocationWillingness: "depends",
    salaryExpectation: "",
    noticePeriod: "",
    baseCvText: "Business analyst with payments and UAT experience.",
    projectSummaries: "",
    experienceHighlights: ""
  }

  assert.equal(hasCandidateProfileBridgeEvidence(profile), true)
  assert.deepEqual(getCandidateProfileBridgeIssues(profile), [])

  assert.deepEqual(
    getCandidateProfileBridgeIssues({ ...profile, workRightDetails: "" }),
    ["work-right details"]
  )
})

let failed = 0

for (const { name, run } of tests) {
  try {
    await run()
    console.log(`ok - ${name}`)
  } catch (error) {
    failed += 1
    console.error(`not ok - ${name}`)
    console.error(error)
  }
}

if (failed > 0) {
  process.exitCode = 1
}
