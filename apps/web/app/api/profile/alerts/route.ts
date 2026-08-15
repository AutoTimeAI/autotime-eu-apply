import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { createAdminClient } from "../../../../lib/supabase/admin";

const requestSchema = z.object({
  frequency: z.enum(["daily", "weekly", "off"]),
});

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request);
    if (!user) {
      return NextResponse.json(
        { data: null, error: "Unauthorised" },
        { status: 401 },
      );
    }

    const body = requestSchema.parse(await request.json());
    const { data, error } = await createAdminClient()
      .from("profiles")
      .update({ alert_frequency: body.frequency })
      .eq("user_id", user.id)
      .select("alert_frequency,alert_last_sent_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        data: null,
        error:
          error instanceof z.ZodError
            ? "Choose daily, weekly or off"
            : error instanceof Error
              ? error.message
              : "Job alert preference could not be saved",
      },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}

