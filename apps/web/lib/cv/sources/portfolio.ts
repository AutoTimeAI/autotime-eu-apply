import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateAddress(address: string) {
  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(address);
}

export async function fetchPortfolioText(rawUrl: string): Promise<{ text: string; url: string }> {
  const url = new URL(rawUrl);
  if (!(["http:", "https:"] as string[]).includes(url.protocol) || url.username || url.password) throw new Error("Enter a public HTTP or HTTPS portfolio URL.");
  if (url.hostname === "localhost" || isPrivateAddress(url.hostname)) throw new Error("Private network addresses are not allowed.");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address) || (isIP(address) === 0))) throw new Error("The portfolio must resolve to a public address.");
  const response = await fetch(url, { redirect: "error", headers: { "User-Agent": "AutoTime-EU-Apply/1.0" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Portfolio returned ${response.status}.`);
  if (!(response.headers.get("content-type") || "").includes("text/html")) throw new Error("Portfolio URL must return an HTML page.");
  const html = (await response.text()).slice(0, 500_000);
  const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim();
  if (text.length < 80) throw new Error("Not enough readable portfolio content was found.");
  return { text: text.slice(0, 40_000), url: url.toString() };
}
