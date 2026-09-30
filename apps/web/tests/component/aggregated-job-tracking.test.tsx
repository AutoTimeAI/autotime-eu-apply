import { describe, expect, it } from "vitest";
import { accountAlreadyTracksJob } from "../../lib/aggregated-job-tracking";
import { extractJob } from "../../lib/job-application-workflow";

describe("aggregated job account deduplication", () => {
  it("detects the same listing already tracked by another browser", async () => {
    const existing = extractJob({
      title: "Platform Engineer",
      employer: "Example Ltd",
      description:
        "Platform Engineer at Example Ltd. Build and operate reliable distributed cloud services for customers across Europe.",
      sourceUrl: "https://jobs.example.test/platform?utm_source=feed",
    });
    const candidate = extractJob({
      title: "Platform Engineer",
      employer: "Example Ltd",
      description:
        "Platform Engineer at Example Ltd. Build and operate reliable distributed cloud services for customers across Europe.",
      sourceUrl: "https://jobs.example.test/platform",
    });
    const fetchAccount = async () =>
      new Response(
        JSON.stringify({
          data: { jobs: [existing], applications: [] },
          error: null,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );

    await expect(
      accountAlreadyTracksJob(candidate, fetchAccount),
    ).resolves.toBe(true);
  });

  it("keeps local-first tracking available when account sync is unavailable", async () => {
    const candidate = extractJob({
      title: "Platform Engineer",
      employer: "Example Ltd",
      description:
        "Platform Engineer at Example Ltd. Build and operate reliable distributed cloud services for customers across Europe.",
      sourceUrl: "https://jobs.example.test/platform",
    });

    await expect(
      accountAlreadyTracksJob(candidate, async () => {
        throw new Error("offline");
      }),
    ).resolves.toBe(false);
  });
});
