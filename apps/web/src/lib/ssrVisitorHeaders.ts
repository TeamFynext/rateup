import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

/**
 * The visitor's address: the X-Forwarded-For entry our own proxies appended, counted from the
 * right. The leftmost entry is whatever the visitor sent, so trusting it would let them pick
 * their own rate-limit bucket. Mirrors `trustProxyHops` in rateup-api's `utils/http.ts`.
 */
export function visitorIp(
  forwardedFor: string | undefined,
  socketIp: string | undefined,
  hopsSetting = process.env.TRUST_PROXY_HOPS,
): string | undefined {
  const hops = /^\d+$/.test(hopsSetting?.trim() ?? "") ? Number(hopsSetting) : 1;
  const chain = (forwardedFor ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (hops === 0 || !chain.length) return socketIp;
  return chain[Math.max(0, chain.length - hops)];
}

/**
 * Headers that let rateup-api rate-limit the visitor a server render is for, rather than this
 * server's own address (`clientIp` in rateup-api's `utils/http.ts` checks the secret). In the browser the
 * request comes from the visitor already, so there is nothing to add.
 */
export const ssrVisitorHeaders = createIsomorphicFn()
  .server((): Record<string, string> => {
    const secret = process.env.SSR_SHARED_SECRET;
    const ip = visitorIp(getRequestHeader("x-forwarded-for"), getRequestIP());
    return secret && ip ? { "x-rateup-ssr-secret": secret, "x-rateup-client-ip": ip } : {};
  })
  .client((): Record<string, string> => ({}));
