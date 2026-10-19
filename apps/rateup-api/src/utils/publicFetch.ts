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
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const)
  PRIVATE.addSubnet(net, prefix, "ipv6");

/** Whether an address is reachable on the public internet (not loopback, private, metadata…). */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !PRIVATE.check(address, "ipv4");
  if (family !== 6) return false;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return !PRIVATE.check(mapped[1], "ipv4");
  return !PRIVATE.check(address, "ipv6");
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
  opts: { timeoutMs?: number; maxBytes?: number } = {},
): Promise<Buffer> {
  const { timeoutMs = 5000, maxBytes = 2 * 1024 * 1024 } = opts;
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

  return new Promise((resolve, reject) => {
    const req = https.get(parsed, { lookup: publicLookup, timeout: timeoutMs }, (res) => {
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
    });
    req.on("timeout", () => req.destroy(new Error("Timed out")));
    req.on("error", reject);
  });
}
