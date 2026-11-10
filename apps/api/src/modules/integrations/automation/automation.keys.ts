import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";

import { IntegratedApps } from "../../../types/enums.js";
import { generateApiKey } from "../../settings/apiKeys/apiKey.service.js";
import type { AutomationPlatform } from "./automation.platforms.js";

/**
 * Keys that carry their org: `rk_<org id, hex without dashes>_<secret>`, so a
 * platform's connection form asks for one value and no org id. The bcrypt hash
 * covers the whole key, prefix included — which is why the key stays under
 * bcrypt's 72-byte limit: past it, bcrypt ignores the rest, and a key with a
 * changed tail would still match.
 */
const ORG_KEY = /^rk_([0-9a-f]{32})_([A-Za-z0-9_-]{32})$/;

/** 24 random bytes: 32 base64url characters, 192 bits. The key is 68 bytes in all. */
const SECRET_BYTES = 24;

/**
 * A new API key for a platform: the plaintext, shown to the user once, and the
 * hash stored in the credential. Zapier keeps its plain key — the published app
 * sends the org id beside it — and every other platform gets one that carries it.
 */
export async function generateAutomationKey(platform: AutomationPlatform, orgId: string) {
  if (platform === IntegratedApps.zapier) return generateApiKey();

  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const key = `rk_${orgId.replaceAll("-", "").toLowerCase()}_${secret}`;
  // Cost 5, as the Zapier key: every request the platform makes hashes it.
  const hash = await bcrypt.hash(key, 5);
  return { key, hash };
}

/** The org a key was issued for, or null when it is not an org-carrying key. */
export function orgIdFromAutomationKey(key: string): string | null {
  const hex = ORG_KEY.exec(key)?.[1];
  if (!hex) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
