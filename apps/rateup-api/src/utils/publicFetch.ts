import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

const PRIVATE = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  PRIVATE.addSubnet(net, prefix, "ipv4");
// IPv4-compatible (::/96), 6to4 (2002::/16), Teredo (2001::/32) and NAT64 carry an IPv4
// address that a relay may deliver to, so they are refused whatever it is.
for (const [net, prefix] of [
  ["::", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const)
  PRIVATE.addSubnet(net, prefix, "ipv6");

/** The eight 16-bit groups of an IPv6 address, dotted IPv4 tails and `::` expanded. */
function ipv6Groups(address: string): number[] | null {
  let text = address.toLowerCase();
  const tail = /^(.*:)(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (tail) {
    const [a, b, c, d] = tail.slice(2).map(Number);
    text = `${tail[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const parse = (part: string) => (part ? part.split(":").map((h) => parseInt(h, 16)) : []);
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];
  const groups =
    halves.length === 2
      ? [...head, ...Array(8 - head.length - rest.length).fill(0), ...rest]
      : head;
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff)
    ? groups
    : null;
}

/** Whether an address is reachable on the public internet (not loopback, private, metadata…). */
export function isPublicAddress(address: string): boolean {
  const bare = address.replace(/%.*$/, "");
  const family = isIP(bare);
  if (family === 4) return !PRIVATE.check(bare, "ipv4");
  if (family !== 6) return false;
  const groups = ipv6Groups(bare);
  if (!groups) return false;
  // ::ffff:a.b.c.d, in either spelling, is the IPv4 address itself.
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    const v4 = [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff].join(".");
    return !PRIVATE.check(v4, "ipv4");
  }
  return !PRIVATE.check(bare, "ipv6");
}

class PrivateAddressError extends Error {
  code = "EPRIVATEADDRESS";
}

// Checked at connect time rather than before the request, so a DNS answer that changes between
// a check and the connection (rebinding) can't reach an internal host.
const publicLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses: LookupAddress[]) => {
    if (err) return callback(err, "", 0);
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address))) {
      return callback(new PrivateAddressError(`${hostname} resolves to a private address`), "", 0);
    }
    if (options.all) return (callback as (e: null, a: LookupAddress[]) => void)(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

/**
 * GETs a URL a user gave us, for the server to read: https only, public addresses only, no
 * redirects, with a time and size cap. Rejects on anything else.
 */
export function fetchPublicBytes(
  url: string,
  opts: { timeoutMs?: number; deadlineMs?: number; maxBytes?: number } = {},
): Promise<Buffer> {
  // `timeoutMs` is socket idleness; `deadlineMs` bounds the whole request, so a server that
  // trickles a byte at a time can't hold it open indefinitely.
  const { timeoutMs = 5000, deadlineMs = 10_000, maxBytes = 2 * 1024 * 1024 } = opts;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Promise.reject(new Error("Not a URL"));
  }
  if (parsed.protocol !== "https:") return Promise.reject(new Error("Only https URLs are fetched"));
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isPublicAddress(host)) {
    return Promise.reject(new PrivateAddressError(`${host} is a private address`));
  }

  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(new Error("Timed out")), deadlineMs);
  return new Promise<Buffer>((resolve, reject) => {
    const req = https.get(
      parsed,
      { lookup: publicLookup, timeout: timeoutMs, signal: controller.signal },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Fetch failed with ${res.statusCode}`));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy(new Error("Response too large"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("Timed out")));
    req.on("error", (err) => reject(controller.signal.aborted ? new Error("Timed out") : err));
  }).finally(() => clearTimeout(deadline));
}
