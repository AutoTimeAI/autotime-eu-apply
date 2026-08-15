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

if (
  !quarterly.livemode ||
  quarterly.unit_amount !== 1900 ||
  quarterly.recurring?.interval !== "month" ||
  quarterly.recurring?.interval_count !== 3 ||
  !credits.livemode ||
  credits.unit_amount !== 500
) {
  throw new Error("Stripe production prices failed verification")
}

console.log("Verified Stripe production prices by lookup key.")
