// Deliberately has no next/server import (unlike lib/diagnostics.ts, which
// needs the Next.js runtime and so can't be loaded in isolation by this
// repo's plain node/tsx test runners) - this stays a pure, framework-free
// function so it's directly testable.
type RequestLike = { headers: { get(name: string): string | null } }

export function getRequestIp(request: RequestLike): string {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}
