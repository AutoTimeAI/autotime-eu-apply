import { useState } from "react"

type AutofillButtonProps = {
  disabledReason?: string
  onAutofill: () => Promise<string>
}

export function AutofillButton({ disabledReason, onAutofill }: AutofillButtonProps) {
  const [status, setStatus] = useState<"idle" | "filling" | "done" | "error">(
    "idle"
  )
  const [message, setMessage] = useState("")
  const isDisabled = Boolean(disabledReason) || status === "filling"

  const handleClick = async () => {
    if (isDisabled) {
      return
    }

    setStatus("filling")

    try {
      const nextMessage = await onAutofill()
      setMessage(nextMessage)
      setStatus("done")
    } catch {
      setMessage("Autofill is not available on this page")
      setStatus("error")
    }

    window.setTimeout(() => {
      setStatus("idle")
      setMessage("")
    }, 2600)
  }

  return (
    <div className="min-w-0 flex-1" title={disabledReason}>
      <button
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-55"
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-disabled={isDisabled}
      >
        <span className="ti ti-wand text-sm" aria-hidden="true" />
        <span>{status === "filling" ? "Autofilling" : "Autofill"}</span>
      </button>
      {message ? (
        <p className="mt-1 text-center text-[11px] font-medium text-slate-500">
          {message}
        </p>
      ) : null}
    </div>
  )
}
