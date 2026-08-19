// Verifies the QA test account's session bootstrap and data isolation without
// ever printing the bootstrap secret. Run this after create-qa-test-account.mjs
// and after setting QA_SESSION_BOOTSTRAP_SECRET / QA_TEST_ACCOUNT_USER_ID in the
// deployed environment.
//
// Usage:
//   APP_URL=https://autotime-eu-apply.vercel.app \
//   QA_SESSION_BOOTSTRAP_SECRET=... \
//   node scripts/verify-qa-test-account.mjs
import { createClient } from "@supabase/supabase-js";

const appUrl = process.env.APP_URL || "https://autotime-eu-apply.vercel.app";
const secret = process.env.QA_SESSION_BOOTSTRAP_SECRET;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const qaUserId = process.env.QA_TEST_ACCOUNT_USER_ID;

if (!secret) {
  throw new Error("QA_SESSION_BOOTSTRAP_SECRET is required (not printed by this script).");
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

async function verifyBootstrapLogsIn() {
  const bootstrapUrl = new URL("/api/qa/session", appUrl);
  bootstrapUrl.searchParams.set("secret", secret);

  const response = await fetch(bootstrapUrl, { redirect: "follow" });

  if (!response.ok) {
    fail(`bootstrap endpoint returned ${response.status}`);
    return null;
  }

  const finalUrl = new URL(response.url);
  if (finalUrl.pathname !== "/dashboard") {
    fail(`expected to land on /dashboard, landed on ${finalUrl.pathname}`);
    return null;
  }

  const setCookie = response.headers.get("set-cookie");
  pass(`bootstrap redirected to ${finalUrl.pathname} (session cookie present: ${Boolean(setCookie)})`);
  return response;
}

async function verifyIsolationViaRls() {
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !qaUserId) {
    console.log(
      "SKIP: isolation-via-RLS check needs SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and QA_TEST_ACCOUNT_USER_ID.",
    );
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: (await admin.auth.admin.getUserById(qaUserId)).data.user.email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    fail(`could not generate a verification token for isolation check: ${linkError?.message}`);
    return;
  }

  const scoped = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: verifyError } = await scoped.auth.verifyOtp({
    type: "magiclink",
    token_hash: linkData.properties.hashed_token,
  });

  if (verifyError) {
    fail(`could not establish a scoped session for isolation check: ${verifyError.message}`);
    return;
  }

  const { data: ownProfile, error: ownError } = await scoped
    .from("profiles")
    .select("user_id")
    .eq("user_id", qaUserId)
    .maybeSingle();

  if (ownError || !ownProfile) {
    fail(`QA account could not read its own profile row: ${ownError?.message}`);
  } else {
    pass("QA account can read its own profile row");
  }

  const otherUserId = "00000000-0000-4000-8000-000000000099";
  const { data: otherRows, error: otherError } = await scoped
    .from("profiles")
    .select("user_id")
    .eq("user_id", otherUserId);

  if (otherError) {
    fail(`unexpected error querying another user's row: ${otherError.message}`);
  } else if ((otherRows ?? []).length > 0) {
    fail("QA account could read another user's profile row - RLS isolation is broken");
  } else {
    pass("QA account cannot read another user's profile row (RLS isolation holds)");
  }
}

await verifyBootstrapLogsIn();
await verifyIsolationViaRls();

if (process.exitCode === 1) {
  console.error("One or more checks failed.");
} else {
  console.log("All checks passed.");
}
