import type { getStripePriceEnv } from "./env.server.ts"

export const billingUnavailableMessage =
  "Billing is temporarily unavailable. You can continue using the Free plan."

export function readPricingConfiguration(
  readPrices: typeof getStripePriceEnv,
  requireDependencies: () => void,
): ReturnType<typeof getStripePriceEnv> | null {
  try {
    const prices = readPrices()
    requireDependencies()
    return prices
  } catch {
    return null
  }
}

export function getBillingControlState(billingAvailable: boolean): {
  disabled: boolean
  label: string
  message?: string
} {
  return billingAvailable
    ? { disabled: false, label: "Start Pro" }
    : {
        disabled: true,
        label: "Billing unavailable",
        message: billingUnavailableMessage,
      }
}
