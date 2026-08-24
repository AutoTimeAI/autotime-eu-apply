/**
 * GET/POST /api/outreach/contacts
 *
 * Lists the caller's imported outreach contacts, and bulk-imports new
 * contacts (e.g. from a CSV upload) with consent and deduplication.
 *
 * Auth: requires a valid session — resolved via `getRequestUser`. Requests
 * without a recognised user receive 401. All reads/writes are scoped to
 * the caller via `.eq("user_id", user.id)`.
 *
 * Behaviour: POST requires explicit `consent: true` in the body, and
 * dedupes both within the submitted batch and against existing rows using
 * a SHA-256 hash (`dedupeKey`) of the contact's email, normalised profile
 * URL, or name+company as a fallback identity.
 */
import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "../../../../lib/api-auth";
import { createAdminClient } from "../../../../lib/supabase/admin";

const contactType = z.enum(["recruiter", "hiring_manager", "peer_target_role"]);
const httpUrl = z.string().trim().max(2_000).refine((value) => {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}, "Profile URL must use HTTP or HTTPS");
const contact = z.object({
  name: z.string().trim().min(1).max(200), role: z.string().trim().max(200).default(""),
  company: z.string().trim().min(1).max(200), email: z.string().trim().toLowerCase().email().max(254).or(z.literal("")),
  profileUrl: httpUrl.default(""), contactType: contactType.default("recruiter"),
}).refine((value) => value.email || value.profileUrl, { message: "Email or profile URL is required" });
const importSchema = z.object({ consent: z.literal(true), contacts: z.array(contact).min(1).max(100) });

function normaliseUrl(value: string) {
  if (!value) return null;
  const url = new URL(value);
  url.hash = "";
  url.search = "";
  return url.toString().replace(/\/$/, "");
}

function dedupeKey(value: z.infer<typeof contact>) {
  const identity = value.email || normaliseUrl(value.profileUrl) || `${value.name}|${value.company}`;
  return createHash("sha256").update(identity.toLowerCase()).digest("hex");
}

/**
 * Returns the caller's most recent 500 outreach contacts.
 *
 * Responses:
 * - 200: `{ data: <contacts[]>, error: null }`.
 * - 401: no authenticated user.
 * - 500: `{ data: [], error: <message> }` on a read error.
 */
export async function GET(request: NextRequest) {
  const { user } = await getRequestUser(request);
  if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 });
  const { data, error } = await createAdminClient().from("outreach_contacts").select("id,name,role,company,email,profile_url,contact_type,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500);
  return NextResponse.json({ data: data ?? [], error: error?.message ?? null }, { status: error ? 500 : 200 });
}

/**
 * Bulk-imports contacts with consent, skipping any that dedupe against an
 * existing contact for this user.
 *
 * Request body: `{ consent: true, contacts: [...] }` per `importSchema`
 * (1-100 contacts, each requiring an email or profile URL).
 *
 * Responses:
 * - 200 (default status): `{ data: { imported, duplicates }, error: null
 *   }`.
 * - 400: request body fails schema validation.
 * - 401: no authenticated user.
 * - 500: unexpected error.
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getRequestUser(request);
    if (!user) return NextResponse.json({ data: null, error: "Unauthorised" }, { status: 401 });
    const body = importSchema.parse(await request.json());
    const consentedAt = new Date().toISOString();
    const unique = new Map(body.contacts.map((item) => [dedupeKey(item), item]));
    const rows = [...unique].map(([dedupe_key, item]) => ({ user_id: user.id, name: item.name, role: item.role || null, company: item.company, email: item.email || null, profile_url: normaliseUrl(item.profileUrl), contact_type: item.contactType, source: "csv" as const, dedupe_key, consented_at: consentedAt }));
    const client = createAdminClient();
    const existing = await client.from("outreach_contacts").select("dedupe_key").eq("user_id", user.id).in("dedupe_key", rows.map((row) => row.dedupe_key));
    if (existing.error) throw existing.error;
    const existingKeys = new Set((existing.data ?? []).map((item) => item.dedupe_key));
    const insertable = rows.filter((row) => !existingKeys.has(row.dedupe_key));
    if (insertable.length) {
      const inserted = await client.from("outreach_contacts").insert(insertable);
      if (inserted.error) throw inserted.error;
    }
    return NextResponse.json({ data: { imported: insertable.length, duplicates: body.contacts.length - insertable.length }, error: null });
  } catch (error) {
    return NextResponse.json({ data: null, error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Contact import failed" }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
