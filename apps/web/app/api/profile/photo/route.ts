import { NextResponse, type NextRequest } from "next/server";
import { getRequestUser } from "../../../../lib/api-auth";
import { matchesImageSignature } from "../../../../lib/image-signature";
import { createAdminClient } from "../../../../lib/supabase/admin";

const types = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 });
    }

    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !types.has(file.type)) {
      return NextResponse.json(
        { data: null, error: "Choose a JPG, PNG, or WebP image." },
        { status: 400 },
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { data: null, error: "Photo must be 5 MB or smaller." },
        { status: 413 },
      );
    }

    const buffer = await file.arrayBuffer();
    if (!matchesImageSignature(new Uint8Array(buffer), file.type)) {
      return NextResponse.json(
        { data: null, error: "This file isn't a valid image of the type it claims to be." },
        { status: 400 },
      );
    }

    const client = createAdminClient();
    const path = `${user.id}/profile.${types.get(file.type)}`;
    const upload = await client.storage
      .from("profile-photos")
      .upload(path, buffer, { contentType: file.type, upsert: true });
    if (upload.error) {
      throw upload.error;
    }

    const { error } = await client
      .from("profiles")
      .update({ photo_url: path })
      .eq("user_id", user.id);
    if (error) {
      throw error;
    }

    const signed = await client.storage.from("profile-photos").createSignedUrl(path, 3600);
    return NextResponse.json({
      data: { path, photoUrl: signed.data?.signedUrl ?? null },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : "Photo upload failed" },
      { status: 500 },
    );
  }
}
