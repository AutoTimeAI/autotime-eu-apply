/** Runs Next.js in-process so Playwright can shut it down cleanly on Windows. */
import { createServer } from "node:http"
import path from "node:path"
import next from "next"

const port = Number.parseInt(process.argv[2] ?? "3000", 10)
const mode = process.argv[3] ?? "development"
const dev = mode !== "production"
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("A valid TCP port is required")
}

const hostname = "127.0.0.1"
const launcherPid = process.ppid
const app = next({
  dev,
  dir: path.resolve("apps/web"),
  hostname,
  port,
  webpack: mode === "webpack",
})
const handle = app.getRequestHandler()
await app.prepare()

const server = createServer((request, response) => {
  if (request.method === "POST" && request.url === "/__playwright_shutdown") {
    response.writeHead(204).end()
    setImmediate(() => process.exit(0))
    return
  }
  return handle(request, response)
})
await new Promise((resolve, reject) => {
  server.once("error", reject)
  server.listen(port, hostname, resolve)
})

console.log(`Playwright web server ready at http://${hostname}:${port}`)

// Playwright terminates the command shell it launched. On Windows, that does
// not reliably propagate a signal to the Node child, so also exit when that
// launcher disappears instead of leaving the server bound to the test port.
setInterval(() => {
  try {
    process.kill(launcherPid, 0)
  } catch {
    process.exit(0)
  }
}, 500)

let closing = false
async function close() {
  if (closing) return
  closing = true
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  await app.close()
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.once(signal, () => {
    void Promise.race([
      close(),
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ]).finally(() => process.exit(0))
  })
}

process.once("disconnect", () => {
  void Promise.race([
    close(),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]).finally(() => process.exit(0))
})
