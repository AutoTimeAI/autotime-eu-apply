import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const origin = "http://127.0.0.1:3000";
const reportDirectory = new URL("../lighthouse-report/", import.meta.url);
const routes = [
  { name: "home", path: "/" },
  { name: "login", path: "/login" },
];
const thresholds = {
  performance: 0.75,
  accessibility: 0.9,
  "best-practices": 0.85,
  seo: 0.8,
};

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await delay(1_000);
  }
  throw new Error(
    "Next.js production server did not become ready within 60 seconds",
  );
}

const nextBin = new URL(
  "../apps/web/node_modules/next/dist/bin/next",
  import.meta.url,
);
const server = spawn(process.execPath, [nextBin.pathname.slice(1), "start"], {
  cwd: new URL("../apps/web/", import.meta.url),
  stdio: "inherit",
});

let chrome;
try {
  await waitForServer();
  await mkdir(reportDirectory, { recursive: true });
  chrome = await launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });

  const failures = [];
  for (const route of routes) {
    const result = await lighthouse(`${origin}${route.path}`, {
      port: chrome.port,
      onlyCategories: Object.keys(thresholds),
      formFactor: "desktop",
      output: "json",
    });
    const scores = Object.fromEntries(
      Object.entries(result.lhr.categories).map(([id, category]) => [
        id,
        category.score,
      ]),
    );
    await writeFile(
      new URL(`${route.name}.report.json`, reportDirectory),
      JSON.stringify(result.lhr, null, 2),
    );
    console.log(`${route.path} Lighthouse scores`, scores);
    for (const [category, minimum] of Object.entries(thresholds)) {
      if ((scores[category] ?? 0) < minimum) {
        failures.push(
          `${route.path} ${category}: ${scores[category]} < ${minimum}`,
        );
      }
    }
  }

  if (failures.length) {
    throw new Error(`Lighthouse thresholds failed:\n${failures.join("\n")}`);
  }
} finally {
  if (chrome) await chrome.kill().catch(() => undefined);
  server.kill("SIGTERM");
}
