import { createHash } from "node:crypto";
import { z } from "zod";
import { PLATFORM_NAMES } from "shared";

export const coverageReportSchema = z.object({
  platform: z.enum(PLATFORM_NAMES),
  siteUrl: z.string().trim().url().max(2000),
  problemCategory: z.enum(["not_detected", "missing_details", "incorrect_details", "autofill_problem", "other"]),
  description: z.string().trim().max(2000).optional().default(""),
  extensionVersion: z.string().trim().max(40).optional().default(""),
  diagnosticConsent: z.boolean().default(false),
  company: z.string().max(0).optional().default(""),
});

function isPrivateIpv4(hostname: string) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  return octets.some((part) => part > 255) || octets[0] === 0 || octets[0] === 10 || octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) || (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31);
}

function isPrivateIpv6(hostname: string) {
  const value = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || /^fe[89ab]/.test(value);
}

export function normalizeCoverageReportUrl(value: string) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("unsupported_url");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) throw new Error("private_url");
  url.hostname = hostname;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function getCoverageRequesterHash(ip: string, secret: string) {
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

export type CoverageReportRequest = z.infer<typeof coverageReportSchema>;
