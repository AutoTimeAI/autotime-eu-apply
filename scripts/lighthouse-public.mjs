import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

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
const runsPerRoute = 3;

function median(values) {
  return [...values].sort((left, right) => left - right)[
    Math.floor(values.length / 2)
  ];
}

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
  const summary = {};
  for (const route of routes) {
    const routeRuns = [];
    for (let run = 1; run <= runsPerRoute; run += 1) {
      const result = await lighthouse(
        `${origin}${route.path}`,
        {
          port: chrome.port,
          onlyCategories: Object.keys(thresholds),
          output: "json",
        },
        desktopConfig,
      );
      const scores = Object.fromEntries(
        Object.entries(result.lhr.categories).map(([id, category]) => [
          id,
          category.score,
        ]),
      );
      routeRuns.push(scores);
      await writeFile(
        new URL(`${route.name}.run-${run}.report.json`, reportDirectory),
        JSON.stringify(result.lhr, null, 2),
      );
      console.log(`${route.path} Lighthouse run ${run}`, scores);
      for (const [category, minimum] of Object.entries(thresholds)) {
        if ((scores[category] ?? 0) < minimum) {
          failures.push(
            `${route.path} run ${run} ${category}: ${scores[category]} < ${minimum}`,
          );
        }
      }
    }
    summary[route.name] = {
      path: route.path,
      runs: routeRuns,
      medians: Object.fromEntries(
        Object.keys(thresholds).map((category) => [
          category,
          median(routeRuns.map((scores) => scores[category] ?? 0)),
        ]),
      ),
    };
  }
  await writeFile(
    new URL("summary.json", reportDirectory),
    JSON.stringify(
      {
        desktopSettings: desktopConfig.settings,
        runsPerRoute,
        thresholds,
        routes: summary,
      },
      null,
      2,
    ),
  );

  if (failures.length) {
    throw new Error(`Lighthouse thresholds failed:\n${failures.join("\n")}`);
  }
} finally {
  if (chrome) {
    try {
      await chrome.kill();
    } catch {
      // Chrome may already have exited; server cleanup must still continue.
    }
  }
  server.kill("SIGTERM");
}
