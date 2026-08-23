import { lookup as dnsLookup } from "node:dns";
import { isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

function isPrivateAddress(address: string) {
  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(address);
}

type DnsAddress = { address: string; family: number };
type DnsLookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | DnsAddress[],
  family?: number,
) => void;

// Passed to undici's Agent as the connection layer's own DNS resolver, so
// the address validated here is guaranteed to be the address the socket
// actually connects to. Validating in a separate pre-check before fetch()
// instead would leave a DNS-rebinding gap: an attacker's DNS server can
// return a public address for one lookup and a private/internal one for
// the next, and a plain fetch() re-resolves the hostname internally at
// connect time - after any earlier pre-check has already passed.
export function createSsrfSafeLookup(
  lookupImpl: typeof dnsLookup = dnsLookup,
): (
  hostname: string,
  options: { all?: boolean } | DnsLookupCallback,
  callback?: DnsLookupCallback,
) => void {
  return (hostname, options, callback) => {
    const cb = (typeof options === "function" ? options : callback) as DnsLookupCallback;
    const wantsAll = typeof options === "object" && options !== null ? Boolean(options.all) : false;

    lookupImpl(hostname, { all: true }, (error, addresses) => {
      if (error) {
        cb(error, wantsAll ? [] : "");
        return;
      }

      const list = addresses as DnsAddress[];

      if (!list.length || list.some((entry) => isIP(entry.address) === 0 || isPrivateAddress(entry.address))) {
        cb(new Error("The portfolio must resolve to a public address."), wantsAll ? [] : "");
        return;
      }

      if (wantsAll) {
        cb(null, list);
        return;
      }

      cb(null, list[0].address, list[0].family);
    });
  };
}

export function extractReadableText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchPortfolioText(rawUrl: string): Promise<{ text: string; url: string }> {
  const url = new URL(rawUrl);

  if (!(["http:", "https:"] as string[]).includes(url.protocol) || url.username || url.password) {
    throw new Error("Enter a public HTTP or HTTPS portfolio URL.");
  }

  if (url.hostname === "localhost" || isPrivateAddress(url.hostname)) {
    throw new Error("Private network addresses are not allowed.");
  }

  const agent = new Agent({ connect: { lookup: createSsrfSafeLookup() } });
  let response: Awaited<ReturnType<typeof undiciFetch>>;

  try {
    response = await undiciFetch(url, {
      redirect: "error",
      headers: { "User-Agent": "AutoTime-EU-Apply/1.0" },
      signal: AbortSignal.timeout(10_000),
      dispatcher: agent,
    });
  } catch (error: unknown) {
    const cause = error instanceof Error ? error.cause : undefined;
    throw cause instanceof Error ? cause : error;
  } finally {
    await agent.close();
  }

  if (!response.ok) {
    throw new Error(`Portfolio returned ${response.status}.`);
  }

  if (!(response.headers.get("content-type") || "").includes("text/html")) {
    throw new Error("Portfolio URL must return an HTML page.");
  }

  const html = (await response.text()).slice(0, 500_000);
  const text = extractReadableText(html);

  if (text.length < 80) {
    throw new Error("Not enough readable portfolio content was found.");
  }

  return { text: text.slice(0, 40_000), url: url.toString() };
}
