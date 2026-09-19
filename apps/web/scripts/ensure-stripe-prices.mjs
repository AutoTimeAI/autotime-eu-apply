import Stripe from "stripe"

if (process.env.VERCEL_ENV !== "production") {
  process.exit(0)
}

const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
if (!secretKey) throw new Error("STRIPE_SECRET_KEY is required in production")

const stripe = new Stripe(secretKey)

async function ensurePrice({ amount, description, lookupKey, name, recurring }) {
  const existing = await stripe.prices.list({
    active: true,
    limit: 1,
    lookup_keys: [lookupKey],
  })

  if (existing.data[0]) return existing.data[0]

  const product = await stripe.products.create({
    description,
    metadata: { autotime_managed: "true" },
    name,
  })

  return stripe.prices.create({
    currency: "gbp",
    lookup_key: lookupKey,
    metadata: { autotime_managed: "true" },
    product: product.id,
    recurring,
    unit_amount: amount,
  })
}

const quarterly = await ensurePrice({
  amount: 1900,
  description: "AutoTime Pro access billed every three months",
  lookupKey: "autotime_pro_quarterly_gbp_v1",
  name: "AutoTime Pro Quarterly",
  recurring: { interval: "month", interval_count: 3 },
})

const credits = await ensurePrice({
  amount: 500,
  description: "25 non-expiring AutoTime AI credits",
  lookupKey: "autotime_ai_credits_25_gbp_v1",
  name: "AutoTime AI Credit Pack",
})

// Unlike quarterly/credits above, the monthly price isn't lookup-key
// managed by this script - its ID is a literal STRIPE_PRO_MONTHLY_PRICE_ID
// set once in Vercel. That meant nothing ever verified its live Stripe
// amount matched what /pricing displays, so a manual edit in the Stripe
// dashboard (or a stale/wrong price ID) would silently show one price to
// customers and charge a different one at checkout. Verify it the same
// way, without trying to create/manage it.
const monthlyPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID?.trim()
if (!monthlyPriceId)
  throw new Error("STRIPE_PRO_MONTHLY_PRICE_ID is required in production")
const monthly = await stripe.prices.retrieve(monthlyPriceId)

if (
  !quarterly.livemode ||
  quarterly.unit_amount !== 1900 ||
  quarterly.recurring?.interval !== "month" ||
  quarterly.recurring?.interval_count !== 3 ||
  !credits.livemode ||
  credits.unit_amount !== 500 ||
  !monthly.active ||
  !monthly.livemode ||
  monthly.unit_amount !== 900 ||
  monthly.currency !== "gbp" ||
  monthly.recurring?.interval !== "month" ||
  monthly.recurring?.interval_count !== 1
) {
  throw new Error("Stripe production prices failed verification")
}

console.log("Verified Stripe production prices by lookup key.")
console.log(
  "If STRIPE_PRO_QUARTERLY_PRICE_ID / STRIPE_AI_CREDIT_PACK_PRICE_ID are unset " +
    "or point at a stale literal price ID, set them to these lookup selectors " +
    "instead of a price_... value - getStripePriceEnv() resolves them via " +
    "resolveStripePriceId()'s lookup: prefix, so they never need to be updated " +
    "again even if this script recreates the underlying price:",
)
console.log(`  STRIPE_PRO_QUARTERLY_PRICE_ID=lookup:autotime_pro_quarterly_gbp_v1`)
console.log(`  STRIPE_AI_CREDIT_PACK_PRICE_ID=lookup:autotime_ai_credits_25_gbp_v1`)
