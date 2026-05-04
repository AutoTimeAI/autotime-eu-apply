import assert from "node:assert/strict"
import {
  getJobPlatform,
  inferJobPageDetails
} from "../apps/extension/lib/job-page.ts"

const liveAtsCases = [
  {
    platform: "Greenhouse",
    title: "Business Analyst - Wealth & Asset Management (London) at Capco",
    url: "https://job-boards.greenhouse.io/capco/jobs/6796278",
    expectedTitle: "Business Analyst"
  },
  {
    platform: "Lever",
    title: "OpenPayd - Technical Business Analyst",
    url: "https://jobs.lever.co/OpenPayd/11cfb95b-581c-4be5-82f0-1c1161626fbc",
    expectedTitle: "Technical Business Analyst"
  },
  {
    platform: "Workday",
    title: "Analyst, STR - London",
    url: "https://costar.wd1.myworkdayjobs.com/en-US/CoStarCareersEurope/job/Analyst--STR---London_R38684",
    expectedTitle: "Analyst"
  },
  {
    platform: "Ashby",
    title: "Product Analyst at Accurx",
    url: "https://jobs.ashbyhq.com/accurx/92c80ced-031a-4823-aecf-04eb3f58b480",
    expectedTitle: "Product Analyst"
  }
]

async function checkLiveReachability(testCase) {
  const response = await fetch(testCase.url, {
    redirect: "follow",
    headers: {
      "user-agent": "autotime-v2-live-ats-validation/1.0"
    }
  })

  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get("content-type") ?? ""
  }
}

async function main() {
  const shouldFetchLivePages = process.env.LIVE_ATS_FETCH === "1"
  const results = []

  for (const testCase of liveAtsCases) {
    const platform = getJobPlatform(testCase.url)
    const details = inferJobPageDetails({
      title: testCase.title,
      url: testCase.url
    })

    assert.equal(platform, testCase.platform)
    assert.equal(details.platform, testCase.platform)
    assert.match(details.roleTitle, new RegExp(testCase.expectedTitle, "i"))

    const live = shouldFetchLivePages
      ? await checkLiveReachability(testCase)
      : { ok: true, status: "not-fetched", contentType: "offline-fixture" }

    results.push({
      platform: testCase.platform,
      url: testCase.url,
      roleTitle: details.roleTitle,
      liveStatus: live.status,
      liveReachable: live.ok,
      contentType: live.contentType
    })
  }

  console.log(JSON.stringify({ ok: true, liveFetch: shouldFetchLivePages, results }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
