/** Accepts bounded public ATS compatibility reports with abuse and SSRF controls. */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { coverageReportSchema, getCoverageRequesterHash, normalizeCoverageReportUrl } from "../../../../lib/coverage-report";
import { getRequestIp } from "../../../../lib/request-ip";
import { createAdminClient } from "../../../../lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = coverageReportSchema.parse(await request.json());
    if (body.company) return NextResponse.json({ data: { accepted: true }, error: null }, { status: 202 });
    const siteUrl = normalizeCoverageReportUrl(body.siteUrl);
    const secret = process.env.COVERAGE_REPORT_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) throw new Error("reporting_unavailable");
    const requesterHash = getCoverageRequesterHash(getRequestIp(request), secret);
    const admin = createAdminClient();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin.from("platform_coverage_reports")
      .select("id", { count: "exact", head: true }).eq("requester_hash", requesterHash).gte("created_at", since);
    if (countError) throw countError;
    if ((count ?? 0) >= 5) return NextResponse.json({ data: null, error: "Too many reports. Try again later." }, { status: 429 });
    const { error } = await admin.from("platform_coverage_reports").insert({
      platform: body.platform, site_url: siteUrl, problem_category: body.problemCategory,
      description: body.description || null, extension_version: body.extensionVersion || null,
      diagnostic_consent: body.diagnosticConsent, requester_hash: requesterHash,
      technical_context: body.diagnosticConsent ? { userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null } : {},
    });
    if (error) throw error;
    return NextResponse.json({ data: { accepted: true }, error: null }, { status: 201 });
  } catch (error) {
    const status = error instanceof z.ZodError || (error instanceof Error && ["unsupported_url", "private_url"].includes(error.message)) ? 400 : 500;
    return NextResponse.json({ data: null, error: status === 400 ? "Check the report details and public job URL." : "Reporting is temporarily unavailable." }, { status });
  }
}
