import { chromium } from "@playwright/test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const extensionPath = resolve("apps/extension/.output/chrome-mv3")
const profilePath = await mkdtemp(join(tmpdir(), "autotime-extension-validation-"))
const targetUrl = "https://www.stepstone.de/jobs/software-engineer"
let context

try {
  context = await chromium.launchPersistentContext(profilePath, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  })

  let worker = context.serviceWorkers()[0]
  if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 15_000 })
  const extensionId = new URL(worker.url()).host
  const page = context.pages()[0] ?? await context.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 })

  const detailUrl = await page.locator('a[href*="stellenangebote--"]').first().getAttribute("href")
  if (detailUrl) {
    await page.goto(new URL(detailUrl, page.url()).href, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })
  }

  const activeTab = await worker.evaluate(async () => {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    const tab = tabs[0]
    if (!tab?.id) throw new Error("No active target tab")
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "AUTOTIME_SHOW_WIDGET" })
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content-scripts/autotime.js"],
      })
      await chrome.tabs.sendMessage(tab.id, { type: "AUTOTIME_SHOW_WIDGET" })
    }
    return { id: tab.id, url: tab.url }
  })

  await page.waitForSelector("#autotime-draggable-job-widget", { timeout: 15_000 })
  const widget = await page.locator("#autotime-draggable-job-widget").evaluate((host) => ({
    present: true,
    visible: getComputedStyle(host).display !== "none",
    text: host.shadowRoot?.textContent?.replace(/\s+/g, " ").trim() ?? "",
    buttons: [...(host.shadowRoot?.querySelectorAll("button") ?? [])].map((button) => ({
      label: button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "",
      disabled: button.disabled,
    })),
  }))

  const detected = !widget.text.includes("Could not detect job details on this page")
  let persistence = { attempted: false, savedCount: 0 }
  let reloadCheck = { widgetRestored: false, savedCount: 0 }
  if (detected) {
    await page.locator("#autotime-draggable-job-widget").evaluate((host) => {
      host.shadowRoot?.querySelector("[data-autotime-track-job]")?.click()
    })
    await page.waitForTimeout(1_500)
    persistence = await worker.evaluate(async () => {
      const stored = await chrome.storage.local.get(null)
      const candidates = Object.values(stored).filter(Array.isArray).flat()
      return {
        attempted: true,
        savedCount: candidates.filter((value) => value && typeof value === "object" && "url" in value).length,
      }
    })

    await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 })
    await worker.evaluate(async () => {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
      const tab = tabs[0]
      if (!tab?.id) throw new Error("No active target tab after reload")
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content-scripts/autotime.js"],
      })
      await chrome.tabs.sendMessage(tab.id, { type: "AUTOTIME_SHOW_WIDGET" })
    })
    await page.waitForSelector("#autotime-draggable-job-widget", { timeout: 15_000 })
    reloadCheck = await worker.evaluate(async () => {
      const stored = await chrome.storage.local.get(null)
      const candidates = Object.values(stored).filter(Array.isArray).flat()
      return {
        widgetRestored: true,
        savedCount: candidates.filter((value) => value && typeof value === "object" && "url" in value).length,
      }
    })
  }

  console.log(JSON.stringify({
    result: widget.present && widget.visible && detected ? "PASS" : "PARTIAL",
    extensionId,
    workerUrl: worker.url(),
    target: activeTab,
    widget,
    detected,
    persistence,
    reloadCheck,
    pageErrors,
  }, null, 2))
} finally {
  await context?.close()
  await rm(profilePath, { recursive: true, force: true })
}
