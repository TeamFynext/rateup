import crypto from "node:crypto";
import http2 from "node:http2";
import { log } from "../../utils/logger.js";
import prisma from "../../utils/prisma.js";

/**
 * APNs, spoken directly — only for PushKit VoIP pushes. Expo's push service cannot send
 * those (they need the `voip` push type and the `<bundle>.voip` topic), and a VoIP push is
 * the only thing that wakes a closed iOS app so it can ring a call through CallKit.
 *
 * Token-based auth (a .p8 key from the Apple Developer account), configured by:
 *   APNS_KEY_ID     the key's id
 *   APNS_TEAM_ID    the developer team id
 *   APNS_AUTH_KEY   the .p8 contents (PEM; `\n` escapes are accepted)
 *   APNS_BUNDLE_ID  optional, defaults to the app's bundle id
 *   APNS_ENV        `production` (TestFlight / App Store, the default) or `development`
 *                   (a build installed from Xcode)
 * Unset means VoIP pushes are off; incoming calls fall back to the ordinary Expo push.
 */

const DEFAULT_BUNDLE_ID = "com.rateupapp.rateup";
/** Apple accepts a provider token for an hour; refresh well before. */
const TOKEN_TTL_MS = 50 * 60 * 1000;

interface ApnsConfig {
  keyId: string;
  teamId: string;
  key: string;
  bundleId: string;
  host: string;
}

function readConfig(): ApnsConfig | null {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const key = process.env.APNS_AUTH_KEY?.replace(/\\n/g, "\n");
  if (!keyId || !teamId || !key) return null;
  return {
    keyId,
    teamId,
    key,
    bundleId: process.env.APNS_BUNDLE_ID || DEFAULT_BUNDLE_ID,
    host:
      process.env.APNS_ENV === "development"
        ? "https://api.sandbox.push.apple.com"
        : "https://api.push.apple.com",
  };
}

export function voipPushConfigured(): boolean {
  return readConfig() !== null;
}

let cachedToken: { value: string; at: number } | null = null;

const base64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

/** The ES256 JWT APNs takes as the provider token. */
function providerToken(config: ApnsConfig): string {
  if (cachedToken && Date.now() - cachedToken.at < TOKEN_TTL_MS) return cachedToken.value;
  const header = base64url(JSON.stringify({ alg: "ES256", kid: config.keyId }));
  const claims = base64url(
    JSON.stringify({ iss: config.teamId, iat: Math.floor(Date.now() / 1000) }),
  );
  const signature = crypto.sign("sha256", Buffer.from(`${header}.${claims}`), {
    key: config.key,
    dsaEncoding: "ieee-p1363",
  });
  const value = `${header}.${claims}.${base64url(signature)}`;
  cachedToken = { value, at: Date.now() };
  return value;
}

interface ApnsResult {
  status: number;
  reason?: string;
}

function send(
  session: http2.ClientHttp2Session,
  config: ApnsConfig,
  deviceToken: string,
  body: string,
  expiration: number,
): Promise<ApnsResult> {
  return new Promise((resolve, reject) => {
    const request = session.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken(config)}`,
      "apns-push-type": "voip",
      "apns-topic": `${config.bundleId}.voip`,
      "apns-priority": "10",
      "apns-expiration": String(expiration),
    });
    let status = 0;
    let data = "";
    request.setEncoding("utf8");
    request.on("response", (headers) => {
      status = Number(headers[":status"]);
    });
    request.on("data", (chunk: string) => {
      data += chunk;
    });
    request.on("end", () => {
      let reason: string | undefined;
      try {
        reason = data ? (JSON.parse(data) as { reason?: string }).reason : undefined;
      } catch {
        reason = data || undefined;
      }
      resolve({ status, reason });
    });
    request.on("error", reject);
    request.end(body);
  });
}

/** Reasons that mean the token itself is dead; such tokens are deleted. */
const DEAD_TOKEN_REASONS = new Set(["BadDeviceToken", "Unregistered", "DeviceTokenNotForTopic"]);

/**
 * Send one VoIP push to each token. Best-effort and quiet when unconfigured: a call still
 * rings every other way. Dead tokens are pruned.
 */
export async function sendVoipPush(
  tokens: string[],
  payload: Record<string, unknown>,
  ttlSeconds: number,
): Promise<void> {
  const config = readConfig();
  if (!config || tokens.length === 0) return;

  const session = http2.connect(config.host);
  session.on("error", (err) => log.warn({ err }, "APNs connection error"));
  const body = JSON.stringify(payload);
  const expiration = Math.floor(Date.now() / 1000) + ttlSeconds;
  const dead: string[] = [];

  try {
    await Promise.all(
      tokens.map(async (token) => {
        try {
          const result = await send(session, config, token, body, expiration);
          if (result.status === 200) return;
          if (result.status === 410 || (result.reason && DEAD_TOKEN_REASONS.has(result.reason))) {
            dead.push(token);
          } else {
            log.warn({ status: result.status, reason: result.reason }, "APNs rejected a VoIP push");
          }
        } catch (err) {
          log.warn({ err }, "APNs VoIP push failed");
        }
      }),
    );
  } finally {
    session.close();
  }

  if (dead.length > 0) {
    await prisma.voipPushToken
      .deleteMany({ where: { token: { in: dead } } })
      .catch((err) => log.warn({ err }, "Could not prune dead VoIP tokens"));
  }
}
