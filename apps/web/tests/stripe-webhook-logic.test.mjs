// Real functional coverage for the Stripe webhook's pure logic, extracted
// to lib/stripe-webhook-logic.ts specifically so it can be exercised with
// realistic Stripe-shaped fixtures instead of only checked by source-text
// regex (the gap flagged by a pre-release Stripe/billing audit: status
// mapping, period-end selection, and credit-pack metadata validation were
// never actually invoked by a test before this file existed).
import assert from "node:assert/strict";
import {
  CreditPackMetadataError,
  getChargeCustomerId,
  getCurrentPeriodEnd,
  getCustomerId,
  getString,
  getSubscriptionPlan,
  isStripeCharge,
  isStripeCheckoutSession,
  isStripeDispute,
  isStripeInvoice,
  isStripeSubscription,
  mapStripeStatus,
  validateCreditPackMetadata,
} from "../lib/stripe-webhook-logic.ts";

const tests = [];
const test = (name, run) => tests.push({ name, run });

function subscriptionWithPeriods(periodEnds) {
  return {
    items: {
      data: periodEnds.map((current_period_end) => ({ current_period_end })),
    },
  };
}

function checkoutSession(overrides = {}) {
  return {
    id: "cs_test_123",
    payment_status: "paid",
    metadata: { purchase_type: "ai_credits", user_id: "user_1", credits: "25" },
    ...overrides,
  };
}

test("mapStripeStatus passes through every status except canceled", () => {
  const passthrough = [
    "active",
    "trialing",
    "past_due",
    "incomplete",
    "incomplete_expired",
    "unpaid",
    "paused",
  ];
  for (const status of passthrough) {
    assert.equal(mapStripeStatus(status), status);
  }
});

test("mapStripeStatus renames canceled to cancelled", () => {
  assert.equal(mapStripeStatus("canceled"), "cancelled");
});

test("getSubscriptionPlan always returns pro (single-tier today)", () => {
  assert.equal(getSubscriptionPlan(), "pro");
});

test("getCustomerId returns the id directly for a string customer", () => {
  assert.equal(getCustomerId("cus_abc"), "cus_abc");
});

test("getCustomerId reads .id off an expanded customer object", () => {
  assert.equal(getCustomerId({ id: "cus_expanded" }), "cus_expanded");
});

test("getCurrentPeriodEnd picks the latest period end across multiple items", () => {
  const earlier = 1700000000;
  const later = 1800000000;
  const result = getCurrentPeriodEnd(
    subscriptionWithPeriods([earlier, later]),
  );
  assert.equal(result, new Date(later * 1000).toISOString());
});

test("getCurrentPeriodEnd returns null when no item has a numeric period end", () => {
  const result = getCurrentPeriodEnd(
    subscriptionWithPeriods([undefined, null]),
  );
  assert.equal(result, null);
});

test("getCurrentPeriodEnd returns null for zero subscription items", () => {
  assert.equal(getCurrentPeriodEnd(subscriptionWithPeriods([])), null);
});

test("getChargeCustomerId returns null when the charge has no customer", () => {
  assert.equal(getChargeCustomerId({ customer: null }), null);
});

test("getChargeCustomerId returns the id directly for a string customer", () => {
  assert.equal(getChargeCustomerId({ customer: "cus_abc" }), "cus_abc");
});

test("getChargeCustomerId reads .id off an expanded customer object", () => {
  assert.equal(
    getChargeCustomerId({ customer: { id: "cus_expanded" } }),
    "cus_expanded",
  );
});

test("getString returns the value only when it's actually a string", () => {
  assert.equal(getString("hello"), "hello");
  assert.equal(getString(123), null);
  assert.equal(getString(undefined), null);
  assert.equal(getString(null), null);
});

test("Stripe object type guards accept only their own object type", () => {
  assert.equal(isStripeSubscription({ object: "subscription" }), true);
  assert.equal(isStripeSubscription({ object: "invoice" }), false);
  assert.equal(isStripeSubscription(null), false);
  assert.equal(isStripeSubscription("subscription"), false);

  assert.equal(isStripeInvoice({ object: "invoice" }), true);
  assert.equal(isStripeInvoice({ object: "charge" }), false);

  assert.equal(
    isStripeCheckoutSession({ object: "checkout.session" }),
    true,
  );
  assert.equal(isStripeCheckoutSession({ object: "subscription" }), false);

  assert.equal(isStripeCharge({ object: "charge" }), true);
  assert.equal(isStripeCharge({ object: "dispute" }), false);

  assert.equal(isStripeDispute({ object: "dispute" }), true);
  assert.equal(isStripeDispute({ object: "charge" }), false);
});

test("validateCreditPackMetadata returns null for a non-paid session (not an error)", () => {
  const result = validateCreditPackMetadata(
    checkoutSession({ payment_status: "unpaid" }),
  );
  assert.equal(result, null);
});

test("validateCreditPackMetadata returns null for a paid subscription checkout (not a credit pack)", () => {
  const result = validateCreditPackMetadata(
    checkoutSession({ metadata: { purchase_type: "subscription" } }),
  );
  assert.equal(result, null);
});

test("validateCreditPackMetadata returns the parsed fields for a valid credit-pack purchase", () => {
  const result = validateCreditPackMetadata(checkoutSession());
  assert.deepEqual(result, { credits: 25, userId: "user_1" });
});

test("validateCreditPackMetadata throws on a paid credit-pack session missing user_id", () => {
  assert.throws(
    () =>
      validateCreditPackMetadata(
        checkoutSession({
          metadata: { purchase_type: "ai_credits", credits: "25" },
        }),
      ),
    CreditPackMetadataError,
  );
});

test("validateCreditPackMetadata throws on non-numeric credits", () => {
  assert.throws(
    () =>
      validateCreditPackMetadata(
        checkoutSession({
          metadata: {
            purchase_type: "ai_credits",
            user_id: "user_1",
            credits: "not-a-number",
          },
        }),
      ),
    CreditPackMetadataError,
  );
});

test("validateCreditPackMetadata throws on zero or negative credits", () => {
  for (const credits of ["0", "-5"]) {
    assert.throws(
      () =>
        validateCreditPackMetadata(
          checkoutSession({
            metadata: { purchase_type: "ai_credits", user_id: "user_1", credits },
          }),
        ),
      CreditPackMetadataError,
    );
  }
});

let failed = 0;
for (const { name, run } of tests) {
  try {
    run();
    console.log(`ok - ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`not ok - ${name}`);
    console.error(error);
  }
}

console.log(`Stripe webhook logic: ${tests.length - failed}/${tests.length} passed`);

if (failed > 0) {
  process.exitCode = 1;
}
