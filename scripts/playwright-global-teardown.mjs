/** Explicitly stops the local in-process Next server before Playwright exits. */
export default async function globalTeardown(config) {
  const baseURL = config.projects[0]?.use?.baseURL
  if (typeof baseURL !== "string" || !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?/i.test(baseURL)) {
    return
  }

  try {
    await fetch(new URL("/__playwright_shutdown", baseURL), {
      method: "POST",
      signal: AbortSignal.timeout(3_000),
    })
  } catch {
    // The expected successful path closes the server immediately and may end
    // the connection before fetch observes a complete response.
  }
}
