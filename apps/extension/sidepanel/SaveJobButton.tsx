import { useState } from "react"

export type SaveJobResult = "saved" | "already-saved" | "error"

type SaveJobButtonProps = {
  onSave: () => Promise<SaveJobResult>
  onSaved?: () => void
}

export function SaveJobButton({ onSave, onSaved }: SaveJobButtonProps) {
  const [state, setState] = useState<
    "idle" | "saving" | "saved" | "already-saved" | "error"
  >("idle")

  const handleClick = async () => {
    if (state === "saving") {
      return
    }

    setState("saving")

    try {
      const result = await onSave()
      setState(result)

      if (result === "saved") {
        onSaved?.()
      }
    } catch {
      setState("error")
    }

    window.setTimeout(() => setState("idle"), 2200)
  }

  const isSuccess = state === "saved" || state === "already-saved"
  const label =
    state === "saving"
      ? "Saving"
      : state === "saved"
        ? "Saved"
        : state === "already-saved"
          ? "Already saved"
          : "Save job"

  return (
    <button
      className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-accent bg-accent px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90 disabled:cursor-wait disabled:opacity-70"
      type="button"
      onClick={handleClick}
      aria-busy={state === "saving"}
      disabled={state === "saving"}
    >
      <span
        className={`ti ${isSuccess ? "ti-check" : "ti-bookmark"} text-sm`}
        aria-hidden="true"
      />
      <span>{state === "error" ? "Try again" : label}</span>
    </button>
  )
}
