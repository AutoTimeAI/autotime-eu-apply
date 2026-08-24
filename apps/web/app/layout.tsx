// Root layout for the entire Next.js app-router tree. Every route (public
// marketing pages, auth, admin, dashboard) is rendered inside this shared
// <html>/<body> shell, so this is where global stylesheets, page metadata
// (title/description/OpenGraph/Twitter cards) and app-wide client providers
// (analytics consent, PostHog, client-side error/fallback reporting) are
// wired up once instead of per-route. Server component; it has no auth
// checks of its own since access control happens further down the tree.
import "./globals.css"
import "./phase-8-public.css"
import "./phase-9-admin.css"
import "./phase-10-dashboard-blue.css"
import type { Metadata } from "next"
import { Suspense, type ReactNode } from "react"
import AnalyticsConsent from "../components/AnalyticsConsent"
import { ClientFallbackReporter } from "../components/ClientFallbackReporter"
import PostHogProvider from "../components/PostHogProvider"

export const metadata: Metadata = {
  title: "AutoTime EU Apply - Strategic European Tech Applications",
  description:
    "Quality-first European tech applications with strategic targeting, country-aware fit, work-right clarity, evidence-backed positioning, and interview conversion.",
  metadataBase: new URL("https://autotime-eu-apply.vercel.app"),
  icons: {
    apple: "/icon.png",
    icon: "/icon.png",
    shortcut: "/icon.png"
  },
  openGraph: {
    title: "AutoTime EU Apply - Strategic European Tech Applications",
    description:
      "Apply smarter to European tech roles with country-aware fit checks, work-right clarity, evidence-backed positioning, and interview-focused workflows.",
    url: "https://autotime-eu-apply.vercel.app",
    siteName: "AutoTime EU Apply",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "AutoTime EU Apply - strategic European tech application workspace"
      }
    ],
    locale: "en_GB",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoTime EU Apply - Strategic European Tech Applications",
    description:
      "Quality over quantity for European tech applications: country-aware fit, work-right clarity, evidence-backed positioning, and interview conversion.",
    images: ["/api/og"]
  }
}

/**
 * Wraps every page in the shared <html>/<body> shell and mounts the
 * app-wide client providers (PostHog analytics, the analytics-consent
 * banner, and the client fallback error reporter) inside a Suspense
 * boundary so they don't block initial render of the page content.
 */
export default function RootLayout({
  children
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <PostHogProvider />
          <AnalyticsConsent />
          <ClientFallbackReporter />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
