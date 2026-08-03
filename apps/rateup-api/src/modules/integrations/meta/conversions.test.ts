import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    org: { findUnique: vi.fn() },
    lifecycle: { findUnique: vi.fn() },
    orgMember: { findMany: vi.fn() },
  },
}));

vi.mock("../../whatsapp/wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("../../whatsapp/settings/wa_settings.service.js", () => ({ getWaSettings: vi.fn() }));
vi.mock("../../../utils/redisConnection.js", () => ({ notificationQueue: { add: vi.fn() } }));

import crypto from "node:crypto";
import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { callMetaApi } from "../../whatsapp/wa_axios.js";
import { getWaSettings } from "../../whatsapp/settings/wa_settings.service.js";
import { notificationQueue } from "../../../utils/redisConnection.js";
import { triggerConversionsApiForContact } from "./conversions.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  org: Record<string, Mock>;
  lifecycle: Record<string, Mock>;
  orgMember: Record<string, Mock>;
};

const ORG = "11111111-1111-1111-1111-111111111111";
const NOW = new Date(2026, 6, 29, 10, 0, 0).getTime();

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

const contact = {
  id: "c-1",
  name: "Ann Smith",
  phone: "+91 98765 43210",
  email: "Ann.Smith@Example.TEST",
  orgId: ORG,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  db.org.findUnique.mockResolvedValue({ isConversionApiActive: true });
  db.lifecycle.findUnique.mockResolvedValue({ name: "Won", isWon: true });
  db.orgMember.findMany.mockResolvedValue([]);
  (getWaSettings as unknown as Mock).mockResolvedValue({
    accessToken: "meta-token",
    conversionsApiDatasetId: "ds-1",
    conversionData: null,
  });
  (callMetaApi as unknown as Mock).mockResolvedValue({ status: 200, data: { events_received: 1 } });
  (notificationQueue.add as unknown as Mock).mockResolvedValue({ id: "job-1" });
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// The gates
// ===========================================================================

describe("the preconditions", () => {
  test("does nothing when the org has not enabled the Conversions API", async () => {
    db.org.findUnique.mockResolvedValueOnce({ isConversionApiActive: false });

    await triggerConversionsApiForContact(contact, "lc-1");

    expect(callMetaApi).not.toHaveBeenCalled();
  });

  test("does nothing for a lifecycle that is not a win", async () => {
    db.lifecycle.findUnique.mockResolvedValueOnce({ name: "Lost", isWon: false });

    await triggerConversionsApiForContact(contact, "lc-1");

    expect(callMetaApi).not.toHaveBeenCalled();
  });

  test("does nothing for an unknown lifecycle", async () => {
    db.lifecycle.findUnique.mockResolvedValueOnce(null);

    await triggerConversionsApiForContact(contact, "lc-1");

    expect(callMetaApi).not.toHaveBeenCalled();
  });

  test("warns and stops when the org has no WhatsApp access token", async () => {
    (getWaSettings as unknown as Mock).mockResolvedValueOnce(null);

    await triggerConversionsApiForContact(contact, "lc-1");

    expect(callMetaApi).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalled();
  });

  test("warns and stops when no dataset is configured", async () => {
    (getWaSettings as unknown as Mock).mockResolvedValueOnce({
      accessToken: "meta-token",
      conversionsApiDatasetId: null,
    });

    await triggerConversionsApiForContact(contact, "lc-1");

    expect(callMetaApi).not.toHaveBeenCalled();
  });

  // NOTE: the org lookup runs before anything else, so a contact whose org
  // row is missing takes the catch path rather than returning quietly.
  test("survives an org row that does not exist", async () => {
    db.org.findUnique.mockResolvedValueOnce(null);

    await expect(triggerConversionsApiForContact(contact, "lc-1")).resolves.toBeUndefined();
    expect(callMetaApi).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// The payload
// ===========================================================================

describe("the event payload", () => {
  test("posts to the configured dataset with the org's token", async () => {
    await triggerConversionsApiForContact(contact, "lc-1");

    const [path, method, token] = (callMetaApi as unknown as Mock).mock.calls[0];
    expect(path).toBe("/ds-1/events");
    expect(method).toBe("POST");
    expect(token).toBe("meta-token");
  });

  test("hashes the email lowercased and trimmed, as Meta requires", async () => {
    await triggerConversionsApiForContact(contact, "lc-1");

    const event = (callMetaApi as unknown as Mock).mock.calls[0][3].data[0];
    expect(event.user_data.em).toEqual([sha256("ann.smith@example.test")]);
  });

  test("sends no identifier in the clear", async () => {
    await triggerConversionsApiForContact(contact, "lc-1");

    const body = JSON.stringify((callMetaApi as unknown as Mock).mock.calls[0][3]);
    expect(body).not.toContain("Ann.Smith");
    expect(body).not.toContain("98765");
  });

  // NOTE: the phone is hashed exactly as stored, spaces, plus sign and all.
  // Meta matches on a normalised digits-only form, so a stored number with any
  // punctuation hashes to something their graph cannot match.
  test("hashes the phone without normalising away its punctuation", async () => {
    await triggerConversionsApiForContact(contact, "lc-1");

    const event = (callMetaApi as unknown as Mock).mock.calls[0][3].data[0];
    expect(event.user_data.ph).toEqual([sha256("+91 98765 43210")]);
    expect(event.user_data.ph).not.toEqual([sha256("919876543210")]);
  });

  test("omits an identifier the contact does not have", async () => {
    await triggerConversionsApiForContact({ ...contact, email: undefined }, "lc-1");

    const event = (callMetaApi as unknown as Mock).mock.calls[0][3].data[0];
    expect(event.user_data).not.toHaveProperty("em");
    expect(event.user_data).toHaveProperty("ph");
  });

  // NOTE: with neither a phone nor an email the event still goes out, carrying
  // an empty user_data that Meta cannot attribute to anyone.
  test("still sends an event for a contact with no identifiers at all", async () => {
    await triggerConversionsApiForContact({ id: "c-2", orgId: ORG } as never, "lc-1");

    const event = (callMetaApi as unknown as Mock).mock.calls[0][3].data[0];
    expect(event.user_data).toEqual({});
  });

  test("stamps the event time in whole seconds", async () => {
    await triggerConversionsApiForContact(contact, "lc-1");

    const event = (callMetaApi as unknown as Mock).mock.calls[0][3].data[0];
    expect(event.event_time).toBe(Math.floor(NOW / 1000));
  });

  test("defaults to a Purchase with a placeholder value of 1", async () => {
    await triggerConversionsApiForContact(contact, "lc-1");

    const event = (callMetaApi as unknown as Mock).mock.calls[0][3].data[0];
    expect(event.event_name).toBe("Purchase");
    expect(event.custom_data).toEqual({ lifecycle_stage: "Won", currency: "USD", value: 1 });
  });

  // NOTE: every won contact reports a value of 1 in the configured currency,
  // so Meta's optimisation sees identical revenue for every conversion.
  test("reports the same value for every conversion", async () => {
    await triggerConversionsApiForContact(contact, "lc-1");
    await triggerConversionsApiForContact({ ...contact, id: "c-9" }, "lc-1");

    const values = (callMetaApi as unknown as Mock).mock.calls.map(
      (c) => c[3].data[0].custom_data.value,
    );
    expect(values).toEqual([1, 1]);
  });

  test("honours a configured event name and currency", async () => {
    (getWaSettings as unknown as Mock).mockResolvedValueOnce({
      accessToken: "meta-token",
      conversionsApiDatasetId: "ds-1",
      conversionData: { event_name: "Lead", currency: "INR" },
    });

    await triggerConversionsApiForContact(contact, "lc-1");

    const event = (callMetaApi as unknown as Mock).mock.calls[0][3].data[0];
    expect(event.event_name).toBe("Lead");
    // Only Purchase carries the money fields.
    expect(event.custom_data).toEqual({ lifecycle_stage: "Won" });
  });

  test("marks the event as system generated", async () => {
    await triggerConversionsApiForContact(contact, "lc-1");

    expect((callMetaApi as unknown as Mock).mock.calls[0][3].data[0].action_source).toBe(
      "system_generated",
    );
  });
});

// ===========================================================================
// What counts as success
// ===========================================================================

describe("the response handling", () => {
  test("treats a rejected event as a failure, not a send", async () => {
    (callMetaApi as unknown as Mock).mockResolvedValueOnce({
      status: 400,
      data: { error: { message: "Invalid parameter: dataset does not exist" } },
    });
    db.orgMember.findMany.mockResolvedValueOnce([{ userId: "u-1" }]);

    await triggerConversionsApiForContact(contact, "lc-1");

    expect(
      (log.info as unknown as Mock).mock.calls.some((c) =>
        String(c[0]).includes("sent successfully"),
      ),
    ).toBe(false);
    expect(log.error).toHaveBeenCalled();
    expect(notificationQueue.add).toHaveBeenCalled();
  });

  test("an expired token reaches the same failure path", async () => {
    (callMetaApi as unknown as Mock).mockResolvedValueOnce({
      status: 401,
      data: { error: { code: 190, message: "Error validating access token" } },
    });
    db.orgMember.findMany.mockResolvedValueOnce([{ userId: "u-1" }]);

    await triggerConversionsApiForContact(contact, "lc-1");

    expect(log.error).toHaveBeenCalled();
  });

  test("returns the response body on a genuine success", async () => {
    const res = await triggerConversionsApiForContact(contact, "lc-1");

    expect(res).toEqual({ events_received: 1 });
  });
});

// ===========================================================================
// The failure path
// ===========================================================================

describe("the error notification", () => {
  test("notifies every admin when the call actually throws", async () => {
    (callMetaApi as unknown as Mock).mockRejectedValueOnce(new Error("ECONNRESET"));
    db.orgMember.findMany.mockResolvedValueOnce([{ userId: "u-1" }, { userId: "u-2" }]);

    const res = await triggerConversionsApiForContact(contact, "lc-1");

    expect(res).toBeNull();
    expect(notificationQueue.add).toHaveBeenCalledTimes(2);
  });

  test("targets only the org's admins and owners", async () => {
    (callMetaApi as unknown as Mock).mockRejectedValueOnce(new Error("boom"));

    await triggerConversionsApiForContact(contact, "lc-1");

    expect(db.orgMember.findMany.mock.calls[0][0].where).toEqual({
      orgId: ORG,
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
    });
  });

  // NOTE: the notification carries the contact's name, so the operator can act
  // on it — but it is stored in the notification payload rather than referenced.
  test("carries the failing contact and the underlying message", async () => {
    (callMetaApi as unknown as Mock).mockRejectedValueOnce({
      response: { data: { error: { message: "Unsupported post request" } } },
    });
    db.orgMember.findMany.mockResolvedValueOnce([{ userId: "u-1" }]);

    await triggerConversionsApiForContact(contact, "lc-1");

    const job = (notificationQueue.add as unknown as Mock).mock.calls[0][1];
    expect(job.systemNotificationData.data).toEqual({
      contactId: "c-1",
      contactName: "Ann Smith",
      error: "Unsupported post request",
    });
  });

  test("falls back to a fixed string when the throw carries no message", async () => {
    (callMetaApi as unknown as Mock).mockRejectedValueOnce({});
    db.orgMember.findMany.mockResolvedValueOnce([{ userId: "u-1" }]);

    await triggerConversionsApiForContact(contact, "lc-1");

    expect(
      (notificationQueue.add as unknown as Mock).mock.calls[0][1].systemNotificationData.data.error,
    ).toBe("Unknown error");
  });

  test("never rethrows into the caller", async () => {
    (callMetaApi as unknown as Mock).mockRejectedValueOnce(new Error("boom"));
    db.orgMember.findMany.mockRejectedValueOnce(new Error("db down too"));

    await expect(triggerConversionsApiForContact(contact, "lc-1")).resolves.toBeNull();
  });

  test("queues nothing when the org has no admins", async () => {
    (callMetaApi as unknown as Mock).mockRejectedValueOnce(new Error("boom"));

    await triggerConversionsApiForContact(contact, "lc-1");

    expect(notificationQueue.add).not.toHaveBeenCalled();
  });
});
