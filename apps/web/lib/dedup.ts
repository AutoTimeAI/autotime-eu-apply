/**
 * Produces stable hashes for detecting duplicate saved jobs: a URL-based
 * hash when a canonical job URL is available, falling back to a
 * title+company identity hash otherwise. Exists so job-saving code can
 * dedupe consistently regardless of whether the source provided a URL.
 */
export type DedupJob = { title: string; company: string; url?: string | null };

/** Lowercases, Unicode-normalizes (NFKD), and strips everything but a-z0-9, for loose text comparison across accents/casing. */
export function normaliseDedupText(value: string): string {
  return value
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Normalizes a job URL for deduplication: strips the fragment, removes
 * tracking query params (utm_*, source, ref, referrer), lowercases and
 * drops a leading "www." from the hostname, strips a trailing slash from
 * the path, and sorts remaining query params. Returns "" for a
 * null/undefined input, or the trimmed original string if it isn't a
 * parseable URL.
 */
export function canonicalJobUrl(value?: string | null): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_|source$|ref$|referrer$)/i.test(key))
        url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/$/, "");
    url.searchParams.sort();
    return url.toString();
  } catch {
    return value.trim();
  }
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Computes two SHA-256 hashes for a job: `identityHash` from normalized
 * title+company alone, and `dedupHash` from the canonical URL when one
 * exists, otherwise falling back to the same identity string. Two jobs with
 * different URLs but the same title/company still share an `identityHash`,
 * which callers can use as a softer duplicate signal than `dedupHash`.
 */
export async function createJobDedupHashes(
  job: DedupJob,
): Promise<{ dedupHash: string; identityHash: string }> {
  const identity = `${normaliseDedupText(job.title)}|${normaliseDedupText(job.company)}`;
  const canonicalUrl = canonicalJobUrl(job.url);
  return {
    dedupHash: await sha256(canonicalUrl || identity),
    identityHash: await sha256(identity),
  };
}
