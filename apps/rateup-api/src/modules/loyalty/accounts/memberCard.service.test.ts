import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    customerLoyaltyAccount: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../../utils/misc/random.utils.js", () => ({ randomCode: vi.fn() }));
vi.mock("../messaging/send.js", () => ({ sendLoyalty: vi.fn() }));
vi.mock("../messaging/reply.js", () => ({ replyLoyalty: vi.fn() }));
vi.mock("qrcode", () => ({
  default: { toBuffer: vi.fn(async (text: string) => Buffer.from(`png:${text}`)) },
}));

import prisma from "../../../utils/prisma.js";
import { randomCode } from "../../../utils/misc/random.utils.js";
import { replyLoyalty } from "../messaging/reply.js";
import { sendLoyalty } from "../messaging/send.js";
import {
  cardImageUrl,
  defaultCardCaption,
  ensureMemberCard,
  renderCardPng,
  renderCardReply,
  sendMemberCard,
  sendMemberCardIfDue,
} from "./memberCard.service.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as { customerLoyaltyAccount: Record<string, Mock> };

const ORG = "org-1";
const CODE = "ABCDEFGHJ";

const activeAccount = (over: Record<string, unknown> = {}) => ({
  id: "acct-1",
  status: "active",
  cardCode: CODE,
  cardSentAt: null,
  contact: { name: "Ann", phone: "919000000001" },
  program: { name: "Cafe Rio Rewards", currencyName: "Beans", status: "active" },
  ...over,
});

const envBefore = process.env.API_URL;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.API_URL = "https://api.rateup.test";
  (sendLoyalty as Mock).mockResolvedValue({ sent: true, skippedReason: null });
  (replyLoyalty as Mock).mockResolvedValue({ sent: true, skippedReason: null });
  db.customerLoyaltyAccount.update.mockResolvedValue({});
});

afterEach(() => {
  process.env.API_URL = envBefore;
});

describe("ensureMemberCard", () => {
  test("returns the existing code without minting", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: CODE });

    expect(await ensureMemberCard("acct-1")).toBe(CODE);
    expect(randomCode).not.toHaveBeenCalled();
  });

  test("mints nine characters and claims them with a conditional update", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: null });
    (randomCode as Mock).mockReturnValue(CODE);
    db.customerLoyaltyAccount.updateMany.mockResolvedValue({ count: 1 });

    expect(await ensureMemberCard("acct-1")).toBe(CODE);
    expect(randomCode).toHaveBeenCalledWith(9);
    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalledWith({
      where: { id: "acct-1", cardCode: null },
      data: { cardCode: CODE },
    });
  });

  test("retries a collision on the unique index", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: null });
    (randomCode as Mock).mockReturnValueOnce("TAKENTAKE").mockReturnValueOnce(CODE);
    db.customerLoyaltyAccount.updateMany
      .mockRejectedValueOnce({ code: "P2002" })
      .mockResolvedValueOnce({ count: 1 });

    expect(await ensureMemberCard("acct-1")).toBe(CODE);
    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalledTimes(2);
  });

  test("a concurrent winner's code is read back instead of overwritten", async () => {
    db.customerLoyaltyAccount.findUnique
      .mockResolvedValueOnce({ cardCode: null })
      .mockResolvedValueOnce({ cardCode: "WINNERWINNER" });
    (randomCode as Mock).mockReturnValue(CODE);
    db.customerLoyaltyAccount.updateMany.mockResolvedValue({ count: 0 });

    expect(await ensureMemberCard("acct-1")).toBe("WINNERWINNER");
  });
});

describe("card image", () => {
  test("renders the bare code", async () => {
    expect((await renderCardPng(CODE)).toString()).toBe(`png:${CODE}`);
  });

  test("the URL is the public card endpoint on the API origin", () => {
    expect(cardImageUrl(CODE)).toBe(`https://api.rateup.test/api/public/loyalty/cards/${CODE}.png`);
  });

  test("no https origin means no URL", () => {
    process.env.API_URL = "http://localhost:3000";
    expect(cardImageUrl(CODE)).toBeNull();
    process.env.API_URL = "";
    expect(cardImageUrl(CODE)).toBeNull();
  });
});

describe("captions", () => {
  test("the stock caption names the programme, the points and the grouped code", () => {
    const caption = defaultCardCaption({
      name: "Ann",
      programName: "Cafe Rio Rewards",
      pointsName: "Beans",
      code: CODE,
    });
    expect(caption).toContain("Hi Ann, here is your Cafe Rio Rewards card.");
    expect(caption).toContain("Beans");
    expect(caption).toContain("ABC-DEF-GHJ");
  });

  test("the merchant's reply fills name and code; an empty reply is null", () => {
    expect(renderCardReply("Hi {{1}}, code {{2}}", { name: "Ann", cardCode: CODE })).toBe(
      "Hi Ann, code ABC-DEF-GHJ",
    );
    expect(renderCardReply("   ", { name: "Ann", cardCode: CODE })).toBeNull();
    expect(renderCardReply(null, { name: "Ann", cardCode: CODE })).toBeNull();
  });
});

/** The message `sendMemberCard` handed to the sending layer. */
const sentCard = () => (sendLoyalty as Mock).mock.calls[0][0];

describe("sendMemberCard", () => {
  test("sends the image with the stock caption and records the delivery", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(activeAccount());
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: CODE });

    const outcome = await sendMemberCard({ orgId: ORG, accountId: "acct-1" });

    expect(outcome.sent).toBe(true);
    expect(outcome.cardCode).toBe(CODE);
    expect(outcome.cardSentAt).toBeInstanceOf(Date);
    const call = sentCard();
    expect(call).toMatchObject({
      orgId: ORG,
      to: { accountId: "acct-1" },
      intent: { kind: "notify" },
      message: {
        key: "member_card",
        parts: { image: { url: `https://api.rateup.test/api/public/loyalty/cards/${CODE}.png` } },
        sessionOnly: true,
      },
    });
    expect(call.message.text).toContain("Cafe Rio Rewards");
    expect(call.message.text).toContain("ABC-DEF-GHJ");
    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: "acct-1" },
      data: { cardSentAt: expect.any(Date) },
    });
  });

  test("a customer who just wrote in is answered where they wrote", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(activeAccount());
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: CODE });
    const reply = { orgId: ORG, channel: "WHATSAPP" as const, from: "919000000001", phoneId: "p1" };

    await sendMemberCard({ orgId: ORG, accountId: "acct-1", reply });

    expect(replyLoyalty).toHaveBeenCalledWith(
      reply,
      expect.objectContaining({ key: "member_card" }),
    );
    expect(sendLoyalty).not.toHaveBeenCalled();
  });

  test("a closed window is reported, not forced", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(activeAccount());
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: CODE });
    (sendLoyalty as Mock).mockResolvedValue({ sent: false, skippedReason: "session_closed" });

    const outcome = await sendMemberCard({ orgId: ORG, accountId: "acct-1" });

    expect(outcome).toMatchObject({ sent: false, skippedReason: "session_closed", cardCode: CODE });
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("an inactive member or programme is not_active", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(activeAccount({ status: "inactive" }));
    expect((await sendMemberCard({ orgId: ORG, accountId: "acct-1" })).skippedReason).toBe(
      "not_active",
    );

    db.customerLoyaltyAccount.findFirst.mockResolvedValue(
      activeAccount({ program: { name: "x", currencyName: "y", status: "draft" } }),
    );
    expect((await sendMemberCard({ orgId: ORG, accountId: "acct-1" })).skippedReason).toBe(
      "not_active",
    );
    expect(sendLoyalty).not.toHaveBeenCalled();
  });

  test("a refused send leaves cardSentAt alone", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(activeAccount());
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: CODE });
    (sendLoyalty as Mock).mockResolvedValue({ sent: false, skippedReason: "send_failed" });

    const outcome = await sendMemberCard({ orgId: ORG, accountId: "acct-1" });

    expect(outcome).toMatchObject({ sent: false, skippedReason: "send_failed" });
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
  });

  test("without a public origin nothing is sent", async () => {
    process.env.API_URL = "";
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(activeAccount());
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: CODE });

    const outcome = await sendMemberCard({ orgId: ORG, accountId: "acct-1" });

    expect(outcome.skippedReason).toBe("no_public_url");
    expect(sendLoyalty).not.toHaveBeenCalled();
  });

  test("a merchant caption replaces the stock one and is capped at WhatsApp's limit", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(activeAccount());
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: CODE });

    await sendMemberCard({ orgId: ORG, accountId: "acct-1", caption: "x".repeat(2000) });

    const caption = sentCard().message.text;
    expect(caption).toHaveLength(1024);
    expect(caption.endsWith("…")).toBe(true);
  });
});

describe("sendMemberCardIfDue", () => {
  test("only a member with a code and no delivery yet is due", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValueOnce(null);

    expect(await sendMemberCardIfDue("+919000000001", ORG)).toBe(false);
    expect(db.customerLoyaltyAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "active",
          cardCode: { not: null },
          cardSentAt: null,
        }),
      }),
    );
    expect(sendLoyalty).not.toHaveBeenCalled();
  });

  test("a due member gets the card", async () => {
    db.customerLoyaltyAccount.findFirst
      .mockResolvedValueOnce({ id: "acct-1" })
      .mockResolvedValueOnce(activeAccount());
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: CODE });

    expect(await sendMemberCardIfDue("919000000001", ORG)).toBe(true);
    expect(sendLoyalty).toHaveBeenCalledTimes(1);
  });
});
