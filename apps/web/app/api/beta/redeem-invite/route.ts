/** Lets a signed-in, beta-pending user unlock their own account with a shared invite code. */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { isSameOriginMutation } from "../../../../lib/admin-authorization";
import { getBetaInviteCode } from "../../../../lib/env.server";
import { createAdminClient } from "../../../../lib/supabase/admin";

const schema = z.object({ code: z.string().trim().min(1).max(200) });

export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request);
    if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 });
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ data: null, error: "Invalid origin" }, { status: 403 });
    }

    const body = schema.parse(await request.json());
    const validCode = getBetaInviteCode();

    if (!validCode || body.code !== validCode) {
      return NextResponse.json(
        { data: null, error: "That invite code isn't valid. Check it and try again." },
        { status: 400 },
      );
    }

    const client = createAdminClient();

    // A suspended account is suspended for a reason (an admin action, with
    // a required reason on file) - self-redeeming a shared invite code must
    // never be able to override that, only unlock a genuinely pending
    // (or missing-row) account.
    const { data: existing, error: readError } = await client
      .from("beta_access")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) throw readError;
    if (existing?.status === "suspended") {
      return NextResponse.json(
        { data: null, error: "This account is suspended. Contact support instead of using an invite code." },
        { status: 403 },
      );
    }

    const { error } = await client
      .from("beta_access")
      .upsert(
        { user_id: user.id, status: "active", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw error;

    return NextResponse.json({ data: { activated: true }, error: null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ data: null, error: "Enter the invite code you were given." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Invite redemption failed";
    console.error("beta_invite_redeem_failed", { reason: message });
    return NextResponse.json(
      { data: null, error: "Request could not be completed. Try again shortly." },
      { status: 500 },
    );
  }
}
