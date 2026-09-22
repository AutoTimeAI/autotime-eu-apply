/** Public, unauthenticated beta-waitlist signup: visitor leaves an email to be invited later. */
import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isSameOriginMutation } from "../../../../lib/admin-authorization";
import { sendWaitlistJoinedNotification } from "../../../../lib/email";
import { getRequestIp } from "../../../../lib/request-ip";
import { createAdminClient } from "../../../../lib/supabase/admin";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(320) });

const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const RATE_LIMIT_MAX_REQUESTS = 5;

async function assertWaitlistRateLimit(request: NextRequest): Promise<boolean> {
  const ip = getRequestIp(request);
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const rateLimitKey = `waitlist-join:${createHash("sha256").update(`${salt}:${ip}`).digest("hex")}`;

  const { data, error } = await createAdminClient().rpc("increment_ai_rate_limit", {
    p_rate_limit_key: rateLimitKey,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    p_max_requests: RATE_LIMIT_MAX_REQUESTS,
  });

  if (error) throw error;
  return data === true;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ data: null, error: "Invalid origin" }, { status: 403 });
    }

    const withinLimit = await assertWaitlistRateLimit(request);
    if (!withinLimit) {
      return NextResponse.json(
        { data: null, error: "Too many attempts. Try again in a while." },
        { status: 429 },
      );
    }

    const body = schema.parse(await request.json());
    const client = createAdminClient();

    const { data: upserted, error } = await client
      .from("beta_waitlist_signups")
      .upsert(
        { email: body.email, source: "landing_page" },
        { onConflict: "email", ignoreDuplicates: true },
      )
      .select("email");
    if (error) throw error;

    // ignoreDuplicates means a repeat email returns no row here - only
    // notify on a genuinely new signup, not every resubmission.
    if (upserted && upserted.length > 0) {
      await sendWaitlistJoinedNotification(body.email);
    }

    return NextResponse.json({ data: { joined: true }, error: null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ data: null, error: "Enter a valid email address." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Waitlist signup failed";
    console.error("waitlist_join_failed", { reason: message });
    return NextResponse.json(
      { data: null, error: "Request could not be completed. Try again shortly." },
      { status: 500 },
    );
  }
}
