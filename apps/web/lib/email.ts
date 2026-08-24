/**
 * Sends the app's transactional emails (welcome, upgrade-confirmed) via
 * Resend, using the React-based templates in apps/web/emails. Every send
 * failure is caught and logged rather than thrown, since a failed
 * transactional email should not break the user-facing flow (signup,
 * checkout) that triggered it.
 */
import { Resend } from "resend"
import UpgradeConfirmedEmail from "../emails/upgrade-confirmed"
import WelcomeEmail from "../emails/welcome"
import { getResendEnv } from "./env.server"

const emailFrom = "AutoTime EU Apply <hello@autotime-eu-apply.com>"

let resendClient: Resend | null = null

/** Lazily creates and memoizes the Resend client, so the API key is only read from env when an email is actually sent. */
function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(getResendEnv().apiKey)
  }

  return resendClient
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown email error"
}

function logEmailError(template: string, error: unknown): void {
  console.error("email_send_failed", {
    reason: getErrorMessage(error),
    template,
  })
}

/** Sends the welcome email to a new user. Logs (does not throw) on failure. */
export async function sendWelcomeEmail(
  to: string,
  name: string,
): Promise<void> {
  try {
    await getResendClient().emails.send({
      from: emailFrom,
      react: WelcomeEmail({ name }),
      subject: "Welcome to AutoTime EU Apply",
      to,
    })
  } catch (error: unknown) {
    logEmailError("welcome", error)
  }
}

/** Sends the "your upgrade is active" email with the plan name and its current billing period end. Logs (does not throw) on failure. */
export async function sendUpgradeConfirmed(
  to: string,
  plan: string,
  periodEnd: Date,
): Promise<void> {
  try {
    await getResendClient().emails.send({
      from: emailFrom,
      react: UpgradeConfirmedEmail({ periodEnd, plan }),
      subject: "Your AutoTime upgrade is active",
      to,
    })
  } catch (error: unknown) {
    logEmailError("upgrade-confirmed", error)
  }
}
