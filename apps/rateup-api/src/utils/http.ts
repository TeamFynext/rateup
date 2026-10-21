import { isIP } from "node:net";
import { FastifyRequest } from "fastify";

/**
 * How many proxies sit in front of the API, each appending the address it received from to
 * `X-Forwarded-For`. Production is Cloudflare → Railway's edge, so 2. Fastify trusts exactly
 * that many hops from the socket inward, which makes `request.ip` the address Cloudflare saw;
 * anything a client writes into the header itself sits further left and is never read.
 * `TRUST_PROXY_HOPS=0` trusts no header at all (a direct connection).
 */
export const DEFAULT_TRUST_PROXY_HOPS = 2;

export function trustProxyHops(raw: string | undefined = process.env.TRUST_PROXY_HOPS): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_TRUST_PROXY_HOPS;
  const hops = Number(raw);
  return Number.isInteger(hops) && hops >= 0 ? hops : DEFAULT_TRUST_PROXY_HOPS;
}

/**
 * The `trustProxy` server option for `trustProxyHops()`: `false` for none, else a function
 * trusting that many hops (the socket peer is hop 0). A plain number will not do: Fastify 5
 * treats a numeric `trustProxy` as trust-nothing, since it cannot validate the peer.
 */
export function trustProxySetting(
  raw?: string,
): false | ((address: string, hop: number) => boolean) {
  const hops = trustProxyHops(raw);
  return hops === 0 ? false : (_address, hop) => hop < hops;
}

/**
 * The client's address, for rate limits, de-duplication and audit rows. Cloudflare sets
 * `CF-Connecting-IP` to the address that connected to it, replacing any value the client sent,
 * so it is preferred when it holds an IP; otherwise `request.ip`, which Fastify resolves under
 * the hop count above. Never the left-most `X-Forwarded-For` entry: the client writes that.
 */
export function clientIp(request: FastifyRequest): string {
  const raw = request.headers?.["cf-connecting-ip"];
  const cf = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (cf && isIP(cf)) return cf;
  return request.ip || "unknown";
}

/** @deprecated The old name; same as `clientIp`. */
export function getIp(request: FastifyRequest): string {
  return clientIp(request);
}

export function getCookieValue(cookieName: string, cookie: string) {
  if (!cookie) {
    return undefined;
  }
  const cookies = cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === cookieName) {
      return value;
    }
  }
  return undefined;
}

/**
 * An Error that carries the HTTP status a handler should reply with, replacing the
 * `const error: any = new Error(); error.statusCode = ...` pattern.
 */
export class HttpError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}
