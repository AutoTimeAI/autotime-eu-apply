import { Resend } from "resend"
import UpgradeConfirmedEmail from "../emails/upgrade-confirmed"
import WelcomeEmail from "../emails/welcome"
import { getServerEnv } from "./env"

const emailFrom = "AutoTime EU Apply <hello@autotime-eu-apply.com>"

let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(getServerEnv().RESEND_API_KEY)
  }

  return resendClient
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown email error"
}

function logEmailError(template: string, error: unknown): void {
  console.error("email_send_failed", {
    reason: getErrorMessage(error),
    template
  })
}

export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<void> {
  try {
    await getResendClient().emails.send({
      from: emailFrom,
      react: WelcomeEmail({ name }),
      subject: "Welcome to AutoTime EU Apply",
      to
    })
  } catch (error: unknown) {
    logEmailError("welcome", error)
  }
}

export async function sendUpgradeConfirmed(
  to: string,
  plan: string,
  periodEnd: Date
): Promise<void> {
  try {
    await getResendClient().emails.send({
      from: emailFrom,
      react: UpgradeConfirmedEmail({ periodEnd, plan }),
      subject: "Your AutoTime upgrade is active",
      to
    })
  } catch (error: unknown) {
    logEmailError("upgrade-confirmed", error)
  }
}
