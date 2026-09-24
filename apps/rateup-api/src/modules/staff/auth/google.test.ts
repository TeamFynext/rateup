import { describe, expect, test } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { buildGoogleAuthUrl, checkGoogleClaims, pkcePair, verifyGoogleIdToken } from "./google.js";

const base: JWTPayload = {
  sub: "google-sub-1",
  email: "Ann@rateup.app",
  email_verified: true,
  hd: "rateup.app",
  nonce: "n-1",
  name: "Ann",
};
const expected = { nonce: "n-1", hostedDomain: "rateup.app" };

describe("checkGoogleClaims", () => {
  test("admits a verified Workspace account and lowercases the email", () => {
    const result = checkGoogleClaims(base, expected);
    expect(result).toEqual({
      ok: true,
      identity: { email: "ann@rateup.app", sub: "google-sub-1", name: "Ann", picture: undefined },
    });
  });

  test.each([
    ["a nonce from another flow", { nonce: "other" }, "expired"],
    ["an unverified email", { email_verified: false }, "domain"],
    ["a personal gmail account (no hd)", { hd: undefined, email: "ann@gmail.com" }, "domain"],
    ["another Workspace domain", { hd: "evil.com", email: "ann@evil.com" }, "domain"],
    ["hd claimed but the email is elsewhere", { email: "ann@evil.com" }, "domain"],
    ["no sub", { sub: undefined }, "failed"],
  ])("refuses %s", (_label, override, reason) => {
    expect(checkGoogleClaims({ ...base, ...override }, expected)).toEqual({ ok: false, reason });
  });

  test("the Google account must be the Cloudflare Access account", () => {
    expect(checkGoogleClaims(base, { ...expected, cfAccessEmail: "bob@rateup.app" })).toEqual({
      ok: false,
      reason: "access_mismatch",
    });
    expect(checkGoogleClaims(base, { ...expected, cfAccessEmail: "ann@rateup.app" }).ok).toBe(true);
  });

  test("step-up needs a Google authentication no older than the flow", () => {
    const startedAt = Date.now();
    const fresh = { ...base, auth_time: Math.floor(startedAt / 1000) };
    const stale = { ...base, auth_time: Math.floor((startedAt - 10 * 60_000) / 1000) };
    expect(checkGoogleClaims(fresh, { ...expected, reauthStartedAt: startedAt }).ok).toBe(true);
    expect(checkGoogleClaims(stale, { ...expected, reauthStartedAt: startedAt })).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(checkGoogleClaims(base, { ...expected, reauthStartedAt: startedAt })).toEqual({
      ok: false,
      reason: "expired",
    });
  });
});

describe("buildGoogleAuthUrl", () => {
  const params = {
    clientId: "cid",
    redirectUri: "https://admin.rateup.app/api/staff/auth/google/callback",
    state: "s",
    nonce: "n",
    codeChallenge: "c",
    hostedDomain: "rateup.app",
  };

  test("uses PKCE and hints the Workspace domain", () => {
    const url = new URL(buildGoogleAuthUrl({ ...params, reauth: false }));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("hd")).toBe("rateup.app");
    expect(url.searchParams.get("prompt")).toBe("select_account");
    expect(url.searchParams.has("max_age")).toBe(false);
  });

  test("step-up forces a fresh password prompt", () => {
    const url = new URL(buildGoogleAuthUrl({ ...params, reauth: true }));
    expect(url.searchParams.get("prompt")).toBe("login");
    expect(url.searchParams.get("max_age")).toBe("0");
  });

  test("the PKCE challenge is the S256 of the verifier", async () => {
    const { verifier, challenge } = pkcePair();
    const { createHash } = await import("node:crypto");
    expect(createHash("sha256").update(verifier).digest("base64url")).toBe(challenge);
  });
});

describe("verifyGoogleIdToken", async () => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: "RS256" }] });
  const sign = (issuer: string, audience: string) =>
    new SignJWT({ email: "ann@rateup.app" })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);

  test("accepts a token for this client from Google", async () => {
    const token = await sign("https://accounts.google.com", "cid");
    await expect(verifyGoogleIdToken(token, "cid", jwks)).resolves.toMatchObject({
      email: "ann@rateup.app",
    });
  });

  test("rejects a token minted for another client", async () => {
    const token = await sign("https://accounts.google.com", "someone-elses-client");
    await expect(verifyGoogleIdToken(token, "cid", jwks)).rejects.toThrow();
  });

  test("rejects a token from another issuer", async () => {
    const token = await sign("https://evil.example", "cid");
    await expect(verifyGoogleIdToken(token, "cid", jwks)).rejects.toThrow();
  });
});
