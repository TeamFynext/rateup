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
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.service.js", () => ({ sendMessage: vi.fn() }));
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.utils.js", () => ({
  createReplyImageMessage: vi.fn((to: string, link: string, _p: unknown, caption: string) => ({
    to,
    link,
    caption,
  })),
}));
vi.mock("../loyaltyMessaging.js", () => ({ isCustomerSessionOpen: vi.fn() }));
vi.mock("../../../../generated/prisma/client.js", () => ({
  PlatformType: { WHATSAPP: "WHATSAPP" },
}));
vi.mock("qrcode", () => ({
  default: { toBuffer: vi.fn(async (text: string) => Buffer.from(`png:${text}`)) },
}));

import prisma from "../../../utils/prisma.js";
import { randomCode } from "../../../utils/misc/random.utils.js";
import { sendMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import { isCustomerSessionOpen } from "../loyaltyMessaging.js";
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
const CODE = "ABCDEFGHJKLM";

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
  (isCustomerSessionOpen as Mock).mockResolvedValue(true);
  (sendMessage as Mock).mockResolvedValue({ status: true, message: "wamid.1" });
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

  test("mints twelve characters and claims them with a conditional update", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: null });
    (randomCode as Mock).mockReturnValue(CODE);
    db.customerLoyaltyAccount.updateMany.mockResolvedValue({ count: 1 });

    expect(await ensureMemberCard("acct-1")).toBe(CODE);
    expect(randomCode).toHaveBeenCalledWith(12);
    expect(db.customerLoyaltyAccount.updateMany).toHaveBeenCalledWith({
      where: { id: "acct-1", cardCode: null },
      data: { cardCode: CODE },
    });
  });

  test("retries a collision on the unique index", async () => {
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: null });
    (randomCode as Mock).mockReturnValueOnce("TAKENTAKENTA").mockReturnValueOnce(CODE);
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
    expect(caption).toContain("ABCD-EFGH-JKLM");
  });

  test("the merchant's reply fills name and code; an empty reply is null", () => {
    expect(renderCardReply("Hi {{1}}, code {{2}}", { name: "Ann", cardCode: CODE })).toBe(
      "Hi Ann, code ABCD-EFGH-JKLM",
    );
    expect(renderCardReply("   ", { name: "Ann", cardCode: CODE })).toBeNull();
    expect(renderCardReply(null, { name: "Ann", cardCode: CODE })).toBeNull();
  });
});

describe("sendMemberCard", () => {
  test("sends the image with the stock caption and records the delivery", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(activeAccount());
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: CODE });

    const outcome = await sendMemberCard({ orgId: ORG, accountId: "acct-1" });

    expect(outcome.sent).toBe(true);
    expect(outcome.cardCode).toBe(CODE);
    expect(outcome.cardSentAt).toBeInstanceOf(Date);
    const [orgId, body, , , , , , , messageType, isAutomated] = (sendMessage as Mock).mock.calls[0];
    expect(orgId).toBe(ORG);
    expect(body).toMatchObject({
      to: "919000000001",
      link: `https://api.rateup.test/api/public/loyalty/cards/${CODE}.png`,
    });
    expect(body.caption).toContain("Cafe Rio Rewards");
    expect(body.caption).toContain("ABCD-EFGH-JKLM");
    expect(messageType).toBe("AUTOMATED");
    expect(isAutomated).toBe(true);
    expect(db.customerLoyaltyAccount.update).toHaveBeenCalledWith({
      where: { id: "acct-1" },
      data: { cardSentAt: expect.any(Date) },
    });
  });

  test("a closed window is reported, not forced", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(activeAccount());
    (isCustomerSessionOpen as Mock).mockResolvedValue(false);

    const outcome = await sendMemberCard({ orgId: ORG, accountId: "acct-1" });

    expect(outcome).toMatchObject({ sent: false, skippedReason: "session_closed", cardCode: CODE });
    expect(sendMessage).not.toHaveBeenCalled();
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
    expect(isCustomerSessionOpen).not.toHaveBeenCalled();
  });

  test("a refused Graph send leaves cardSentAt alone", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(activeAccount());
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: CODE });
    (sendMessage as Mock).mockResolvedValue({ status: false, error: "nope" });

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
    expect(sendMessage).not.toHaveBeenCalled();
  });

  test("a merchant caption replaces the stock one and is capped at WhatsApp's limit", async () => {
    db.customerLoyaltyAccount.findFirst.mockResolvedValue(activeAccount());
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: CODE });

    await sendMemberCard({ orgId: ORG, accountId: "acct-1", caption: "x".repeat(2000) });

    const body = (sendMessage as Mock).mock.calls[0][1];
    expect(body.caption).toHaveLength(1024);
    expect(body.caption.endsWith("…")).toBe(true);
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
    expect(sendMessage).not.toHaveBeenCalled();
  });

  test("a due member gets the card", async () => {
    db.customerLoyaltyAccount.findFirst
      .mockResolvedValueOnce({ id: "acct-1" })
      .mockResolvedValueOnce(activeAccount());
    db.customerLoyaltyAccount.findUnique.mockResolvedValue({ cardCode: CODE });

    expect(await sendMemberCardIfDue("919000000001", ORG)).toBe(true);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });
});
