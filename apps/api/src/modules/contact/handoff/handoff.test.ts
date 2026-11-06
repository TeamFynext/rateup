import { beforeEach, describe, expect, test, vi } from "vitest";

const kv = vi.hoisted(() => ({ set: vi.fn(), getdel: vi.fn() }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: kv }));

const db = vi.hoisted(() => ({
  contact: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  contactMerge: { findFirst: vi.fn() },
  waMessage: { update: vi.fn() },
  conversation: { findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({ default: db }));

const merge = vi.hoisted(() => ({ mergeContacts: vi.fn() }));
vi.mock("../merge/merge.service.js", () => merge);
vi.mock("../../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../../../generated/prisma/enums.js", () => ({
  PlatformType: {
    WHATSAPP: "WHATSAPP",
    INSTAGRAM: "INSTAGRAM",
    FACEBOOK: "FACEBOOK",
    WEBCHAT: "WEBCHAT",
  },
}));

import { PlatformType } from "../../../generated/prisma/enums.js";
import {
  findHandoffCode,
  isHandoffCode,
  newHandoffCode,
  readRefCode,
  readTextCode,
  stripTextToken,
} from "./handoff.code.js";
import { linkHandoffFromMessage } from "./handoff.inbound.js";
import {
  buildHandoffLink,
  consumeHandoffCode,
  HANDOFF_TTL_SECONDS,
  issueHandoffCode,
  pickMergeDirection,
  redeemHandoffCode,
} from "./handoff.service.js";

const ORG = "org-1";
const CODE = "K7P2QM9X";
const NOW = new Date("2026-11-05T10:00:00Z");

function claim(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    orgId: ORG,
    sourceContactId: "ig-contact",
    sourceChannelId: "ig-channel",
    targetChannelId: "wa-channel",
    targetPlatform: "WHATSAPP",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  });
}

function waBody(text: string) {
  return {
    exchangeProcess: "receive",
    receive: { messages: [{ type: "text", text: { body: text } }] },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  merge.mergeContacts.mockResolvedValue({ mergeId: "merge-1", target: {} });
});

describe("handoff codes", () => {
  test("are 8 characters from the unambiguous alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = newHandoffCode();
      expect(isHandoffCode(code)).toBe(true);
      expect(code).not.toMatch(/[01ILO]/);
    }
  });

  test("only a delimited, exact token in WhatsApp text matches", () => {
    expect(readTextCode(`Hi! I'd like to continue here ref:${CODE}`)).toBe(CODE);
    expect(readTextCode(`ref:${CODE}`)).toBe(CODE);
    expect(readTextCode(`ref:${CODE}\nthanks`)).toBe(CODE);
    expect(readTextCode(`ref:${CODE.toLowerCase()}`)).toBeNull();
    expect(readTextCode(`xref:${CODE}`)).toBeNull();
    expect(readTextCode(`ref:${CODE}9`)).toBeNull();
    expect(readTextCode("ref: invoice 12345678")).toBeNull();
    expect(readTextCode("see ref:ABCDEFG1 please")).toBeNull(); // 1 is not in the alphabet
    expect(readTextCode(null)).toBeNull();
  });

  test("a Meta ref must be exactly the token", () => {
    expect(readRefCode(`handoff_${CODE}`)).toBe(CODE);
    expect(readRefCode(`summer_sale`)).toBeNull();
    expect(readRefCode(`handoff_${CODE}_x`)).toBeNull();
  });

  test("the token is stripped from the text, the customer's words kept", () => {
    expect(stripTextToken(`Hi there ref:${CODE}`, CODE)).toBe("Hi there");
    expect(stripTextToken(`Hi ref:${CODE} there`, CODE)).toBe("Hi there");
  });

  test("finds the code where each platform carries it", () => {
    expect(findHandoffCode(PlatformType.WHATSAPP, waBody(`hi ref:${CODE}`).receive)).toBe(CODE);
    expect(
      findHandoffCode(PlatformType.INSTAGRAM, {
        message: { referral: { ref: `handoff_${CODE}` } },
      }),
    ).toBe(CODE);
    expect(
      findHandoffCode(PlatformType.FACEBOOK, {
        type: "referral",
        referral: { ref: `handoff_${CODE}` },
      }),
    ).toBe(CODE);
    expect(
      findHandoffCode(PlatformType.INSTAGRAM, {
        postback: { referral: { ref: `handoff_${CODE}` } },
      }),
    ).toBe(CODE);
    // A WhatsApp text token means nothing on Instagram, and the reverse.
    expect(
      findHandoffCode(PlatformType.INSTAGRAM, { message: { text: `ref:${CODE}` } }),
    ).toBeNull();
    expect(findHandoffCode(PlatformType.WEBCHAT, waBody(`ref:${CODE}`).receive)).toBeNull();
  });
});

describe("issue and consume", () => {
  test("issues with a 24 h TTL, never overwriting a live code", async () => {
    kv.set.mockResolvedValueOnce(null).mockResolvedValueOnce("OK");
    const { code, expiresAt } = await issueHandoffCode(
      {
        orgId: ORG,
        sourceContactId: "ig-contact",
        sourceChannelId: "ig-channel",
        targetChannelId: "wa-channel",
        targetPlatform: "WHATSAPP",
      },
      NOW,
    );
    expect(kv.set).toHaveBeenCalledTimes(2);
    const [key, value, ex, ttl, nx] = kv.set.mock.calls[1];
    expect(key).toBe(`contact:handoff:${ORG}:${code}`);
    expect(ex).toBe("EX");
    expect(ttl).toBe(HANDOFF_TTL_SECONDS);
    expect(nx).toBe("NX");
    expect(JSON.parse(value as string)).toMatchObject({ sourceContactId: "ig-contact" });
    expect(expiresAt.getTime() - NOW.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  test("consumes atomically under the org's key", async () => {
    kv.getdel.mockResolvedValue(claim());
    expect(await consumeHandoffCode(ORG, CODE)).toMatchObject({ sourceContactId: "ig-contact" });
    expect(kv.getdel).toHaveBeenCalledWith(`contact:handoff:${ORG}:${CODE}`);
  });

  test("an unknown or already used code is nothing", async () => {
    kv.getdel.mockResolvedValue(null);
    expect(await consumeHandoffCode(ORG, CODE)).toBeNull();
  });

  test("an expired code is refused even if Redis still held it", async () => {
    kv.getdel.mockResolvedValue(claim({ expiresAt: new Date(Date.now() - 1000).toISOString() }));
    expect(await consumeHandoffCode(ORG, CODE)).toBeNull();
  });

  test("a code bound to another org is refused", async () => {
    kv.getdel.mockResolvedValue(claim({ orgId: "org-2" }));
    expect(await consumeHandoffCode(ORG, CODE)).toBeNull();
  });
});

describe("links", () => {
  test("wa.me carries the prefill and the token", () => {
    const url = buildHandoffLink({
      platform: PlatformType.WHATSAPP,
      address: "+91 98765-43210",
      code: CODE,
      prefill: "Hi!",
    });
    expect(url).toBe(`https://wa.me/919876543210?text=${encodeURIComponent(`Hi! ref:${CODE}`)}`);
  });

  test("ig.me and m.me carry the ref", () => {
    expect(
      buildHandoffLink({ platform: PlatformType.INSTAGRAM, address: "@acme", code: CODE }),
    ).toBe(`https://ig.me/m/acme?ref=handoff_${CODE}`);
    expect(buildHandoffLink({ platform: PlatformType.FACEBOOK, address: "123", code: CODE })).toBe(
      `https://m.me/123?ref=handoff_${CODE}`,
    );
  });
});

describe("redeeming", () => {
  const older = new Date("2026-01-01");
  const newer = new Date("2026-11-05");

  function contacts(rows: Array<{ id: string; createdAt: Date }>) {
    db.contact.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) =>
      rows.find((r) => r.id === where.id) ? { id: where.id } : null,
    );
    db.contact.findMany.mockResolvedValue(rows);
  }

  test("the older contact is kept", () => {
    expect(
      pickMergeDirection({ id: "a", createdAt: newer }, { id: "b", createdAt: older }),
    ).toEqual({ sourceId: "a", targetId: "b" });
  });

  test("a brand-new WhatsApp contact is merged into the contact the link went to", async () => {
    kv.getdel.mockResolvedValue(claim());
    contacts([
      { id: "ig-contact", createdAt: older },
      { id: "wa-new", createdAt: newer },
    ]);
    const outcome = await redeemHandoffCode({
      orgId: ORG,
      code: CODE,
      platform: PlatformType.WHATSAPP,
      contactId: "wa-new",
    });
    expect(merge.mergeContacts).toHaveBeenCalledWith(ORG, "wa-new", "ig-contact", {
      userId: null,
      reason: "HANDOFF",
    });
    expect(outcome).toMatchObject({ status: "merged", contactId: "ig-contact" });
  });

  test("an existing, older WhatsApp contact is kept and the link's contact merged into it", async () => {
    kv.getdel.mockResolvedValue(claim());
    contacts([
      { id: "ig-contact", createdAt: newer },
      { id: "wa-old", createdAt: older },
    ]);
    const outcome = await redeemHandoffCode({
      orgId: ORG,
      code: CODE,
      platform: PlatformType.WHATSAPP,
      contactId: "wa-old",
    });
    expect(merge.mergeContacts).toHaveBeenCalledWith(ORG, "ig-contact", "wa-old", {
      userId: null,
      reason: "HANDOFF",
    });
    expect(outcome).toMatchObject({ status: "merged", contactId: "wa-old" });
  });

  test("the same contact sending its own code changes nothing", async () => {
    kv.getdel.mockResolvedValue(claim());
    contacts([{ id: "ig-contact", createdAt: older }]);
    const outcome = await redeemHandoffCode({
      orgId: ORG,
      code: CODE,
      platform: PlatformType.WHATSAPP,
      contactId: "ig-contact",
    });
    expect(outcome).toEqual({ status: "same_contact", contactId: "ig-contact" });
    expect(merge.mergeContacts).not.toHaveBeenCalled();
  });

  test("a source merged away since follows its merge", async () => {
    kv.getdel.mockResolvedValue(claim());
    contacts([
      { id: "kept", createdAt: older },
      { id: "wa-new", createdAt: newer },
    ]);
    db.contactMerge.findFirst.mockResolvedValue({ targetContactId: "kept" });
    await redeemHandoffCode({
      orgId: ORG,
      code: CODE,
      platform: PlatformType.WHATSAPP,
      contactId: "wa-new",
    });
    expect(merge.mergeContacts).toHaveBeenCalledWith(ORG, "wa-new", "kept", expect.anything());
  });

  test("a code issued for WhatsApp does not link from Instagram", async () => {
    kv.getdel.mockResolvedValue(claim());
    const outcome = await redeemHandoffCode({
      orgId: ORG,
      code: CODE,
      platform: PlatformType.INSTAGRAM,
      contactId: "ig-2",
    });
    expect(outcome).toEqual({ status: "invalid_code" });
    expect(merge.mergeContacts).not.toHaveBeenCalled();
  });

  test("an unknown code merges nothing", async () => {
    kv.getdel.mockResolvedValue(null);
    const outcome = await redeemHandoffCode({
      orgId: ORG,
      code: CODE,
      platform: PlatformType.WHATSAPP,
      contactId: "wa-new",
    });
    expect(outcome).toEqual({ status: "invalid_code" });
  });
});

describe("the inbound hook", () => {
  const message = (text: string) => ({
    id: "msg-1",
    contactId: "wa-new",
    conversationId: "conv-1",
    messageBody: waBody(text),
  });

  test("a message without a token is left alone and touches nothing", async () => {
    const result = await linkHandoffFromMessage({
      orgId: ORG,
      platform: PlatformType.WHATSAPP,
      contactId: "wa-new",
      message: message("hello"),
    });
    expect(result).toBeNull();
    expect(kv.getdel).not.toHaveBeenCalled();
  });

  test("a live code strips the token and returns the message under the kept contact", async () => {
    kv.getdel.mockResolvedValue(claim());
    db.contact.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
    }));
    db.contact.findMany.mockResolvedValue([
      { id: "ig-contact", createdAt: new Date("2026-01-01") },
      { id: "wa-new", createdAt: new Date("2026-11-05") },
    ]);
    db.conversation.findUnique.mockResolvedValue({ subject: `Hi there ref:${CODE}` });

    const result = await linkHandoffFromMessage({
      orgId: ORG,
      platform: PlatformType.WHATSAPP,
      contactId: "wa-new",
      message: message(`Hi there ref:${CODE}`),
    });

    expect(result?.contactId).toBe("ig-contact");
    expect(result?.messageBody).toEqual(waBody("Hi there"));
    expect(db.waMessage.update).toHaveBeenCalledWith({
      where: { id: "msg-1" },
      data: { messageBody: waBody("Hi there") },
    });
    expect(db.conversation.update).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: { subject: "Hi there" },
    });
    // Stripped before the merge carries the last-message preview over.
    expect(db.waMessage.update.mock.invocationCallOrder[0]).toBeLessThan(
      merge.mergeContacts.mock.invocationCallOrder[0],
    );
  });

  test("an unknown code keeps the text as the customer sent it", async () => {
    kv.getdel.mockResolvedValue(null);
    const result = await linkHandoffFromMessage({
      orgId: ORG,
      platform: PlatformType.WHATSAPP,
      contactId: "wa-new",
      message: message(`Hi ref:${CODE}`),
    });
    expect(result).toBeNull();
    expect(db.waMessage.update).not.toHaveBeenCalled();
  });

  test("a failed merge never throws into message processing", async () => {
    kv.getdel.mockResolvedValue(claim());
    db.contact.findFirst.mockResolvedValue({ id: "x" });
    db.contact.findMany.mockResolvedValue([
      { id: "ig-contact", createdAt: new Date("2026-01-01") },
      { id: "wa-new", createdAt: new Date("2026-11-05") },
    ]);
    db.conversation.findUnique.mockResolvedValue(null);
    merge.mergeContacts.mockRejectedValue(new Error("deadlock"));
    await expect(
      linkHandoffFromMessage({
        orgId: ORG,
        platform: PlatformType.WHATSAPP,
        contactId: "wa-new",
        message: message(`Hi ref:${CODE}`),
      }),
    ).resolves.toBeNull();
  });

  test("an Instagram referral ref links the other way round", async () => {
    kv.getdel.mockResolvedValue(
      claim({ targetPlatform: "INSTAGRAM", sourceContactId: "wa-contact" }),
    );
    db.contact.findFirst.mockResolvedValue({ id: "wa-contact" });
    db.contact.findMany.mockResolvedValue([
      { id: "wa-contact", createdAt: new Date("2026-01-01") },
      { id: "ig-new", createdAt: new Date("2026-11-05") },
    ]);
    const result = await linkHandoffFromMessage({
      orgId: ORG,
      platform: PlatformType.INSTAGRAM,
      contactId: "ig-new",
      message: {
        id: "msg-2",
        contactId: "ig-new",
        conversationId: null,
        messageBody: { receive: { type: "referral", referral: { ref: `handoff_${CODE}` } } },
      },
    });
    expect(merge.mergeContacts).toHaveBeenCalledWith(
      ORG,
      "ig-new",
      "wa-contact",
      expect.anything(),
    );
    expect(result?.contactId).toBe("wa-contact");
    expect(db.waMessage.update).not.toHaveBeenCalled();
  });
});
