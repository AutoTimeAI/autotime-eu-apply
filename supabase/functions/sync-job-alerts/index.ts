import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AlertFrequency = "daily" | "weekly";
type AlertProfile = {
  alert_frequency: AlertFrequency | "off";
  alert_last_sent_at: string | null;
  email: string | null;
  full_name: string;
  user_id: string;
};
type Match = {
  company: string;
  job_id: string;
  matched_skills: number;
  missing_skill_labels: string[];
  title: string;
  total_essential_skills: number;
};

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
async function digestKey(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isDue(profile: AlertProfile, now: Date): boolean {
  if (profile.alert_frequency === "off" || !profile.email) return false;
  if (!profile.alert_last_sent_at) return true;
  const elapsed = now.getTime() - new Date(profile.alert_last_sent_at).getTime();
  const required = profile.alert_frequency === "daily" ? 86_400_000 : 604_800_000;
  return elapsed >= required;
}

function buildEmail(profile: AlertProfile, matches: Match[], appUrl: string) {
  const rows = matches.map((match) => {
    const missing = match.missing_skill_labels.slice(0, 3).map(escapeHtml).join(", ");
    return `<li style="margin:0 0 18px"><strong>${escapeHtml(match.title)}</strong> at ${escapeHtml(match.company)}<br><span>${match.matched_skills} of ${match.total_essential_skills} essential skills matched${missing ? `; review: ${missing}` : ""}</span></li>`;
  }).join("");
  const name = escapeHtml(clean(profile.full_name) || "there");
  return {
    html: `<div style="font-family:Inter,Arial,sans-serif;color:#253044;max-width:620px;margin:auto;padding:32px"><h1 style="color:#17202f">Your matched EU jobs</h1><p>Hi ${name}, ${matches.length} new explainable match${matches.length === 1 ? " is" : "es are"} ready.</p><ul style="padding-left:20px">${rows}</ul><p><a href="${escapeHtml(`${appUrl}/dashboard/role-pathways`)}">Review matches in AutoTime</a></p><p style="color:#667085;font-size:13px">You control this digest from Profile. AutoTime does not apply to jobs for you.</p></div>`,
    subject: `${matches.length} new AutoTime job match${matches.length === 1 ? "" : "es"}`,
  };
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  idempotencyKey: string,
) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from: Deno.env.get("EMAIL_FROM") ?? "AutoTime EU Apply <hello@autotime-eu-apply.com>",
      html,
      subject,
      to: [to],
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    method: "POST",
  });
  if (!response.ok) throw new Error(`Resend request failed (${response.status})`);
}

Deno.serve(async (request) => {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || request.headers.get("x-cron-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const now = new Date();
  const appUrl = (Deno.env.get("APP_URL") ?? "https://autotime-eu-apply.vercel.app").replace(/\/$/, "");
  const { data: profiles, error } = await db
    .from("profiles")
    .select("user_id,email,full_name,alert_frequency,alert_last_sent_at")
    .not("onboarding_completed_at", "is", null)
    .neq("alert_frequency", "off")
    .limit(1000);
  if (error) throw error;

  let sent = 0;
  const failures: string[] = [];
  for (const profile of (profiles ?? []) as AlertProfile[]) {
    if (!isDue(profile, now)) continue;
    try {
      const since = profile.alert_last_sent_at ?? new Date(now.getTime() - 7 * 86_400_000).toISOString();
      const { data: matches, error: matchError } = await db.rpc("match_esco_jobs", {
        p_limit: 25,
        p_user_id: profile.user_id,
      });
      if (matchError) throw matchError;

      const ranked = (matches ?? []) as Match[];
      if (!ranked.length) continue;
      const ids = ranked.map((match) => match.job_id);
      const { data: recent, error: recentError } = await db
        .from("job_listings")
        .select("id,created_at")
        .in("id", ids)
        .gt("created_at", since);
      if (recentError) throw recentError;
      const recentIds = new Set((recent ?? []).map((job) => job.id));
      const digest = ranked.filter((match) => recentIds.has(match.job_id)).slice(0, 8);
      if (!digest.length) continue;

      const email = buildEmail(profile, digest, appUrl);
      const idempotencyKey = `job-alert-${await digestKey(`${profile.user_id}:${digest.map((match) => match.job_id).join(",")}`)}`;
      await sendEmail(
        profile.email!,
        email.subject,
        email.html,
        idempotencyKey,
      );
      const { error: updateError } = await db
        .from("profiles")
        .update({ alert_last_sent_at: now.toISOString() })
        .eq("user_id", profile.user_id);
      if (updateError) throw updateError;
      sent += 1;
    } catch (alertError: unknown) {
      failures.push(`${profile.user_id}: ${alertError instanceof Error ? alertError.message : String(alertError)}`);
    }
  }

  return Response.json(
    { checked: profiles?.length ?? 0, failures, sent },
    { status: failures.length ? 207 : 200 },
  );
});
