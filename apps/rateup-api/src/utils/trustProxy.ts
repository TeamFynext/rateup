/**
 * Fastify's `trustProxy` from `TRUST_PROXY_HOPS`. `true` would trust every `X-Forwarded-For`
 * entry, so the leftmost one, which any caller can write, became `request.ip` and every rate
 * limit could be dodged. A hop count trusts only what our own proxies appended: with 1, the
 * entry Railway's edge added, the address that actually connected to it.
 *
 * Accepts a whole number of hops, or a comma-separated list of trusted proxy addresses/CIDRs.
 * Mirrored by rateup-ui's `ssrVisitorHeaders.ts`.
 */
export function trustProxyFromEnv(
  value = process.env.TRUST_PROXY_HOPS,
): ((address: string, hop: number) => boolean) | string[] {
  const raw = value?.trim() || "1";
  if (/^\d+$/.test(raw)) {
    const hops = Number(raw);
    // Fastify's types omit the hop-count form, so it is spelled as the function it compiles to.
    return (_address, hop) => hop < hops;
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
