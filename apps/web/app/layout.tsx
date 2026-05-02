import "./globals.css"

export const metadata = {
  title: "AutoTime EU Apply",
  description: "Cross-border job application copilot for Europe"
}

export default function RootLayout({
  children
}: {
  children: any
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
