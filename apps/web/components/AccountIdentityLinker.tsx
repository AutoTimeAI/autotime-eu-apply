"use client"

import { useEffect, useMemo, useState } from "react"
import { reportClientIssue } from "../lib/client-diagnostics"
import { getStatusTone } from "../lib/status-tone"
import { createBrowserClient } from "../lib/supabase/client"

type OAuthProvider = "github" | "google"

type IdentityLinkerProps = {
  compact?: boolean
  returnTo?: string
}

const providers: Array<{ id: OAuthProvider; label: string }> = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" }
]

function getProviderLabel(provider: string) {
  return providers.find((item) => item.id === provider)?.label ?? provider
}

function getLinkQueryParams(provider: OAuthProvider) {
  return provider === "google"
    ? {
        prompt: "consent select_account"
      }
    : undefined
}

export function AccountIdentityLinker({
  compact = false,
  returnTo = "/dashboard/settings"
}: IdentityLinkerProps) {
  const [linkedProviders, setLinkedProviders] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null
  )
  const [status, setStatus] = useState<string | null>(null)
  const linkedProviderSet = useMemo(
    () => new Set(linkedProviders),
    [linkedProviders]
  )

  useEffect(() => {
    let isActive = true

    async function loadIdentities() {
      try {
        const supabase = createBrowserClient()
        const { data, error } = await supabase.auth.getUserIdentities()

        if (!isActive) {
          return
        }

        if (error) {
          setStatus(`Failed: ${error.message}`)
          return
        }

        setLinkedProviders(
          data.identities
            .map((identity) => identity.provider)
            .filter(Boolean)
            .sort()
        )
      } catch (error: unknown) {
        if (!isActive) {
          return
        }

        setStatus(
          error instanceof Error
            ? `Failed: ${error.message}`
            : "Failed: could not read linked sign-in methods."
        )
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadIdentities()

    return () => {
      isActive = false
    }
  }, [])

  const linkProvider = async (provider: OAuthProvider) => {
    try {
      if (linkedProviderSet.has(provider)) {
        setStatus(`${getProviderLabel(provider)} is already linked.`)
        return
      }

      setStatus(`Opening ${getProviderLabel(provider)} linking...`)
      setPendingProvider(provider)

      const supabase = createBrowserClient()
      const callbackUrl = new URL("/auth/callback", window.location.origin)
      callbackUrl.searchParams.set("redirectTo", returnTo)
      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          queryParams: getLinkQueryParams(provider),
          redirectTo: callbackUrl.toString(),
          skipBrowserRedirect: true
        }
      })

      if (error) {
        setStatus(
          `Failed: ${error.message}. Enable Manual Linking in Supabase Auth settings if it is not already enabled.`
        )
        reportClientIssue({
          area: "auth",
          code: "auth.identity.link.failed",
          message: error.message,
          metadata: { provider }
        })
        setPendingProvider(null)
        return
      }

      if (!data.url) {
        setStatus("Failed: sign-in method linking URL was not returned.")
        setPendingProvider(null)
        return
      }

      window.location.assign(data.url)
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Sign-in method linking could not be started."
      setStatus(`Failed: ${message}`)
      reportClientIssue({
        area: "auth",
        code: "auth.identity.link.unhandled",
        message,
        metadata: { provider }
      })
      setPendingProvider(null)
    }
  }

  return (
    <section
      className={compact ? "identity-link-panel compact" : "identity-link-panel"}
      aria-label="Linked sign-in methods"
    >
      <div>
        <p className="eyebrow">Account linking</p>
        <h3>Use Google and GitHub for the same profile</h3>
        <p>
          Link another sign-in method while you are already signed in. After
          linking, both providers should open this same AutoTime account.
        </p>
      </div>
      <div className="identity-provider-list">
        {providers.map((provider) => {
          const isLinked = linkedProviderSet.has(provider.id)

          return (
            <button
              className={isLinked ? "secondary-button" : undefined}
              disabled={isLoading || Boolean(pendingProvider) || isLinked}
              key={provider.id}
              type="button"
              onClick={() => linkProvider(provider.id)}
            >
              {isLinked
                ? `${provider.label} linked`
                : pendingProvider === provider.id
                  ? `Opening ${provider.label}`
                  : `Link ${provider.label}`}
            </button>
          )
        })}
      </div>
      {linkedProviders.length ? (
        <p className="identity-linked-copy">
          Linked now: {linkedProviders.map(getProviderLabel).join(", ")}
        </p>
      ) : null}
      {status ? (
        <p className={`status-banner compact ${getStatusTone(status)}`}>
          {status}
        </p>
      ) : null}
    </section>
  )
}
