import "./globals.css"
import type { ReactNode } from "react"

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
      <body>{children}</body>
    </html>
  )
}
