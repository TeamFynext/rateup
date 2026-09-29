import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * A store address that cannot be connected, with a message fit to show the admin.
 */
export class WooStoreUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WooStoreUrlError";
  }
}

/**
 * The store's base URL as typed by an admin — with or without a scheme, with a
 * trailing slash, pasted from the admin area — reduced to `https://host[/path]`.
 *
 * HTTPS only: WooCommerce's key exchange and its basic-auth REST calls send the
 * secret on every request, and WooCommerce itself refuses the connect flow over
 * plain HTTP.
 */
export function normaliseStoreUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new WooStoreUrlError("Enter your store's address.");

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new WooStoreUrlError("That does not look like a web address.");
  }

  if (url.protocol !== "https:") {
    throw new WooStoreUrlError("The store must be served over HTTPS.");
  }
  if (url.username || url.password) {
    throw new WooStoreUrlError("Leave the username and password out of the address.");
  }

  // Whatever the admin copied from inside WordPress, the store root is above it.
  const path = url.pathname
    .replace(/\/(wp-admin|wp-json|wp-login\.php|shop|cart|checkout)(\/.*)?$/i, "")
    .replace(/\/+$/, "");

  return `https://${url.host.toLowerCase()}${path}`;
}

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = address.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return (
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe80") ||
    v6.startsWith("ff")
  );
}

type Resolver = (host: string, options: { all: true }) => Promise<{ address: string }[]>;

/**
 * Refuses a store whose host resolves to a private, loopback or link-local
 * address. The API calls whatever URL an admin types, so without this a store
 * address could be pointed at our own network.
 */
export async function assertPublicStore(
  storeUrl: string,
  resolve: Resolver = lookup,
): Promise<void> {
  const { hostname } = new URL(storeUrl);
  const host = hostname.replace(/^\[|\]$/g, "");

  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await resolve(host, { all: true })).map((entry) => entry.address);
    } catch {
      throw new WooStoreUrlError("We could not find a website at that address.");
    }
  }

  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new WooStoreUrlError("That address is not reachable from the internet.");
  }
}
