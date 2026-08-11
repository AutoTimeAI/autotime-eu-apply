export type DedupJob = { title: string; company: string; url?: string | null };

export function normaliseDedupText(value: string): string {
  return value
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "");
}

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
