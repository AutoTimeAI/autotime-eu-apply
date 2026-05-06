import "./globals.css"
import { Suspense, type ReactNode } from "react"
import PostHogProvider from "../components/PostHogProvider"

export const metadata = {
  title: "AutoTime EU Apply",
  description: "Cross-border job application copilot for Europe"
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
        </Suspense>
        {children}
      </body>
    </html>
  )
}
