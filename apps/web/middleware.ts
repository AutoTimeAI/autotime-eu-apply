import { createServerClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { logDiagnostic, createDiagnostic } from "./lib/diagnostics"
import { publicEnv } from "./lib/env"
import type { Database } from "./lib/supabase/types"

const protectedRoutePrefixes = [
  "/dashboard",
  "/diagnostics",
  "/api/ai",
  "/api/diagnostics",
  "/api/stripe"
]
const publicRoutePrefixes = [
  "/",
  "/pricing",
  "/privacy",
  "/terms",
  "/auth",
  "/login"
]

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

function isProtectedPath(pathname: string): boolean {
  return protectedRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function isPublicPath(pathname: string): boolean {
  return publicRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function applyAuthCookies({
  cookiesToSet,
  headersToSet,
  response
}: {
  cookiesToSet: CookieToSet[]
  headersToSet: Record<string, string>
  response: NextResponse
}): NextResponse {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  Object.entries(headersToSet).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  try {
    const cookiesToSet: CookieToSet[] = []
    const headersToSet: Record<string, string> = {}
    let response = NextResponse.next({ request })

    const supabase = createServerClient<Database>(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(nextCookiesToSet, nextHeadersToSet) {
            nextCookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              cookiesToSet.push({ name, value, options })
            })

            Object.assign(headersToSet, nextHeadersToSet)
            response = applyAuthCookies({
              cookiesToSet,
              headersToSet,
              response: NextResponse.next({ request })
            })
          }
        }
      }
    )

    const {
      data: { user }
    } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname

    if (isProtectedPath(pathname) && !user) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set(
        "redirectTo",
        `${pathname}${request.nextUrl.search}`
      )

      logDiagnostic(
        createDiagnostic({
          area: "auth",
          code: "auth.middleware.protected-redirect",
          message: "Protected route requested without a session",
          request,
          status: 307
        })
      )

      return applyAuthCookies({
        cookiesToSet,
        headersToSet,
        response: NextResponse.redirect(loginUrl)
      })
    }

    if (!isPublicPath(pathname) && !isProtectedPath(pathname)) {
      return response
    }

    return response
  } catch (error: unknown) {
    const pathname = request.nextUrl.pathname

    if (isProtectedPath(pathname)) {
      logDiagnostic(
        createDiagnostic({
          area: "auth",
          code: "auth.middleware.failed",
          message: error instanceof Error ? error.message : "Middleware failed",
          request,
          status: 307
        })
      )

      return NextResponse.redirect(new URL("/login", request.url))
    }

    if (error instanceof Error) {
      return NextResponse.next({ request })
    }

    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
}
