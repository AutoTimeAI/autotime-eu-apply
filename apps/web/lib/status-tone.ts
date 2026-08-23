export type StatusTone = "info" | "success" | "warning" | "error"

export function getStatusTone(message: string | null | undefined): StatusTone {
  const value = message?.trim().toLowerCase() ?? ""

  if (!value) {
    return "info"
  }

  // "session expired" is listed below as an intentional warning (a routine
  // re-auth prompt, not a failure), but the generic \bexpired\b in the error
  // list below matches first as a substring of that same phrase - checking
  // it here, before the generic error classification, is what actually
  // lets that intent take effect.
  if (value.includes("session expired")) {
    return "warning"
  }

  if (
    /\b(failed|failure|error|could not|unable|unavailable|blocked|declined|invalid|unauthori[sz]ed|expired|missing|not found)\b/.test(
      value
    ) ||
    value.includes("copy failed") ||
    value.includes("import failed")
  ) {
    return "error"
  }

  if (
    /\b(warning|please confirm|sign in first|session expired|paste|add|choose|empty|limit reached|required|reconnect|try again|before continuing|before reviewing)\b/.test(
      value
    )
  ) {
    return "warning"
  }

  if (
    /\b(success|connected|complete|saved|exported|imported|loaded|signed in|redirecting|opening|checking|preparing|generated|copied)\b/.test(
      value
    )
  ) {
    return "success"
  }

  return "info"
}
