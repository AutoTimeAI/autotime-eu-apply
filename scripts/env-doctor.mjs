import fs from "node:fs"
import path from "node:path"

const mode = process.argv.includes("--production")
  ? "production"
  : process.argv.includes("--local")
    ? "local"
    : "process"

const envFile =
  mode === "local"
    ? path.join("apps", "web", ".env.local")
    : mode === "production"
      ? ".env.production"
      : null

const requiredPublic = [
  "NEXT_PUBLIC_AUTOTIME_ENV",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_APP_URL"
]

const requiredServer = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_MONTHLY_PRICE_ID",
  "STRIPE_PRO_ANNUAL_PRICE_ID",
  "RESEND_API_KEY"
]

const adminRequired = ["AUTOTIME_ADMIN_EMAILS"]
const optional = ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"]
const allKeys = [...requiredPublic, ...requiredServer, ...adminRequired, ...optional]

const placeholderPatterns = [
  /^$/,
  /example/i,
  /placeholder/i,
  /offline/i,
  /changeme/i,
  /your[-_]/i,
  /_your_/i,
  /test_(monthly|annual)$/i,
  /price_test_/i,
  /pk_test_your/i,
  /sk_test_your/i,
  /whsec_your/i
]

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { error: `${filePath} does not exist`, values: {} }
  }

  const values = {}
  const content = fs.readFileSync(filePath, "utf8")

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith("#")) {
      continue
    }

    const separator = line.indexOf("=")

    if (separator === -1) {
      continue
    }

    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim().replace(/^"|"$/g, "")
    values[key] = value
  }

  return { error: null, values }
}

function getValues() {
  if (envFile) {
    return parseEnvFile(envFile)
  }

  return { error: null, values: process.env }
}

function isPlaceholder(value) {
  return placeholderPatterns.some((pattern) => pattern.test(value ?? ""))
}

function redact(value) {
  if (!value) {
    return "[empty]"
  }

  if (value.length <= 12) {
    return "[set]"
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

const { error, values } = getValues()
const failures = []
const warnings = []

if (error) {
  failures.push(error)
}

for (const key of [...requiredPublic, ...requiredServer, ...adminRequired]) {
  const value = values[key] ?? ""

  if (!value.trim()) {
    failures.push(`${key} is missing`)
  } else if (isPlaceholder(value)) {
    failures.push(`${key} still looks like a placeholder`)
  }
}

for (const key of optional) {
  const value = values[key] ?? ""

  if (value && isPlaceholder(value)) {
    warnings.push(`${key} looks like a placeholder`)
  }
}

if (values.NEXT_PUBLIC_AUTOTIME_ENV === "production") {
  if (values.NEXT_PUBLIC_APP_URL !== "https://autotime-eu-apply.vercel.app") {
    failures.push("Production NEXT_PUBLIC_APP_URL must be the production app URL")
  }

  if (values.AUTOTIME_TEST_AUTH_ENABLED === "true") {
    failures.push("AUTOTIME_TEST_AUTH_ENABLED must never be true in production")
  }
}

console.log(`AutoTime env doctor (${mode})`)
console.log(`Source: ${envFile ?? "process.env"}`)

for (const key of allKeys) {
  console.log(`${key}=${redact(values[key] ?? "")}`)
}

if (warnings.length) {
  console.warn("\nWarnings:")
  warnings.forEach((item) => console.warn(`- ${item}`))
}

if (failures.length) {
  console.error("\nFailures:")
  failures.forEach((item) => console.error(`- ${item}`))
  process.exitCode = 1
} else {
  console.log("\nEnvironment looks ready for smoke tests.")
}
