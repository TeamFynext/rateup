import { afterAll, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {},
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { callMetaApi } from "../wa_axios.js";
import {
  debug_token,
  getAccessTokenFromCode,
  getPhoneDetails,
  getPhoneNumbersFromWABA,
  getSharedWABAs,
  getSubscribedApps,
  registerPhoneNumber,
  subscribeWABAToWebhook,
} from "./wa_auth.service.js";

type Mock = ReturnType<typeof vi.fn>;

const callMetaApiMock = callMetaApi as unknown as Mock;

/** The URL, method, token and body handed to the Graph API. */
function lastCall() {
  const [url, method, token, body] = callMetaApiMock.mock.calls[0];
  return { url: url as string, method, token, body };
}

const originalEnv = {
  waclient_id: process.env.waclient_id,
  waclient_secret: process.env.waclient_secret,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.waclient_id = "app-123";
  process.env.waclient_secret = "secret-456";
  callMetaApiMock.mockResolvedValue({ data: {} });
});

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("getAccessTokenFromCode", () => {
  test("exchanges the login code for a token and returns just the token", async () => {
    callMetaApiMock.mockResolvedValue({ data: { access_token: "token-abc" } });

    await expect(getAccessTokenFromCode("code-1")).resolves.toBe("token-abc");
  });

  test("sends the app credentials and the code to the oauth endpoint", async () => {
    await getAccessTokenFromCode("code-1");

    const { url, method } = lastCall();
    expect(url).toContain("/oauth/access_token");
    expect(url).toContain("client_id=app-123");
    expect(url).toContain("client_secret=secret-456");
    expect(url).toContain("code=code-1");
    expect(method).toBe("GET");
  });

  test("sends an empty redirect uri when none is given", async () => {
    await getAccessTokenFromCode("code-1");

    expect(lastCall().url).toContain("redirect_uri=");
  });

  test("passes the redirect uri through when one is given", async () => {
    await getAccessTokenFromCode("code-1", "https%3A%2F%2Fapp.rateup.app%2Fcallback");

    expect(lastCall().url).toContain("redirect_uri=https%3A%2F%2Fapp.rateup.app%2Fcallback");
  });

  // The token exchange is unauthenticated — the app secret in the query is the credential.
  test("does not attach a bearer token to the exchange", async () => {
    await getAccessTokenFromCode("code-1");

    expect(lastCall().token).toBeUndefined();
  });

  test("returns undefined when Meta answers without a token", async () => {
    callMetaApiMock.mockResolvedValue({ data: {} });

    await expect(getAccessTokenFromCode("code-1")).resolves.toBeUndefined();
  });

  test("lets a failed exchange reach the caller", async () => {
    callMetaApiMock.mockRejectedValue(new Error("invalid code"));

    await expect(getAccessTokenFromCode("bad-code")).rejects.toThrow("invalid code");
  });
});

describe("debug_token", () => {
  test("asks Meta about the token, authenticating with a different one", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: { is_valid: true, user_id: "user-1" } } });

    const result = await debug_token("token-to-inspect", "app-token");

    const { url, method, token } = lastCall();
    expect(url).toBe("/debug_token?input_token=token-to-inspect");
    expect(method).toBe("GET");
    expect(token).toBe("app-token");
    expect(result).toEqual({ data: { is_valid: true, user_id: "user-1" } });
  });
});

describe("getSharedWABAs", () => {
  test("lists the business accounts shared with the app", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ id: "waba-1" }] } });

    const result = await getSharedWABAs("business-1", "token-1");

    expect(lastCall().url).toBe("/business-1/client_whatsapp_business_accounts");
    expect(lastCall().token).toBe("token-1");
    expect(result).toEqual({ data: [{ id: "waba-1" }] });
  });
});

describe("getPhoneNumbersFromWABA", () => {
  test("requests the fields the registration flow needs", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [{ id: "phone-1" }] } });

    const result = await getPhoneNumbersFromWABA("waba-1", "token-1");

    const { url, method, token } = lastCall();
    expect(url).toContain("/waba-1/phone_numbers");
    expect(url).toContain("fields=status,display_phone_number,verified_name");
    expect(method).toBe("GET");
    expect(token).toBe("token-1");
    expect(result).toEqual({ data: [{ id: "phone-1" }] });
  });
});

describe("webhook subscription", () => {
  test("subscribes the business account with a POST", async () => {
    callMetaApiMock.mockResolvedValue({ data: { success: true } });

    const result = await subscribeWABAToWebhook("waba-1", "token-1");

    const { url, method, token } = lastCall();
    expect(url).toBe("/waba-1/subscribed_apps");
    expect(method).toBe("POST");
    expect(token).toBe("token-1");
    expect(result).toEqual({ success: true });
  });

  test("reads the current subscriptions with a GET on the same path", async () => {
    callMetaApiMock.mockResolvedValue({ data: { data: [] } });

    await getSubscribedApps("waba-1", "token-1");

    const { url, method } = lastCall();
    expect(url).toBe("/waba-1/subscribed_apps");
    expect(method).toBe("GET");
  });
});

describe("registerPhoneNumber", () => {
  test("registers the number for WhatsApp with a verification pin", async () => {
    callMetaApiMock.mockResolvedValue({ data: { success: true } });

    const result = await registerPhoneNumber("phone-1", "token-1");

    const { url, method, token, body } = lastCall();
    expect(url).toBe("/phone-1/register");
    expect(method).toBe("POST");
    expect(token).toBe("token-1");
    expect(body).toEqual({ messaging_product: "whatsapp", pin: "123456" });
    expect(result).toEqual({ success: true });
  });

  // NOTE: the pin is a hard-coded constant (flagged TODO in the source), so every
  // number this app registers shares the same two-step verification pin.
  test("uses the same pin for every number", async () => {
    await registerPhoneNumber("phone-1", "token-1");
    await registerPhoneNumber("phone-2", "token-2");

    expect(callMetaApiMock.mock.calls[0][3].pin).toBe(callMetaApiMock.mock.calls[1][3].pin);
  });
});

describe("getPhoneDetails", () => {
  test("fetches the number's own record", async () => {
    callMetaApiMock.mockResolvedValue({
      data: { id: "phone-1", verified_name: "Acme", quality_rating: "GREEN" },
    });

    const result = await getPhoneDetails("phone-1", "token-1");

    expect(lastCall().url).toBe("/phone-1");
    expect(lastCall().method).toBe("GET");
    expect(result).toMatchObject({ verified_name: "Acme", quality_rating: "GREEN" });
  });
});
