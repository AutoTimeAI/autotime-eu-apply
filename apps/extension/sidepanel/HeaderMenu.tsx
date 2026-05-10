import { useEffect, useRef, useState } from "react"
import { appUrl } from "../lib/openai"

type HeaderMenuProps = {
  onSignOut: () => Promise<void>
}

function openAppPath(path: string) {
  chrome.tabs.create({ url: `${appUrl}${path}` })
}

export function HeaderMenu({ onSignOut }: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSignOut = async () => {
    await onSignOut()
    setIsOpen(false)
  }

  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <img
          className="h-8 w-8 shrink-0 rounded-lg border border-slate-200 bg-white object-contain"
          alt=""
          aria-hidden="true"
          src="/icons/128.png"
        />
        <h1 className="truncate text-sm font-semibold text-slate-900">
          AutoTime
        </h1>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-accent hover:text-accent"
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Open settings menu"
          onClick={() => setIsOpen((current) => !current)}
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
        </button>

        {isOpen ? (
          <div
            className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            role="menu"
          >
            <button
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              type="button"
              role="menuitem"
              onClick={() => openAppPath("/dashboard")}
            >
              Open dashboard
            </button>
            <button
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              type="button"
              role="menuitem"
              onClick={() => openAppPath("/dashboard/settings")}
            >
              Account
            </button>
            <button
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              type="button"
              role="menuitem"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
