export const fallbackAuthErrorMessage =
  "Your session could not be created. Please return to the sign-in page and try again."

// Auth failures reach /auth/error carrying the raw stage/message the SDK or
// OAuth provider produced (e.g. Supabase's PKCE-verifier error, which reads
// like library documentation, not user guidance). Map known stages to
// plain-language copy instead of rendering that text directly.
const stageMessages: Record<string, string> = {
  "provider-error":
    "The sign-in provider could not complete your sign-in. Please return to the sign-in page and try again.",
  "missing-code":
    "This sign-in link is incomplete or has already been used. Please request a new sign-in link.",
  "exchange-code":
    "This sign-in link was opened in a different browser or device than the one you started signing in with, or your browser storage was cleared since then. Please request a new sign-in link and open it in the same browser.",
  "read-user": fallbackAuthErrorMessage,
  "session-exchange": fallbackAuthErrorMessage
}

export function getAuthErrorMessage(stage: string): string {
  return stageMessages[stage] ?? fallbackAuthErrorMessage
}
