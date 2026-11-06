import { lookup } from "node:dns/promises";
import { lookup as lookupCallback, type LookupAddress, type LookupOptions } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";

/**
 * Guards for every request the server makes to a URL a customer chose (webhooks,
 * automation hooks, an automated reply's "call external API" step). Without them
 * a URL can point at Railway-internal hosts, the metadata address or a redirect
 * to either, and the server fetches it from inside the network.
 */

export class PublicUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicUrlError";
  }
}

/** Loopback, private, link-local, CGNAT, multicast and reserved, IPv4 and IPv6. */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const ip = address.toLowerCase();
    if (ip === "::" || ip === "::1") return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
    if (mapped) return isPrivateAddress(mapped[1]!);
    // Unique-local (fc00::/7), link-local (fe80::/10) and multicast (ff00::/8).
    return /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || ip.startsWith("ff");
  }
  const [a, b] = address.split(".").map(Number);
  if (a === undefined || b === undefined || Number.isNaN(a) || Number.isNaN(b)) return true;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  return a >= 224; // multicast and reserved
}

export interface PublicUrlOptions {
  /**
   * Plain http is allowed only where existing customer configuration already
   * uses it (an automated reply's external API call). Everything new is https.
   */
  allowHttp?: boolean;
}

/**
 * Parses the URL and resolves its host, refusing anything that is not a public
 * address. Call it when the URL is saved and again before each request: a host
 * can be re-pointed at an internal address after it was accepted.
 */
export async function assertPublicUrl(rawUrl: string, options: PublicUrlOptions = {}) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new PublicUrlError("Refusing to fetch an invalid URL");
  }
  const allowed = options.allowHttp ? ["https:", "http:"] : ["https:"];
  if (!allowed.includes(url.protocol)) {
    throw new PublicUrlError(`Refusing to fetch a non-https webhook URL: ${url.protocol}`);
  }
  if (url.username || url.password) {
    throw new PublicUrlError("Refusing to fetch a URL with embedded credentials");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: { address: string }[];
  try {
    addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  } catch {
    throw new PublicUrlError(`Webhook host did not resolve: ${host}`);
  }
  if (!addresses?.length) {
    throw new PublicUrlError(`Webhook host did not resolve: ${host}`);
  }
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new PublicUrlError(`Refusing to fetch a private address: ${address}`);
    }
  }
  return url;
}

/**
 * A `lookup` for http(s) agents that fails on a private address. `assertPublicUrl`
 * resolves the host once; the socket resolves it again, and this keeps a
 * short-TTL DNS answer from switching to an internal address in between.
 */
export function publicOnlyLookup(
  hostname: string,
  options: LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
  ) => void,
) {
  lookupCallback(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", undefined);
    const list = addresses as LookupAddress[];
    const blocked = list.find((entry) => isPrivateAddress(entry.address));
    if (!list.length || blocked) {
      const error: NodeJS.ErrnoException = new PublicUrlError(
        `Refusing to connect to a private address: ${blocked?.address ?? hostname}`,
      );
      error.code = "EPRIVATEADDR";
      return callback(error, "", undefined);
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0]!.address, list[0]!.family);
  });
}

const httpAgent = new http.Agent({ lookup: publicOnlyLookup as never });
const httpsAgent = new https.Agent({ lookup: publicOnlyLookup as never });

/**
 * Axios options for a request to a customer-chosen URL: public addresses only at
 * connect time, no redirects (a redirect could lead anywhere), and a timeout.
 */
export function publicAxiosOptions(timeoutMs = 15_000) {
  return { httpAgent, httpsAgent, maxRedirects: 0, timeout: timeoutMs } as const;
}
