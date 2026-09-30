import { hkdfSync } from "node:crypto";

/**
 * The one secret behind integration security, from `INTEGRATION_SECRET_KEY`: 32
 * random bytes, base64 (`openssl rand -base64 32`).
 *
 * Each use gets its own subkey through HKDF, so signing OAuth state and
 * encrypting credentials never share key material, and one env var serves both.
 *
 * Losing this key makes every encrypted credential unreadable — each org would
 * have to reconnect. Keep it in the secret store with the database credentials,
 * and never rotate it by simply replacing it.
 */
export type IntegrationKeyPurpose = "credential-encryption" | "oauth-state";

const cache = new Map<IntegrationKeyPurpose, Buffer>();

/** The subkey for one purpose, or `null` when `INTEGRATION_SECRET_KEY` is unset. */
export function getIntegrationKey(purpose: IntegrationKeyPurpose): Buffer | null {
  const raw = process.env.INTEGRATION_SECRET_KEY;
  if (!raw) return null;

  const cached = cache.get(purpose);
  if (cached) return cached;

  const master = Buffer.from(raw, "base64");
  if (master.length < 32) {
    throw new Error("INTEGRATION_SECRET_KEY must be at least 32 bytes, base64-encoded");
  }
  const key = Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), `rateup:${purpose}`, 32));
  cache.set(purpose, key);
  return key;
}

/** The subkey for one purpose; throws when `INTEGRATION_SECRET_KEY` is unset. */
export function requireIntegrationKey(purpose: IntegrationKeyPurpose): Buffer {
  const key = getIntegrationKey(purpose);
  if (!key) throw new Error(`INTEGRATION_SECRET_KEY is not set; needed for ${purpose}`);
  return key;
}
