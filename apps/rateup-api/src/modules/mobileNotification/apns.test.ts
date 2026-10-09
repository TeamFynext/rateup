import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const requests: { headers: Record<string, string>; body: string }[] = [];

vi.mock("node:http2", () => ({
  default: {
    connect: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(),
      request: vi.fn((headers: Record<string, string>) => {
        const handlers: Record<string, (arg?: unknown) => void> = {};
        const stream = {
          setEncoding: vi.fn(),
          on: (event: string, handler: (arg?: unknown) => void) => {
            handlers[event] = handler;
            return stream;
          },
          end: (body: string) => {
            requests.push({ headers, body });
            const dead = headers[":path"].endsWith("/dead");
            handlers.response?.({ ":status": dead ? 410 : 200 });
            if (dead) handlers.data?.(JSON.stringify({ reason: "Unregistered" }));
            handlers.end?.();
          },
        };
        return stream;
      }),
    })),
  },
}));
vi.mock("../../utils/prisma.js", () => ({
  default: { voipPushToken: { deleteMany: vi.fn(() => Promise.resolve({ count: 1 })) } },
}));
vi.mock("../../utils/logger.js", () => ({ log: { warn: vi.fn(), error: vi.fn() } }));

import prisma from "../../utils/prisma.js";
import { sendVoipPush, voipPushConfigured } from "./apns.js";

const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });

beforeEach(() => {
  requests.length = 0;
  vi.clearAllMocks();
  process.env.APNS_KEY_ID = "KEY123";
  process.env.APNS_TEAM_ID = "TEAM456";
  process.env.APNS_AUTH_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
});

afterEach(() => {
  delete process.env.APNS_KEY_ID;
  delete process.env.APNS_TEAM_ID;
  delete process.env.APNS_AUTH_KEY;
});

describe("sendVoipPush", () => {
  test("is off until the key is configured", async () => {
    delete process.env.APNS_AUTH_KEY;
    expect(voipPushConfigured()).toBe(false);
    await sendVoipPush(["abc"], { uuid: "1" }, 45);
    expect(requests).toHaveLength(0);
  });

  test("sends a VoIP push with a valid ES256 provider token", async () => {
    await sendVoipPush(["abc"], { uuid: "call-1" }, 45);

    expect(requests).toHaveLength(1);
    const { headers, body } = requests[0];
    expect(headers["apns-push-type"]).toBe("voip");
    expect(headers["apns-topic"]).toBe("com.rateupapp.rateup.voip");
    expect(headers[":path"]).toBe("/3/device/abc");
    expect(JSON.parse(body)).toEqual({ uuid: "call-1" });

    const [header, claims, signature] = headers.authorization.replace("bearer ", "").split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({
      alg: "ES256",
      kid: "KEY123",
    });
    expect(JSON.parse(Buffer.from(claims, "base64url").toString()).iss).toBe("TEAM456");
    const valid = crypto.verify(
      "sha256",
      Buffer.from(`${header}.${claims}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(signature, "base64url"),
    );
    expect(valid).toBe(true);
  });

  test("prunes tokens Apple says are gone", async () => {
    await sendVoipPush(["live", "dead"], { uuid: "call-1" }, 45);
    expect(prisma.voipPushToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["dead"] } },
    });
  });
});
