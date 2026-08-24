// Lightweight node:assert unit test (no test runner/framework) covering
// "configuration boundary" behavior across several lib modules at once:
// cookie/bearer auth propagating a missing-Supabase-config error distinctly
// from an unauthenticated user, the public proxy skipping auth-client
// construction for public paths, protected-proxy and sync-refresh
// configuration failures collapsing to a redacted generic 503 (never
// leaking env var names or paths), Stripe client/price/checkout-product
// configuration, pricing's unavailable state and non-actionable billing
// control, admin authorization's 401 vs 403 vs propagated-failure cases,
// and return-URL validation rejecting cross-origin/deceptive/scheme-based
// redirect attempts. The final test reads the actual route/proxy/page
// source files from disk to confirm each one still calls the specific
// boundary helper it's supposed to (and, for Stripe portal/webhook, that it
// does NOT pull in price/plan helpers it has no business needing) - so a
// refactor that quietly bypasses one of these guards fails here.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ConfigurationUnavailableError,
  configurationUnavailableMessage,
  getConfigurationFailure,
} from "../lib/configuration-error.ts";
import { getCanonicalAppUrl, getSupabasePublicEnv } from "../lib/env.ts";
import {
  getStripePriceEnv,
  getStripeSecretEnv,
} from "../lib/env.server.ts";
import { getBearerUser, getCookieUser } from "../lib/request-auth.ts";
import {
  authenticateProxyPath,
  getProtectedProxyFailure,
  getUnauthenticatedRedirect,
} from "../lib/proxy-policy.ts";
import { runSessionRefresh } from "../lib/sync-refresh-core.ts";
import {
  getCheckoutProduct,
  getPlans,
  getPortalStripeClient,
  getWebhookStripeClient,
} from "../lib/stripe.ts";
import {
  billingUnavailableMessage,
  getBillingControlState,
  readPricingConfiguration,
} from "../lib/pricing-configuration.ts";
import { InvalidReturnUrlError, resolveReturnUrl } from "../lib/return-url.ts";
import {
  AdminAuthorizationError,
  authorizeAdminPrincipal,
} from "../lib/admin-authorization-policy.ts";
import { getAdminPublicStatus } from "../lib/admin-error-policy.ts";

const names = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRO_MONTHLY_PRICE_ID",
  "STRIPE_PRO_QUARTERLY_PRICE_ID",
  "STRIPE_AI_CREDIT_PACK_PRICE_ID",
];
const tests = [];
const test = (name, run) => tests.push({ name, run });
const user = { id: "10000000-0000-4000-8000-000000000001" };

async function isolated(run) {
  const saved = new Map(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    await run();
  } finally {
    for (const [name, value] of saved)
      value === undefined ? delete process.env[name] : (process.env[name] = value);
  }
}

function configuredSupabase() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "inert-anon-fixture";
}

function authClient(result) {
  return { auth: { getUser: async () => result } };
}

test("cookie auth propagates missing Supabase configuration", () =>
  isolated(() =>
    assert.rejects(
      () => getCookieUser(async () => {
        getSupabasePublicEnv();
        throw new Error("unreachable");
      }),
      ConfigurationUnavailableError,
    ),
  ));

test("cookie auth keeps missing users unauthorised", async () => {
  assert.deepEqual(
    await getCookieUser(async () => authClient({ data: { user: null }, error: null })),
    { error: "Unauthorised", user: null },
  );
});

test("cookie auth keeps invalid users unauthorised", async () => {
  assert.deepEqual(
    await getCookieUser(async () =>
      authClient({ data: { user: null }, error: new Error("invalid session") }),
    ),
    { error: "Unauthorised", user: null },
  );
});

test("cookie auth propagates unexpected client failures", async () => {
  const failure = new Error("client failure");
  await assert.rejects(
    () => getCookieUser(async () => ({ auth: { getUser: async () => { throw failure; } } })),
    failure,
  );
});

test("bearer auth propagates missing Supabase configuration", () =>
  isolated(() =>
    assert.rejects(() => getBearerUser("token", () => authClient({})), ConfigurationUnavailableError),
  ));

test("bearer auth keeps missing users unauthorised", () =>
  isolated(async () => {
    configuredSupabase();
    assert.deepEqual(
      await getBearerUser("token", () => authClient({ data: { user: null }, error: null })),
      { error: "Unauthorised", user: null },
    );
  }));

test("bearer auth keeps invalid users unauthorised", () =>
  isolated(async () => {
    configuredSupabase();
    assert.deepEqual(
      await getBearerUser("token", () =>
        authClient({ data: { user: null }, error: new Error("invalid token") }),
      ),
      { error: "Unauthorised", user: null },
    );
  }));

test("bearer auth propagates unexpected client failures", () =>
  isolated(async () => {
    configuredSupabase();
    const failure = new Error("client failure");
    await assert.rejects(
      () => getBearerUser("token", () => ({ auth: { getUser: async () => { throw failure; } } })),
      failure,
    );
  }));

test("public proxy paths do not construct an auth client", async () => {
  let calls = 0;
  assert.equal(await authenticateProxyPath("/pricing", async () => ++calls), null);
  assert.equal(calls, 0);
});

test("protected proxy configuration failures are redacted 503 responses", () =>
  isolated(() => {
    let failure;
    try { getSupabasePublicEnv(); } catch (error) { failure = error; }
    assert.deepEqual(getProtectedProxyFailure(failure), {
      body: configurationUnavailableMessage,
      status: 503,
    });
  }));

test("protected proxy missing sessions preserve login redirect behavior", () => {
  assert.equal(
    getUnauthenticatedRedirect("/dashboard/jobs", "?page=2"),
    "/login?redirectTo=%2Fdashboard%2Fjobs%3Fpage%3D2",
  );
  assert.equal(
    getUnauthenticatedRedirect("/admin/users"),
    "/admin/login?redirectTo=%2Fadmin%2Fusers",
  );
});

test("sync refresh missing configuration maps to a redacted 503", () =>
  isolated(async () => {
    let failure;
    try { await runSessionRefresh({ refreshToken: "fixture" }, () => authClient({})); }
    catch (error) { failure = error; }
    assert.deepEqual(getConfigurationFailure(failure), {
      error: configurationUnavailableMessage,
      status: 503,
    });
  }));

test("sync refresh malformed input remains 400-class invalid behavior", async () => {
  let calls = 0;
  assert.deepEqual(await runSessionRefresh({}, () => { calls += 1; return authClient({}); }), {
    kind: "invalid",
  });
  assert.equal(calls, 0);
});

test("sync refresh public configuration error leaks no names or paths", () => {
  assert.equal(configurationUnavailableMessage.includes("SUPABASE"), false);
  assert.equal(configurationUnavailableMessage.includes("NEXT_PUBLIC"), false);
  assert.equal(configurationUnavailableMessage.includes("/"), false);
});

test("Stripe SDK construction requires only its secret", () =>
  isolated(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_inert_fixture";
    assert.ok(getPortalStripeClient());
  }));

test("Stripe price configuration is independent from its secret", () =>
  isolated(() => {
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = "price_monthly_fixture";
    process.env.STRIPE_PRO_QUARTERLY_PRICE_ID = "price_quarterly_fixture";
    process.env.STRIPE_AI_CREDIT_PACK_PRICE_ID = "price_credit_pack_fixture";
    assert.deepEqual(getStripePriceEnv(), {
      creditPack: "price_credit_pack_fixture",
      proMonthly: "price_monthly_fixture",
      proQuarterly: "price_quarterly_fixture",
    });
    assert.throws(getStripeSecretEnv, ConfigurationUnavailableError);
  }));

test("Stripe checkout products distinguish tiers and one-off credits", () =>
  isolated(() => {
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = "price_monthly_fixture";
    process.env.STRIPE_PRO_QUARTERLY_PRICE_ID = "price_quarterly_fixture";
    process.env.STRIPE_AI_CREDIT_PACK_PRICE_ID = "price_credit_pack_fixture";

    assert.deepEqual(getCheckoutProduct("price_quarterly_fixture"), {
      mode: "subscription",
      plan: "pro",
      priceId: "price_quarterly_fixture",
    });
    assert.deepEqual(getCheckoutProduct("price_credit_pack_fixture"), {
      credits: 25,
      mode: "payment",
      priceId: "price_credit_pack_fixture",
    });
    assert.equal(getCheckoutProduct("price_not_configured"), null);
  }));

test("portal does not require Stripe price IDs", () =>
  isolated(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_inert_fixture";
    assert.ok(getPortalStripeClient());
  }));

test("webhook does not require Stripe price IDs", () =>
  isolated(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_inert_fixture";
    assert.ok(getWebhookStripeClient());
  }));

test("checkout missing applicable price configuration maps to 503", () =>
  isolated(() => {
    let failure;
    try { getPlans(); } catch (error) { failure = error; }
    assert.deepEqual(getConfigurationFailure(failure)?.status, 503);
  }));

test("pricing renders an unavailable state with integrations absent", () =>
  isolated(() => {
    assert.equal(readPricingConfiguration(getStripePriceEnv, getStripeSecretEnv), null);
    assert.deepEqual(getBillingControlState(false), {
      disabled: true,
      label: "Billing unavailable",
      message: billingUnavailableMessage,
    });
  }));

test("pricing unavailable billing control is non-actionable", () => {
  assert.equal(getBillingControlState(false).disabled, true);
});

test("pricing unavailable text contains no environment variable name", () => {
  assert.equal(/(?:NEXT_PUBLIC|SUPABASE|STRIPE|PRICE_ID)/.test(billingUnavailableMessage), false);
});

test("admin missing integration configuration maps to 503", () => {
  assert.equal(getAdminPublicStatus(new ConfigurationUnavailableError("database")), 503);
});

test("admin absent authentication remains 401", async () => {
  await assert.rejects(
    () => authorizeAdminPrincipal(null, "overview:read", async () => null),
    (error) => error instanceof AdminAuthorizationError && error.status === 401,
  );
});

test("admin insufficient permission remains 403", async () => {
  await assert.rejects(
    () => authorizeAdminPrincipal(user, "users:manage_beta", async () => ({
      role: "support", status: "active", userId: user.id,
    })),
    (error) => error instanceof AdminAuthorizationError && error.status === 403,
  );
});

test("admin membership failures propagate", async () => {
  const failure = new Error("database membership failure");
  await assert.rejects(
    () => authorizeAdminPrincipal(user, "overview:read", async () => { throw failure; }),
    failure,
  );
});

test("return URLs accept relative values", () => isolated(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/base";
  assert.equal(resolveReturnUrl("/dashboard?ok=1"), "https://app.example.com/dashboard?ok=1");
}));

test("return URLs accept exact same-origin absolute values", () => isolated(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
  assert.equal(resolveReturnUrl("https://app.example.com/pricing"), "https://app.example.com/pricing");
}));

for (const [category, value] of [
  ["cross-origin", "https://evil.example/path"],
  ["deceptive prefix", "https://app.example.com.evil.example/path"],
  ["protocol-relative", "//evil.example/path"],
  ["javascript scheme", "javascript:alert(1)"],
  ["unsupported scheme", "ftp://app.example.com/path"],
  ["malformed", "not a URL"],
  ["username/password", "https://user:pass@app.example.com/path"],
]) test(`return URLs reject ${category}`, () => isolated(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
  assert.throws(() => resolveReturnUrl(value), InvalidReturnUrlError);
}));

test("return URLs reject missing canonical application URL", () =>
  isolated(() => assert.throws(getCanonicalAppUrl, ConfigurationUnavailableError)));

test("return URLs reject invalid canonical application URL", () => isolated(() => {
  process.env.NEXT_PUBLIC_APP_URL = "javascript:alert(1)";
  assert.throws(getCanonicalAppUrl, ConfigurationUnavailableError);
}));

test("route wiring uses the executable boundary helpers", async () => {
  const sources = await Promise.all([
    "../proxy.ts",
    "../app/api/sync/refresh/route.ts",
    "../app/api/stripe/portal/route.ts",
    "../app/api/stripe/webhook/route.ts",
    "../app/api/stripe/checkout/route.ts",
    "../app/pricing/page.tsx",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  assert.match(sources[0], /getProtectedProxyFailure/);
  assert.match(sources[1], /runSessionRefresh/);
  assert.match(sources[2], /getPortalStripeClient/);
  assert.doesNotMatch(sources[2], /getPlans|getStripePriceEnv/);
  assert.match(sources[3], /getWebhookStripeClient/);
  assert.doesNotMatch(sources[3], /getPlans|getStripePriceEnv/);
  assert.match(sources[4], /getPlans/);
  assert.match(sources[5], /readPricingConfiguration/);
});

let failures = 0;
for (const { name, run } of tests) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(error);
  }
}
console.log(`${tests.length} focused environment tests`);
if (failures) process.exitCode = 1;
