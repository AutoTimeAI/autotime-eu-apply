import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const origin = "http://127.0.0.1:4173";
const pages = ["/", "/login"];
const budgets = {
  performance: { minimum: 0.75, severity: "warning" },
  accessibility: { minimum: 0.9, severity: "error" },
  "best-practices": { minimum: 0.85, severity: "warning" },
  seo: { minimum: 0.8, severity: "warning" },
};

const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "4173"],
  {
  cwd: "apps/web",
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
  },
);

server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Web server exited before becoming ready (${server.exitCode}).`);
    }
    try {
      const response = await fetch(origin, { redirect: "manual" });
      if (response.status < 500) {
        if (server.exitCode !== null) {
          throw new Error(`Web server exited before becoming ready (${server.exitCode}).`);
        }
        return;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for the production web server.");
}

async function stopServer() {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
}

let chrome;
try {
  await waitForServer();
  await mkdir("lighthouse-report", { recursive: true });
  chrome = await launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });

  const errors = [];
  for (const path of pages) {
    const result = await lighthouse(`${origin}${path}`, {
      port: chrome.port,
      onlyCategories: Object.keys(budgets),
      formFactor: "desktop",
      screenEmulation: { disabled: true },
      output: ["html", "json"],
    });
    const slug = path === "/" ? "home" : path.slice(1).replaceAll("/", "-");
    const reports = Array.isArray(result.report) ? result.report : [result.report];
    await writeFile(`lighthouse-report/${slug}.html`, reports[0]);
    await writeFile(`lighthouse-report/${slug}.json`, reports[1]);

    const scores = Object.fromEntries(
      Object.entries(result.lhr.categories).map(([id, category]) => [id, category.score]),
    );
    console.log(`Lighthouse scores for ${path}:`, scores);

    for (const [category, budget] of Object.entries(budgets)) {
      const score = scores[category] ?? 0;
      if (score >= budget.minimum) continue;
      const message = `${path} ${category} scored ${score}; minimum ${budget.minimum}`;
      if (budget.severity === "error") errors.push(message);
      else console.warn(`Budget warning: ${message}`);
    }
  }

  if (errors.length) throw new Error(`Lighthouse budget failures:\n${errors.join("\n")}`);
} finally {
  try {
    if (chrome) await chrome.kill();
  } catch (error) {
    console.warn("Chrome cleanup warning:", error instanceof Error ? error.message : error);
  } finally {
    await stopServer();
  }
}

// Some Windows Chrome builds leave inherited handles open after taskkill.
// The audits and report writes are complete here, so do not let those handles
// keep CI alive until its job timeout.
process.exit(process.exitCode ?? 0);
