import "./globals.css"
import type { Metadata } from "next"
import { Suspense, type ReactNode } from "react"
import AnalyticsConsent from "../components/AnalyticsConsent"
import PostHogProvider from "../components/PostHogProvider"

export const metadata: Metadata = {
  title: "AutoTime EU Apply",
  description:
    "Cross-border job application copilot for Europe. Transparent gap scoring, risk flags, and next actions — no auto-submit, no spam.",
  metadataBase: new URL("https://autotime-eu-apply.vercel.app"),
  icons: {
    apple: "/icon.png",
    icon: "/icon.png",
    shortcut: "/icon.png"
  },
  openGraph: {
    title: "AutoTime EU Apply — Borderless Apply for Europe",
    description:
      "Know your fit before you apply. Gap scoring, risk flags, and next actions for EU cross-border tech candidates.",
    url: "https://autotime-eu-apply.vercel.app",
    siteName: "AutoTime EU Apply",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "AutoTime EU Apply — cross-border job application copilot for Europe"
      }
    ],
    locale: "en_GB",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoTime EU Apply — Borderless Apply for Europe",
    description:
      "Gap scoring, risk flags, and next actions for EU cross-border tech candidates. No auto-submit.",
    images: ["/api/og"]
  }
}

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
        </Suspense>
        {children}
      </body>
    </html>
  )
}
