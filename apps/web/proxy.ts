import { createServerClient } from "@supabase/ssr"
import type { CookieOptions } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { createDiagnostic, logDiagnostic } from "./lib/diagnostics"
import { getSupabasePublicEnv } from "./lib/env"
import {
  configurationUnavailableMessage,
} from "./lib/configuration-error"
import type { Database } from "./lib/supabase/types"
import { getTestAuthUser } from "./lib/test-auth"
import {
  getUnauthenticatedRedirect,
  getProtectedProxyFailure,
  isProtectedPath,
  isPublicPath,
} from "./lib/proxy-policy"

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

function applyAuthCookies({
  cookiesToSet,
  headersToSet,
  response,
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

export async function proxy(request: NextRequest): Promise<NextResponse> {
  try {
    const pathname = request.nextUrl.pathname

    if (
      isPublicPath(pathname) ||
      (!isProtectedPath(pathname) &&
        !request.cookies
          .getAll()
          .some((cookie) => cookie.name.startsWith("sb-")))
    ) {
      return NextResponse.next({ request })
    }

    if (isProtectedPath(pathname) && getTestAuthUser()) {
      return NextResponse.next({ request })
    }

    const cookiesToSet: CookieToSet[] = []
    const headersToSet: Record<string, string> = {}
    let response = NextResponse.next({ request })

    const env = getSupabasePublicEnv()
    const supabase = createServerClient<Database>(env.url, env.anonKey, {
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
            response: NextResponse.next({ request }),
          })
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (isProtectedPath(pathname) && !user) {
      const loginUrl = new URL(
        getUnauthenticatedRedirect(pathname, request.nextUrl.search),
        request.url,
      )

      logDiagnostic(
        createDiagnostic({
          area: "auth",
          code: "auth.proxy.protected-redirect",
          message: "Protected route requested without a session",
          request,
          status: 307,
        }),
      )

      return applyAuthCookies({
        cookiesToSet,
        headersToSet,
        response: NextResponse.redirect(loginUrl),
      })
    }

    if (user && pathname.startsWith("/dashboard")) {
      const isOnboarding = pathname === "/dashboard/onboarding"
      const isOnboardingCvBuilder =
        pathname === "/dashboard/cv-tailor" &&
        request.nextUrl.searchParams
          .get("returnTo")
          ?.startsWith("/dashboard/onboarding")

      if (!isOnboarding && !isOnboardingCvBuilder) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("onboarding_completed_at")
          .eq("user_id", user.id)
          .maybeSingle()

        if (profileError) throw profileError

        if (!profile?.onboarding_completed_at) {
          const onboardingUrl = new URL("/dashboard/onboarding", request.url)
          return applyAuthCookies({
            cookiesToSet,
            headersToSet,
            response: NextResponse.redirect(onboardingUrl),
          })
        }
      }
    }

    if (!isPublicPath(pathname) && !isProtectedPath(pathname)) {
      return response
    }

    return response
  } catch (error: unknown) {
    const pathname = request.nextUrl.pathname

    if (isProtectedPath(pathname)) {
      const configurationFailure = getProtectedProxyFailure(error)
      if (configurationFailure)
        return new NextResponse(configurationFailure.body, {
          status: configurationFailure.status,
        })
      logDiagnostic(
        createDiagnostic({
          area: "auth",
          code: "auth.proxy.failed",
          message: error instanceof Error ? error.message : "Proxy failed",
          request,
          status: 503,
        }),
      )

      return new NextResponse(configurationUnavailableMessage, { status: 503 })
    }

    if (error instanceof Error) {
      return NextResponse.next({ request })
    }

    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
