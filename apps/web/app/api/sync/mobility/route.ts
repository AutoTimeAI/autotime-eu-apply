import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import {
  deleteMobilityProfile,
  disableMobilitySync,
  MobilityConflictError,
  mobilityServerSyncEnabled,
  readMobilityProfile,
  upsertMobilityProfile,
} from "../../../../lib/mobility-profile-repository";
import { createAdminClient } from "../../../../lib/supabase/admin";

function json(data: unknown, error: string | null, status = 200) {
  return NextResponse.json({ data, error }, { status });
}

function unavailable() {
  return json(null, "Mobility account sync is not enabled.", 404);
}

async function authenticatedUserId(request: Request) {
  const { user } = await getRequestUser(request);
  return user?.id ?? null;
}

export async function GET(request: Request) {
  if (!mobilityServerSyncEnabled) return unavailable();
  const userId = await authenticatedUserId(request);
  if (!userId) return json(null, "Unauthorised", 401);
  try {
    return json(await readMobilityProfile(createAdminClient(), userId), null);
  } catch {
    return json(null, "Mobility profile could not be read.", 500);
  }
}

export async function PUT(request: Request) {
  if (!mobilityServerSyncEnabled) return unavailable();
  const userId = await authenticatedUserId(request);
  if (!userId) return json(null, "Unauthorised", 401);
  try {
    return json(
      await upsertMobilityProfile(
        createAdminClient(),
        userId,
        await request.json(),
      ),
      null,
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError)
      return json(null, "Invalid request body", 400);
    if (error instanceof MobilityConflictError)
      return json(null, error.message, 409);
    return json(null, "Mobility profile could not be saved.", 500);
  }
}

export async function PATCH(request: Request) {
  if (!mobilityServerSyncEnabled) return unavailable();
  const userId = await authenticatedUserId(request);
  if (!userId) return json(null, "Unauthorised", 401);
  try {
    z.object({ action: z.literal("disable-sync") })
      .strict()
      .parse(await request.json());
    await disableMobilitySync(createAdminClient(), userId);
    return json({ syncEnabled: false }, null);
  } catch (error: unknown) {
    if (error instanceof z.ZodError)
      return json(null, "Invalid request body", 400);
    return json(null, "Mobility sync could not be disabled.", 500);
  }
}
export async function DELETE(request: Request) {
  if (!mobilityServerSyncEnabled) return unavailable();
  const userId = await authenticatedUserId(request);
  if (!userId) return json(null, "Unauthorised", 401);
  try {
    await deleteMobilityProfile(createAdminClient(), userId);
    return json({ deleted: true }, null);
  } catch {
    return json(null, "Mobility profile could not be deleted.", 500);
  }
}
