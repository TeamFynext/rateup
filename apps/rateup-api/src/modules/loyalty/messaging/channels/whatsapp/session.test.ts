import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../../utils/prisma.js", () => ({
  default: {
    contact: { findUnique: vi.fn() },
    whatsappSettings: { findFirst: vi.fn(), findMany: vi.fn() },
    waMessage: { findFirst: vi.fn() },
  },
}));

import prisma from "../../../../../utils/prisma.js";
import { findOpenSession, isCustomerSessionOpen, SESSION_WINDOW_MINUTES } from "./session.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;

const ORG = "11111111-1111-4111-8111-111111111111";
const PHONE = "919000000001";
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
const heardFrom = (minutes: number) =>
  db.contact.findUnique.mockResolvedValue({
    id: "c1",
    lastReceivedMessageTimeStamp: minutesAgo(minutes),
  });

beforeEach(() => {
  vi.clearAllMocks();
  db.contact.findUnique.mockResolvedValue(null);
  db.whatsappSettings.findFirst.mockResolvedValue(null);
  db.whatsappSettings.findMany.mockResolvedValue([]);
  db.waMessage.findFirst.mockResolvedValue(null);
});

describe("isCustomerSessionOpen", () => {
  test("a customer we have never heard from has no window", async () => {
    expect(await isCustomerSessionOpen({ orgId: ORG, phone: PHONE })).toBe(false);

    db.contact.findUnique.mockResolvedValue({ id: "c1", lastReceivedMessageTimeStamp: null });
    expect(await isCustomerSessionOpen({ orgId: ORG, phone: PHONE })).toBe(false);
  });

  test("looks the contact up by the digits, however the phone was written", async () => {
    await isCustomerSessionOpen({ orgId: ORG, phone: `+${PHONE}` });

    expect(db.contact.findUnique.mock.calls[0][0].where).toEqual({
      contact_phone_org_id_unique: { phone: PHONE, orgId: ORG },
    });
  });

  test("a message an hour ago opens the window; one just under 24 h ago closes it", async () => {
    heardFrom(60);
    expect(await isCustomerSessionOpen({ orgId: ORG, phone: PHONE })).toBe(true);

    heardFrom(SESSION_WINDOW_MINUTES + 1);
    expect(await isCustomerSessionOpen({ orgId: ORG, phone: PHONE })).toBe(false);
  });

  test("with a sending number, the window is the one on that number", async () => {
    heardFrom(5);
    db.whatsappSettings.findFirst.mockResolvedValue({ phone: "+91 80000 00000" });

    // They wrote to another number recently, never to this one.
    expect(
      await isCustomerSessionOpen({ orgId: ORG, phone: PHONE, whatsappSettingsPhoneId: "p1" }),
    ).toBe(false);

    db.waMessage.findFirst.mockResolvedValue({ waCreatedAt: minutesAgo(30), createdAt: null });
    expect(
      await isCustomerSessionOpen({ orgId: ORG, phone: PHONE, whatsappSettingsPhoneId: "p1" }),
    ).toBe(true);

    // Matched on the number however it was stored on the message.
    expect(db.waMessage.findFirst.mock.calls[0][0].where).toMatchObject({
      contactId: "c1",
      sourceIdentifier: { in: ["+91 80000 00000", "918000000000"] },
      messageBody: { path: ["exchangeProcess"], equals: "receive" },
    });
  });
});

describe("findOpenSession", () => {
  test("names the number they last wrote to, so a reply can leave from it", async () => {
    heardFrom(5);
    db.waMessage.findFirst.mockResolvedValue({ sourceIdentifier: "918000000002" });
    db.whatsappSettings.findMany.mockResolvedValue([
      { phone: "+91 80000 00001", phoneId: "p1" },
      { phone: "+91 80000 00002", phoneId: "p2" },
    ]);

    expect(await findOpenSession({ orgId: ORG, phone: PHONE })).toEqual({ phoneId: "p2" });
  });

  test("an open window on a number the org no longer has is still open, with no number", async () => {
    heardFrom(5);
    db.waMessage.findFirst.mockResolvedValue({ sourceIdentifier: "918000000009" });

    expect(await findOpenSession({ orgId: ORG, phone: PHONE })).toEqual({ phoneId: null });
  });
});
