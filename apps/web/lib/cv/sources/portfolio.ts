import { lookup as dnsLookup } from "node:dns";
import { isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

// Every message thrown as this type (below) is a deliberately safe,
// user-actionable string - "enter a public URL", "private addresses
// aren't allowed", "not enough readable content" - never raw internal
// error detail. Callers should map this to a 4xx status and let the
// message pass through unredacted, rather than the generic "something
// went wrong" a blanket 500 would produce via toPublicApiError - hiding
// exactly the information a user needs to fix their input.
export class PortfolioFetchError extends Error {}

// An IPv4-mapped IPv6 address (RFC 4291) represents an IPv4 address inside
// IPv6 syntax - "::ffff:127.0.0.1" or its hex-group form "::ffff:7f00:1" -
// and the OS socket layer connects to it identically to the plain IPv4
// form on any dual-stack system (virtually all modern hosts, including
// this one). Converts either form back to a dotted-quad string so the
// existing IPv4 range checks below actually see the real address instead
// of an opaque IPv6-looking string that matches none of them.
function ipv4MappedToDottedQuad(address: string): string | null {
  const hexMatch = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address);
  if (hexMatch) {
    const high = Number.parseInt(hexMatch[1], 16);
    const low = Number.parseInt(hexMatch[2], 16);
    if (Number.isNaN(high) || Number.isNaN(low)) return null;
    return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
  }

  const dottedMatch = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(address);
  return dottedMatch ? dottedMatch[1] : null;
}

// Real, directly reachable SSRF bypass fixed here (not just a theoretical
// hardening): `new URL("http://[::ffff:127.0.0.1]/").hostname` returns
// "[::ffff:7f00:1]" - bracketed AND hex-encoded - which matched none of
// this function's patterns before the bracket-stripping and IPv4-mapping
// handling below, even though it's a literal-IP host that never goes
// through the DNS-rebinding-safe lookup at all (there's no hostname to
// resolve). The same bracket issue alone also let plain, unmapped IPv6
// loopback/link-local addresses ("[::1]", "[fe80::1]") slip past this
// check when submitted directly as a portfolio URL's host.
export function isPrivateAddress(address: string) {
  const unwrapped = address.replace(/^\[|\]$/g, "");
  const candidate = ipv4MappedToDottedQuad(unwrapped) ?? unwrapped;
  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(candidate);
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
        cb(new PortfolioFetchError("The portfolio must resolve to a public address."), wantsAll ? [] : "");
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
    throw new PortfolioFetchError("Enter a public HTTP or HTTPS portfolio URL.");
  }

  if (url.hostname === "localhost" || isPrivateAddress(url.hostname)) {
    throw new PortfolioFetchError("Private network addresses are not allowed.");
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
    throw new PortfolioFetchError(`Portfolio returned ${response.status}.`);
  }

  if (!(response.headers.get("content-type") || "").includes("text/html")) {
    throw new PortfolioFetchError("Portfolio URL must return an HTML page.");
  }

  const html = (await response.text()).slice(0, 500_000);
  const text = extractReadableText(html);

  if (text.length < 80) {
    throw new PortfolioFetchError("Not enough readable portfolio content was found.");
  }

  return { text: text.slice(0, 40_000), url: url.toString() };
}
