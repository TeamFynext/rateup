import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    loyaltyWaCommand: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    loyaltyEventTrigger: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    loyaltyReward: { findUnique: vi.fn() },
    loyaltyTransaction: { create: vi.fn() },
    customerLoyaltyAccount: { update: vi.fn() },
    whatsappSettings: { findFirst: vi.fn() },
  },
}));

// The reply helpers are real; everything they say lands on the one sender.
vi.mock("../messaging/send.js", () => ({ sendLoyalty: vi.fn() }));
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.utils.js", () => ({
  generateWhatsAppJoinLink: vi.fn(() => "https://wa.me/join"),
}));
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.controller.js", () => ({
  handleWaJoinRegistration: vi.fn(),
}));
vi.mock("../accounts/account.service.js", () => ({
  assignRewardToCustomer: vi.fn(),
  getLCustomerByPhone: vi.fn(),
  updateCustomerAccount: vi.fn(),
}));
vi.mock("../accounts/memberCard.service.js", () => ({
  ensureMemberCard: vi.fn(async () => "ABCDEFGHJ"),
  renderCardReply: vi.fn(() => null),
  sendMemberCard: vi.fn(async () => ({
    sent: true,
    skippedReason: null,
    cardCode: "ABCDEFGHJ",
    cardSentAt: new Date("2026-09-12T10:00:00Z"),
  })),
}));
vi.mock("../rewards/reward.service.js", () => ({ getActiveLoyaltyRewards: vi.fn() }));
vi.mock("../redemptionValidator.js", () => ({ validateRedemption: vi.fn() }));
vi.mock("../redemptions/redemption.service.js", () => ({ redeemReward: vi.fn() }));
vi.mock("../../../../generated/prisma/client.js", () => ({}));

import prisma from "../../../utils/prisma.js";
import { handleWaJoinRegistration } from "../../whatsapp/whatsappSurvey/wasurvey.controller.js";
import { sendLoyalty } from "../messaging/send.js";
import type { LoyaltyMessage } from "../messaging/types.js";
import {
  assignRewardToCustomer,
  getLCustomerByPhone,
  updateCustomerAccount,
} from "../accounts/account.service.js";
import { getActiveLoyaltyRewards } from "../rewards/reward.service.js";
import { validateRedemption } from "../redemptionValidator.js";
import { redeemReward } from "../redemptions/redemption.service.js";
import { LoyaltyTemplateTypes, WaAutomatedReplyResponseType } from "../../../types/enums.js";
import {
  createEventTrigger,
  createLoyaltyWaCommand,
  deleteEventTrigger,
  deleteLoyaltyWaCommandById,
  getAllEventTriggers,
  getAllLoyaltyWaCommands,
  getEventTrigger,
  getLoyaltyWaCommand,
  getLoyaltyWaCommandByRequestMessage,
  getLoyaltyWaCommandByType,
  handleCustomerRemovalFromLoyalty,
  handleLoyaltyPointsCommand,
  handleLoyaltyRedeemInteraction,
  handleLoyaltyWaCommand,
  replacedContentByDynamicVariable,
  updateEventTrigger,
  updateLoyaltyWaCommand,
} from "./settings.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  loyaltyWaCommand: Record<string, Mock>;
  loyaltyEventTrigger: Record<string, Mock>;
  loyaltyReward: Record<string, Mock>;
  loyaltyTransaction: Record<string, Mock>;
  customerLoyaltyAccount: Record<string, Mock>;
  whatsappSettings: Record<string, Mock>;
};

const ORG = "11111111-1111-4111-8111-111111111111";
const PROGRAM = "prog-1";
const PHONE = "919000000001";
const REPLY = { orgId: ORG, channel: "WHATSAPP" as const, from: PHONE, name: "Ann" };

/** Every message the handlers replied with, in order. */
const replies = (): LoyaltyMessage[] =>
  (sendLoyalty as Mock).mock.calls.map(([input]) => input.message);
const repliedTexts = () => replies().map((message) => message.text);
/** Replies that stand on a template alone: no words of their own. */
const templateReplies = () => replies().filter((message) => !message.text && message.artefacts);

function customer(over: Record<string, unknown> = {}) {
  return {
    id: "acct-1",
    programId: PROGRAM,
    status: "active",
    currentPoints: 500,
    lifetimePoints: 900,
    referralCode: "ANN-AB12",
    ...over,
  };
}

interface CommandFixture {
  id: string;
  orgId: string;
  type: LoyaltyTemplateTypes;
  responseType: WaAutomatedReplyResponseType;
  waTemplateId: string | null;
  requestMessage: string | null;
  createdAt: Date;
  content: RichTextNode | string | null;
  whatsappSettingsPhoneId: string | null;
}

function command(over: Record<string, unknown> = {}) {
  const base: CommandFixture = {
    id: "cmd-1",
    orgId: ORG,
    type: LoyaltyTemplateTypes.PointInformation,
    responseType: WaAutomatedReplyResponseType.Text,
    waTemplateId: "tmpl-1",
    requestMessage: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    content: null,
    whatsappSettingsPhoneId: null,
  };
  return { ...base, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  (getLCustomerByPhone as Mock).mockResolvedValue(customer());
  (getActiveLoyaltyRewards as Mock).mockResolvedValue([]);
  (validateRedemption as Mock).mockResolvedValue({ valid: true, violations: [] });
  (assignRewardToCustomer as Mock).mockResolvedValue({
    id: "cr-1",
    shortCode: "SHORT123",
    reward: { id: "rwd-1", name: "Free coffee", pointsCost: 100, programId: PROGRAM },
  });
  (redeemReward as Mock).mockResolvedValue({
    message: "Reward assigned successfully. Short code: SHORT123",
    shortCode: "SHORT123",
    redemptionCode: "RU-ABC123",
  });
  db.loyaltyReward.findUnique.mockResolvedValue({
    id: "rwd-1",
    name: "Free coffee",
    programId: PROGRAM,
    pointsCost: 100,
    rewardType: "gift",
    stockQuantity: null,
    stockRedeemed: 0,
  });
  db.whatsappSettings.findFirst.mockResolvedValue({ phone: "919999999999" });
  db.loyaltyWaCommand.findFirst.mockResolvedValue(null);
});

// ===========================================================================
// LoyaltyWaCommand CRUD
// ===========================================================================

describe("the WhatsApp command CRUD", () => {
  test("an empty template id is stored as absent rather than blank", async () => {
    await createLoyaltyWaCommand({ type: "PointInformation", waTemplateId: "", orgId: ORG } as any);

    expect(db.loyaltyWaCommand.create.mock.calls[0][0].data.waTemplateId).toBeUndefined();
  });

  test("a real template id is kept", async () => {
    await createLoyaltyWaCommand({
      type: "PointInformation",
      waTemplateId: "tmpl-1",
      orgId: ORG,
    } as any);

    expect(db.loyaltyWaCommand.create.mock.calls[0][0].data.waTemplateId).toBe("tmpl-1");
  });

  test("a command is fetched by type within one org", async () => {
    await getLoyaltyWaCommandByType(LoyaltyTemplateTypes.PointInformation, ORG);

    expect(db.loyaltyWaCommand.findFirst.mock.calls[0][0].where).toEqual({
      type: "PointInformation",
      orgId: ORG,
    });
  });

  test("the request-message lookup requires the org's program to be active", async () => {
    await getLoyaltyWaCommandByRequestMessage(ORG, "points");

    expect(db.loyaltyWaCommand.findFirst.mock.calls[0][0].where).toEqual({
      orgId: ORG,
      requestMessage: { equals: "points", mode: "insensitive" },
      org: { loyaltyProgram: { status: "active" } },
    });
  });

  test("all of an org's commands are listed together", async () => {
    await getAllLoyaltyWaCommands(ORG);

    expect(db.loyaltyWaCommand.findMany.mock.calls[0][0]).toEqual({ where: { orgId: ORG } });
  });

  test("fetch, update and delete are all scoped to the org", async () => {
    await getLoyaltyWaCommand("cmd-other-org", ORG);
    await updateLoyaltyWaCommand("cmd-other-org", { content: "x" }, ORG);
    await deleteLoyaltyWaCommandById("cmd-other-org", ORG);

    expect(db.loyaltyWaCommand.findFirst.mock.calls[0][0]).toEqual({
      where: { id: "cmd-other-org", orgId: ORG },
    });
    expect(db.loyaltyWaCommand.update.mock.calls[0][0].where).toEqual({
      id: "cmd-other-org",
      orgId: ORG,
    });
    expect(db.loyaltyWaCommand.delete.mock.calls[0][0]).toEqual({
      where: { id: "cmd-other-org", orgId: ORG },
    });
  });

  // `actionId` is accepted on the input schema, but `LoyaltyWaCommand` has no such
  // column in the DB (only `LoyaltyApiSettings` does, for a different feature) — it is
  // now dropped before reaching Prisma rather than being written and rejected at
  // runtime as an unknown field.
  test("an update blanks out empty ids and drops the unsupported actionId field", async () => {
    await updateLoyaltyWaCommand("cmd-1", { waTemplateId: "", actionId: "", content: "x" }, ORG);

    const data = db.loyaltyWaCommand.update.mock.calls[0][0].data;
    expect(data).toMatchObject({
      waTemplateId: undefined,
      content: "x",
    });
    expect(data).not.toHaveProperty("actionId");
  });
});

// ===========================================================================
// handleLoyaltyWaCommand dispatch
// ===========================================================================

describe("handleLoyaltyWaCommand", () => {
  test("a registration command goes to the join flow", async () => {
    await handleLoyaltyWaCommand(
      REPLY,
      command({ type: LoyaltyTemplateTypes.CustomerRegistration }) as any,
    );

    expect(handleWaJoinRegistration).toHaveBeenCalledWith({
      orgId: ORG,
      from: PHONE,
      userName: "Ann",
      joinPayload: {},
      sourceIdentifier: "loyalty",
      reply: REPLY,
    });
  });

  test("a points command answers with the customer's balance", async () => {
    await handleLoyaltyWaCommand(
      REPLY,
      command({ responseType: WaAutomatedReplyResponseType.Template }) as any,
    );

    expect(templateReplies()[0]?.artefacts?.WHATSAPP).toEqual({
      waTemplateId: "tmpl-1",
      params: ["500", "400", "900"],
    });
  });

  test("a removal command deactivates the account", async () => {
    await handleLoyaltyWaCommand(
      REPLY,
      command({ type: LoyaltyTemplateTypes.CustomerRemoval }) as any,
    );

    expect(updateCustomerAccount).toHaveBeenCalledWith("acct-1", { status: "inactive" }, PROGRAM);
  });

  test("an unrecognised command type does nothing at all", async () => {
    await handleLoyaltyWaCommand(REPLY, command({ type: "SomethingElse" }) as any);

    expect(sendLoyalty).not.toHaveBeenCalled();
    expect(templateReplies()).toHaveLength(0);
  });
});

describe("handleLoyaltyWaCommand — RewardsIssued", () => {
  test("lists the rewards the member can afford, as choices that start the redeem flow", async () => {
    (getActiveLoyaltyRewards as Mock).mockResolvedValue([
      {
        id: "r1",
        name: "Free coffee and a very long pastry name",
        pointsCost: 100,
        rewardType: "point",
        stockQuantity: null,
        stockRedeemed: 0,
      },
      {
        id: "r2",
        name: "Hamper",
        pointsCost: 5000,
        rewardType: "point",
        stockQuantity: null,
        stockRedeemed: 0,
      },
    ]);

    await handleLoyaltyWaCommand(
      REPLY,
      command({ type: LoyaltyTemplateTypes.RewardsIssued }) as any,
    );

    expect(replies()[0]).toEqual({
      key: "keyword:rewards",
      text: "You have 500 points. Select a reward to continue.",
      parts: {
        title: "Rewards",
        list: {
          button: "View rewards",
          rows: [{ id: "loyalty_reward:r1", title: "Free coffee and a very l" }],
        },
      },
    });
  });

  test("says so when nothing is within reach", async () => {
    await handleLoyaltyWaCommand(
      REPLY,
      command({ type: LoyaltyTemplateTypes.RewardsIssued }) as any,
    );

    expect(repliedTexts()).toEqual(["No rewards are available for your current points right now."]);
  });
});

describe("handleLoyaltyPointsCommand", () => {
  test("turns away a non-member", async () => {
    (getLCustomerByPhone as Mock).mockResolvedValue(null);

    await handleLoyaltyPointsCommand(REPLY, command());

    expect(repliedTexts()).toContain("You are not an active member of our loyalty programme");
  });

  test("turns away a member whose account is inactive", async () => {
    (getLCustomerByPhone as Mock).mockResolvedValue(customer({ status: "inactive" }));

    await handleLoyaltyPointsCommand(REPLY, command());

    expect(templateReplies()).toHaveLength(0);
  });

  // The middle variable is "points spent", derived as lifetime minus current.
  test("reports current, spent and lifetime points in that order", async () => {
    await handleLoyaltyPointsCommand(
      REPLY,
      command({ responseType: WaAutomatedReplyResponseType.Template }),
    );

    expect(templateReplies()[0]?.artefacts?.WHATSAPP?.params).toEqual(["500", "400", "900"]);
  });

  test("reports negative spend when the balance exceeds the lifetime total", async () => {
    (getLCustomerByPhone as Mock).mockResolvedValue(
      customer({ currentPoints: 900, lifetimePoints: 500 }),
    );

    await handleLoyaltyPointsCommand(
      REPLY,
      command({ responseType: WaAutomatedReplyResponseType.Template }),
    );

    expect(templateReplies()[0]?.artefacts?.WHATSAPP?.params).toEqual(["900", "-400", "500"]);
  });

  test("a response type of neither kind answers nothing", async () => {
    await handleLoyaltyPointsCommand(REPLY, command({ responseType: "Nothing" }));

    expect(templateReplies()).toHaveLength(0);
    expect(sendLoyalty).not.toHaveBeenCalled();
  });
});

describe("keyword replies inside the open window", () => {
  // The customer has just texted the keyword, so the window is open and the reply's own
  // text is free: it wins over an attached template, which is for customers who have
  // never messaged (see the registration reply in contact.controller).
  test("a points reply with text sends the text even when a template is attached", async () => {
    await handleLoyaltyPointsCommand(
      REPLY,
      command({
        responseType: WaAutomatedReplyResponseType.Template,
        content: "You have {{1}} points ({{3}} lifetime).",
      }),
    );

    expect(templateReplies()).toHaveLength(0);
    expect(repliedTexts()).toContain("You have 500 points (900 lifetime).");
  });

  test("a removal reply with text sends the text even when a template is attached", async () => {
    await handleCustomerRemovalFromLoyalty(
      REPLY,
      command({ responseType: WaAutomatedReplyResponseType.Template, content: "Bye" }) as any,
    );

    expect(templateReplies()).toHaveLength(0);
    expect(repliedTexts()).toContain("Bye");
  });
});

describe("handleCustomerRemovalFromLoyalty", () => {
  test("turns away a non-member without changing anything", async () => {
    (getLCustomerByPhone as Mock).mockResolvedValue(null);

    await handleCustomerRemovalFromLoyalty(REPLY, command() as any);

    expect(updateCustomerAccount).not.toHaveBeenCalled();
  });

  test("deactivates with the lower-case status the schema uses", async () => {
    await handleCustomerRemovalFromLoyalty(REPLY, command() as any);

    expect(updateCustomerAccount).toHaveBeenCalledWith("acct-1", { status: "inactive" }, PROGRAM);
  });

  test("confirms the removal by template when configured that way", async () => {
    await handleCustomerRemovalFromLoyalty(
      REPLY,
      command({ responseType: WaAutomatedReplyResponseType.Template }) as any,
    );

    expect(templateReplies()[0]?.artefacts?.WHATSAPP).toEqual({
      waTemplateId: "tmpl-1",
      params: [],
    });
  });

  test("confirms the removal by text when configured that way", async () => {
    await handleCustomerRemovalFromLoyalty(
      REPLY,
      command({ responseType: WaAutomatedReplyResponseType.Text, content: "Goodbye" }) as any,
    );

    expect(repliedTexts()).toContain("Goodbye");
  });
});

// ===========================================================================
// The WhatsApp redeem flow
// ===========================================================================

describe("handleLoyaltyRedeemInteraction", () => {
  test("ignores a message that carries no button", async () => {
    expect(await handleLoyaltyRedeemInteraction(REPLY, {})).toBe(false);
    expect(sendLoyalty).not.toHaveBeenCalled();
  });

  test("ignores a button that is not a loyalty one", async () => {
    expect(await handleLoyaltyRedeemInteraction(REPLY, { buttonId: "survey:1" })).toBe(false);
  });

  test("a cancel button just acknowledges", async () => {
    expect(
      await handleLoyaltyRedeemInteraction(REPLY, { buttonId: "loyalty_reward_cancel:rwd-1" }),
    ).toBe(true);
    expect(repliedTexts()).toContain("Reward redemption cancelled.");
  });

  test("selecting a reward asks the customer to confirm", async () => {
    await handleLoyaltyRedeemInteraction(REPLY, { buttonId: "loyalty_reward:rwd-1" });

    expect(replies()[0]?.parts?.buttons).toEqual([
      { id: "loyalty_reward_confirm:rwd-1", title: "Confirm" },
      { id: "loyalty_reward_cancel:rwd-1", title: "Cancel" },
    ]);
  });

  test("refuses a reward that belongs to a different program", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue({ id: "rwd-1", programId: "prog-other" });

    await handleLoyaltyRedeemInteraction(REPLY, { buttonId: "loyalty_reward:rwd-1" });

    expect(repliedTexts()).toContain("Selected reward is invalid.");
    expect(replies().some((message) => message.parts)).toBe(false);
  });

  test("refuses a reward the customer cannot afford", async () => {
    (getLCustomerByPhone as Mock).mockResolvedValue(customer({ currentPoints: 10 }));

    await handleLoyaltyRedeemInteraction(REPLY, { buttonId: "loyalty_reward:rwd-1" });

    expect(repliedTexts()).toContain(
      "This reward is no longer available or you do not have enough points.",
    );
  });

  test("refuses a reward that has sold out", async () => {
    db.loyaltyReward.findUnique.mockResolvedValue({
      id: "rwd-1",
      programId: PROGRAM,
      pointsCost: 100,
      rewardType: "gift",
      stockQuantity: 5,
      stockRedeemed: 5,
    });

    await handleLoyaltyRedeemInteraction(REPLY, { buttonId: "loyalty_reward:rwd-1" });

    expect(replies().some((message) => message.parts)).toBe(false);
  });

  test("turns away a customer who is not an active member", async () => {
    (getLCustomerByPhone as Mock).mockResolvedValue(null);

    await handleLoyaltyRedeemInteraction(REPLY, { buttonId: "loyalty_reward:rwd-1" });

    expect(db.loyaltyReward.findUnique).not.toHaveBeenCalled();
  });
});

describe("handleLoyaltyRedeemInteraction — confirming", () => {
  const confirm = { buttonId: "loyalty_reward_confirm:rwd-1" };

  test("redeems through redeemReward and reports the short code", async () => {
    await handleLoyaltyRedeemInteraction(REPLY, confirm);

    expect(redeemReward).toHaveBeenCalledWith(PROGRAM, {
      customerId: "acct-1",
      rewardId: "rwd-1",
      notes: "WhatsApp redeem flow",
    });
    expect(repliedTexts().at(-1)).toContain("SHORT123");
  });

  test("does not deduct anything itself", async () => {
    await handleLoyaltyRedeemInteraction(REPLY, confirm);

    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
  });

  test("passes the redemption's error text back to the customer", async () => {
    (redeemReward as Mock).mockRejectedValue(new Error("Insufficient points. Required: 100"));

    await handleLoyaltyRedeemInteraction(REPLY, confirm);

    expect(repliedTexts().at(-1)).toBe("Insufficient points. Required: 100");
  });

  test("tells the customer which rule refused the redemption", async () => {
    (validateRedemption as Mock).mockResolvedValue({
      valid: false,
      violations: ["Daily redemption limit reached"],
    });

    await handleLoyaltyRedeemInteraction(REPLY, confirm);

    expect(repliedTexts().at(-1)).toBe("Daily redemption limit reached");
    expect(assignRewardToCustomer).not.toHaveBeenCalled();
  });

  test("goes through the one redemption path, so the rules can count it", async () => {
    await handleLoyaltyRedeemInteraction(REPLY, confirm);

    expect(redeemReward).toHaveBeenCalledTimes(1);
    // Nothing written here directly — no ledger row, no balance move, no
    // reward lookup of its own.
    expect(db.loyaltyTransaction.create).not.toHaveBeenCalled();
    expect(db.customerLoyaltyAccount.update).not.toHaveBeenCalled();
    expect(db.loyaltyReward.findUnique).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// replacedContentByDynamicVariable
// ===========================================================================

describe("replacedContentByDynamicVariable", () => {
  const doc = () => [{ content: [{ text: "Hi {{1}}, you have {{2}} points" }] }];

  test("substitutes each placeholder by position", () => {
    const res: any = replacedContentByDynamicVariable(doc(), ["Ann", 500]);

    expect(res[0].content[0].text).toBe("Hi Ann, you have 500 points");
  });

  test("leaves a placeholder alone when no variable was supplied", () => {
    const res: any = replacedContentByDynamicVariable(doc(), ["Ann"]);

    expect(res[0].content[0].text).toBe("Hi Ann, you have {{2}} points");
  });

  test("accepts a wrapped document as well as a bare array", () => {
    const res: any = replacedContentByDynamicVariable({ content: doc() }, ["Ann", 500]);

    expect(res[0].content[0].text).toBe("Hi Ann, you have 500 points");
  });

  test("skips paragraphs that carry no content", () => {
    const res: any = replacedContentByDynamicVariable([{ type: "hr" }], ["Ann"]);

    expect(res).toEqual([{ type: "hr" }]);
  });

  test("leaves the caller's document untouched", () => {
    const original = doc();

    replacedContentByDynamicVariable(original, ["Ann", 500]);

    expect(original[0].content[0].text).toBe("Hi {{1}}, you have {{2}} points");
  });

  test("renders the same document twice without the first render spoiling it", () => {
    const original = doc();

    const first: any = replacedContentByDynamicVariable(original, ["Ann", 500]);
    const second: any = replacedContentByDynamicVariable(original, ["Bob", 10]);

    expect(first[0].content[0].text).toBe("Hi Ann, you have 500 points");
    expect(second[0].content[0].text).toBe("Hi Bob, you have 10 points");
  });
});

// ===========================================================================
// Event trigger CRUD
// ===========================================================================

describe("the event-trigger CRUD", () => {
  test("a new trigger defaults to enabled", async () => {
    await createEventTrigger({ eventType: "BIRTHDAY" } as any, PROGRAM);

    expect(db.loyaltyEventTrigger.create.mock.calls[0][0].data.enabled).toBe(true);
  });

  test("an explicit disabled flag is honoured", async () => {
    await createEventTrigger(
      {
        eventType: "BIRTHDAY",
        enabled: false,
      } as any,
      PROGRAM,
    );

    expect(db.loyaltyEventTrigger.create.mock.calls[0][0].data.enabled).toBe(false);
  });

  test("writes the caller's program, not one named in the input", async () => {
    await createEventTrigger(
      { programId: "prog-other-org", eventType: "BIRTHDAY" } as any,
      PROGRAM,
    );

    expect(db.loyaltyEventTrigger.create.mock.calls[0][0].data.programId).toBe(PROGRAM);
  });

  test("fetch, update and delete are all scoped to the program", async () => {
    await getEventTrigger("trg-1", PROGRAM);
    await updateEventTrigger("trg-1", { enabled: false } as any, PROGRAM);
    await deleteEventTrigger("trg-1", PROGRAM);

    expect(db.loyaltyEventTrigger.findFirst.mock.calls[0][0].where).toEqual({
      id: "trg-1",
      programId: PROGRAM,
    });
    expect(db.loyaltyEventTrigger.update.mock.calls[0][0].where).toEqual({
      id: "trg-1",
      programId: PROGRAM,
    });
    expect(db.loyaltyEventTrigger.delete).toHaveBeenCalledWith({
      where: { id: "trg-1", programId: PROGRAM },
    });
  });

  test("listing a program's triggers filters on that program", async () => {
    await getAllEventTriggers(PROGRAM);

    expect(db.loyaltyEventTrigger.findMany.mock.calls[0][0].where).toEqual({
      programId: PROGRAM,
    });
  });

  test("cannot be asked for more than one program's triggers", async () => {
    await getAllEventTriggers(PROGRAM);

    expect(db.loyaltyEventTrigger.findMany.mock.calls[0][0].where).toEqual({
      programId: PROGRAM,
    });
    expect(db.loyaltyEventTrigger.findMany.mock.calls[0][0].include).toHaveProperty("program");
  });
});

describe("handleLoyaltyWaCommand — MemberCard", () => {
  test("an active member gets their card, captioned with the merchant's reply", async () => {
    const { ensureMemberCard, renderCardReply, sendMemberCard } =
      await import("../accounts/memberCard.service.js");
    (getLCustomerByPhone as Mock).mockResolvedValue({
      id: "acct-1",
      status: "active",
      contact: { name: "Ann" },
    });
    (renderCardReply as Mock).mockReturnValue("Hi Ann, your card: ABC-DEF-GHJ");

    await handleLoyaltyWaCommand(
      REPLY,
      command({
        type: LoyaltyTemplateTypes.MemberCard,
        content: "Hi {{1}}, your card: {{2}}",
      }) as any,
    );

    expect(ensureMemberCard).toHaveBeenCalledWith("acct-1");
    expect(renderCardReply).toHaveBeenCalledWith("Hi {{1}}, your card: {{2}}", {
      name: "Ann",
      cardCode: "ABCDEFGHJ",
    });
    expect(sendMemberCard).toHaveBeenCalledWith({
      orgId: ORG,
      accountId: "acct-1",
      caption: "Hi Ann, your card: ABC-DEF-GHJ",
      reply: REPLY,
    });
    expect(sendLoyalty).not.toHaveBeenCalled();
  });

  test("a non-member is told so and no card is attempted", async () => {
    const { sendMemberCard } = await import("../accounts/memberCard.service.js");
    (getLCustomerByPhone as Mock).mockResolvedValue(null);

    await handleLoyaltyWaCommand(REPLY, command({ type: LoyaltyTemplateTypes.MemberCard }) as any);

    expect(sendMemberCard).not.toHaveBeenCalled();
    expect(repliedTexts()).toContain("You are not an active member of our loyalty programme");
  });

  test("a refused send is explained in text rather than silently dropped", async () => {
    const { sendMemberCard } = await import("../accounts/memberCard.service.js");
    (getLCustomerByPhone as Mock).mockResolvedValue({
      id: "acct-1",
      status: "active",
      contact: { name: "Ann" },
    });
    (sendMemberCard as Mock).mockResolvedValueOnce({
      sent: false,
      skippedReason: "send_failed",
      cardCode: "ABCDEFGHJ",
      cardSentAt: null,
    });

    await handleLoyaltyWaCommand(REPLY, command({ type: LoyaltyTemplateTypes.MemberCard }) as any);

    expect(repliedTexts()).toContainEqual(expect.stringContaining("could not send your card"));
  });
});
