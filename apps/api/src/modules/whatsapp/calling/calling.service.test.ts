import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    waCall: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    waMessage: { create: vi.fn() },
    whatsappSettings: { findFirst: vi.fn() },
    waInboxAssign: { findMany: vi.fn() },
    orgMember: { findMany: vi.fn() },
  },
}));
vi.mock("../../../utils/redisConnection.js", () => ({
  default: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../../authz/actor.js", () => ({ loadActor: vi.fn() }));
vi.mock("../../contact/contact.service.js", () => ({
  getContactById: vi.fn(),
  getOrCreateWaContact: vi.fn(),
}));
vi.mock("../../contact/conversation/conversation.service.js", () => ({
  getActiveConversationForContact: vi.fn(),
  openConversationForContact: vi.fn(),
}));
vi.mock("../../org/ws/org.ws.controller.js", () => ({ sendViaWstoOrgHandler: vi.fn() }));
vi.mock("../settings/wa_channel_access.js", () => ({ getChannelScope: vi.fn() }));
vi.mock("../settings/wa_settings.service.js", () => ({
  getWaSettings: vi.fn(),
  getWaSettingsByPhoneId: vi.fn(),
}));
vi.mock("../wa_axios.js", () => ({
  callMetaApi: vi.fn(),
  GraphApiError: class GraphApiError extends Error {
    error: { code: number };
    constructor(code: number) {
      super("graph");
      this.error = { code };
    }
  },
}));
vi.mock("../whatsappSurvey/wasurvey.service.js", () => ({ sendMessage: vi.fn() }));
vi.mock("./calling.push.js", () => ({
  pushIncomingCall: vi.fn(),
  pushCallStoppedRinging: vi.fn(),
}));
vi.mock("../../../workers/bullmq/queues/callWatchdog.queue.js", () => ({
  armCallWatchdog: vi.fn(),
}));

import prisma from "../../../utils/prisma.js";
import redis from "../../../utils/redisConnection.js";
import { loadActor } from "../../../authz/actor.js";
import { getContactById, getOrCreateWaContact } from "../../contact/contact.service.js";
import { getActiveConversationForContact } from "../../contact/conversation/conversation.service.js";
import { sendViaWstoOrgHandler } from "../../org/ws/org.ws.controller.js";
import { getChannelScope } from "../settings/wa_channel_access.js";
import { getWaSettings, getWaSettingsByPhoneId } from "../settings/wa_settings.service.js";
import { callMetaApi, GraphApiError } from "../wa_axios.js";
import { armCallWatchdog } from "../../../workers/bullmq/queues/callWatchdog.queue.js";
import { pushIncomingCall } from "./calling.push.js";
import {
  acceptCall,
  callSummary,
  finalCallStatus,
  handleCallsWebhook,
  heartbeatCall,
  isCallingDisabled,
  isMissingCallPermission,
  startCall,
} from "./calling.service.js";

const ORG = "11111111-1111-1111-1111-111111111111";
const PHONE_ID = "1027759703761684";
const CALL_ID = "22222222-2222-2222-2222-222222222222";
const CONTACT_ID = "33333333-3333-3333-3333-333333333333";

const settings = {
  orgId: ORG,
  phoneId: PHONE_ID,
  channelId: "chan-1",
  accessToken: "token",
};

function actor(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    orgId: ORG,
    userId,
    scope: { all: true, teamIds: [], inbox: "all" },
    can: () => true,
    ...overrides,
  } as never;
}

function callRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CALL_ID,
    orgId: ORG,
    waCallId: "wacid.ABC",
    phoneId: PHONE_ID,
    direction: "USER_INITIATED",
    status: "RINGING",
    customerWaId: "919800000000",
    contactId: CONTACT_ID,
    conversationId: null,
    initiatedById: null,
    answeredById: null,
    answeredAt: null,
    endedAt: null,
    durationSeconds: null,
    errorCode: null,
    errorMessage: null,
    logMessageId: null,
    createdAt: new Date("2026-10-07T10:00:00Z"),
    updatedAt: new Date("2026-10-07T10:00:00Z"),
    contact: { name: "Asha" },
    ...overrides,
  };
}

function callsWebhook(value: Record<string, unknown>) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba",
        changes: [
          {
            field: "calls",
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: PHONE_ID, display_phone_number: "916282034535" },
              ...value,
            },
          },
        ],
      },
    ],
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getWaSettings).mockResolvedValue(settings as never);
  vi.mocked(getWaSettingsByPhoneId).mockResolvedValue(settings as never);
  vi.mocked(getChannelScope).mockResolvedValue({ all: true, ids: new Set() } as never);
  vi.mocked(prisma.whatsappSettings.findFirst).mockResolvedValue({ channelId: "chan-1" } as never);
  vi.mocked(prisma.waInboxAssign.findMany).mockResolvedValue([]);
  vi.mocked(redis.get).mockResolvedValue(null);
});

describe("incoming call webhook", () => {
  test("creates the call, keeps the offer off the broadcast, and rings only agents who can reply", async () => {
    vi.mocked(getOrCreateWaContact).mockResolvedValue({
      contact: { id: CONTACT_ID },
    } as never);
    vi.mocked(getActiveConversationForContact).mockResolvedValue({ id: "conv-1" } as never);
    vi.mocked(prisma.waCall.create).mockResolvedValue(callRow() as never);
    vi.mocked(prisma.orgMember.findMany).mockResolvedValue([
      { userId: "agent" },
      { userId: "viewer" },
    ] as never);
    vi.mocked(loadActor).mockImplementation(async (userId) =>
      actor(userId, { can: () => userId === "agent" }),
    );

    await handleCallsWebhook(
      callsWebhook({
        contacts: [{ wa_id: "919800000000", profile: { name: "Asha" } }],
        calls: [
          {
            id: "wacid.ABC",
            from: "919800000000",
            to: "916282034535",
            event: "connect",
            direction: "USER_INITIATED",
            timestamp: "1791367200",
            session: { sdp_type: "offer", sdp: "v=0 offer" },
          },
        ],
      }),
    );

    expect(prisma.waCall.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          waCallId: "wacid.ABC",
          direction: "USER_INITIATED",
          contactId: CONTACT_ID,
          conversationId: "conv-1",
        }),
      }),
    );
    expect(redis.set).toHaveBeenCalledWith("wacall:offer:wacid.ABC", "v=0 offer", "EX", 120);
    const [, message, surface, userIds] = vi.mocked(sendViaWstoOrgHandler).mock.calls[0];
    expect(surface).toBe("main");
    expect(userIds).toEqual(["agent"]);
    expect(message.call?.event).toBe("incoming");
    expect(JSON.stringify(message)).not.toContain("v=0 offer");
    // Phones in the background ring through push, for the same people the socket reached.
    expect(pushIncomingCall).toHaveBeenCalledWith(
      expect.objectContaining({ callId: CALL_ID, userIds: ["agent"], callerName: "Asha" }),
    );
  });

  test("a redelivered connect does not ring twice", async () => {
    vi.mocked(getOrCreateWaContact).mockResolvedValue({
      contact: { id: CONTACT_ID },
    } as never);
    vi.mocked(getActiveConversationForContact).mockResolvedValue({ id: "conv-1" } as never);
    vi.mocked(prisma.waCall.create).mockRejectedValue(
      Object.assign(new Error(), { code: "P2002" }),
    );

    await handleCallsWebhook(
      callsWebhook({
        calls: [
          {
            id: "wacid.ABC",
            from: "919800000000",
            to: "916282034535",
            event: "connect",
            direction: "USER_INITIATED",
            timestamp: "1791367200",
            session: { sdp_type: "offer", sdp: "v=0" },
          },
        ],
      }),
    );

    expect(sendViaWstoOrgHandler).not.toHaveBeenCalled();
  });
});

describe("terminate webhook", () => {
  const terminate = callsWebhook({
    calls: [
      {
        id: "wacid.ABC",
        from: "919800000000",
        to: "916282034535",
        event: "terminate",
        direction: "USER_INITIATED",
        timestamp: "1791367260",
        status: "COMPLETED",
        start_time: "1791367200",
        end_time: "1791367260",
        duration: 60,
      },
    ],
  });

  test("finalises an answered call and writes one thread entry", async () => {
    const answered = callRow({ status: "ACCEPTED", answeredAt: new Date(), answeredById: "agent" });
    vi.mocked(prisma.waCall.findUnique).mockResolvedValue(answered as never);
    vi.mocked(prisma.waCall.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.waCall.findUniqueOrThrow).mockResolvedValue(
      callRow({
        ...answered,
        status: "COMPLETED",
        durationSeconds: 60,
        endedAt: new Date(),
      }) as never,
    );
    vi.mocked(prisma.waMessage.create).mockResolvedValue({ id: "msg-1" } as never);

    await handleCallsWebhook(terminate);

    expect(prisma.waCall.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CALL_ID, endedAt: null },
        data: expect.objectContaining({ status: "COMPLETED", durationSeconds: 60 }),
      }),
    );
    const entry = vi.mocked(prisma.waMessage.create).mock.calls[0][0].data.messageBody as {
      internal: { summary: string; call: { status: string } };
    };
    expect(entry.internal.summary).toBe("Incoming voice call · 1m 00s");
    expect(entry.internal.call.status).toBe("COMPLETED");
    expect(prisma.waCall.update).toHaveBeenCalledWith({
      where: { id: CALL_ID },
      data: { logMessageId: "msg-1" },
    });
  });

  test("a redelivered terminate writes nothing", async () => {
    vi.mocked(prisma.waCall.findUnique).mockResolvedValue(callRow() as never);
    vi.mocked(prisma.waCall.updateMany).mockResolvedValue({ count: 0 });

    await handleCallsWebhook(terminate);

    expect(prisma.waMessage.create).not.toHaveBeenCalled();
    expect(sendViaWstoOrgHandler).not.toHaveBeenCalled();
  });
});

describe("acceptCall", () => {
  test("only one agent wins the claim", async () => {
    vi.mocked(prisma.waCall.findFirst).mockResolvedValue(callRow() as never);
    vi.mocked(prisma.waCall.updateMany).mockResolvedValue({ count: 0 });

    await expect(acceptCall(actor("late-agent"), CALL_ID, "v=0 answer")).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(callMetaApi).not.toHaveBeenCalled();
  });

  test("pre-accepts, then accepts with the same SDP answer", async () => {
    vi.mocked(prisma.waCall.findFirst).mockResolvedValue(callRow() as never);
    vi.mocked(prisma.waCall.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(callMetaApi).mockResolvedValue({ data: { success: true } } as never);
    vi.mocked(prisma.waCall.update).mockResolvedValue(
      callRow({ status: "ACCEPTED", answeredById: "agent", answeredAt: new Date() }) as never,
    );

    const result = await acceptCall(actor("agent"), CALL_ID, "v=0 answer");

    const actions = vi
      .mocked(callMetaApi)
      .mock.calls.map((c) => (c[3] as { action: string }).action);
    expect(actions).toEqual(["pre_accept", "accept"]);
    expect(vi.mocked(callMetaApi).mock.calls[1][3]).toMatchObject({
      call_id: "wacid.ABC",
      session: { sdp_type: "answer", sdp: "v=0 answer" },
    });
    expect(result.status).toBe("ACCEPTED");
    expect(redis.set).toHaveBeenCalledWith(`wacall:alive:${CALL_ID}`, "1", "EX", 20);
    expect(armCallWatchdog).toHaveBeenCalledWith(CALL_ID);
  });

  test("hands the call back when Meta refuses the answer", async () => {
    vi.mocked(prisma.waCall.findFirst).mockResolvedValue(callRow() as never);
    vi.mocked(prisma.waCall.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(callMetaApi).mockRejectedValue(new Error("meta down"));

    await expect(acceptCall(actor("agent"), CALL_ID, "v=0")).rejects.toThrow("meta down");
    expect(prisma.waCall.updateMany).toHaveBeenLastCalledWith({
      where: { id: CALL_ID, answeredById: "agent", status: "RINGING" },
      data: { answeredById: null },
    });
  });

  test("an agent without the number in scope cannot answer", async () => {
    vi.mocked(prisma.waCall.findFirst).mockResolvedValue(callRow() as never);
    vi.mocked(getChannelScope).mockResolvedValue({ all: false, ids: new Set(["other"]) } as never);

    await expect(
      acceptCall(
        actor("agent", { scope: { all: false, teamIds: [], inbox: "all" } }),
        CALL_ID,
        "v=0",
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(prisma.waCall.updateMany).not.toHaveBeenCalled();
  });
});

describe("startCall", () => {
  test("dials the contact's number and records the call against the agent", async () => {
    vi.mocked(getContactById).mockResolvedValue({ id: CONTACT_ID, phone: "919800000000" } as never);
    vi.mocked(callMetaApi).mockResolvedValue({ data: { calls: [{ id: "wacid.OUT" }] } } as never);
    vi.mocked(getActiveConversationForContact).mockResolvedValue(null);
    // Echoes the row it was asked to write, so the assertions see what startCall stored.
    vi.mocked(prisma.waCall.create).mockImplementation(((args: { data: Record<string, unknown> }) =>
      Promise.resolve(callRow({ ...args.data, contact: { name: "Asha" } }))) as never);

    const call = await startCall(actor("agent"), {
      phoneId: PHONE_ID,
      contactId: CONTACT_ID,
      sdp: "v=0 offer",
    });

    expect(vi.mocked(callMetaApi).mock.calls[0][0]).toBe(`/${PHONE_ID}/calls`);
    expect(vi.mocked(callMetaApi).mock.calls[0][3]).toMatchObject({
      to: "919800000000",
      action: "connect",
      session: { sdp_type: "offer", sdp: "v=0 offer" },
    });
    expect(call).toMatchObject({
      waCallId: "wacid.OUT",
      direction: "BUSINESS_INITIATED",
      initiatedById: "agent",
    });
  });

  test("never falls back to another number", async () => {
    vi.mocked(getWaSettings).mockResolvedValue({ ...settings, phoneId: "someone-else" } as never);

    await expect(
      startCall(actor("agent"), { phoneId: PHONE_ID, contactId: CONTACT_ID, sdp: "v=0" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("outbound answer", () => {
  test("relays the customer's SDP answer to the dialling agent only", async () => {
    vi.mocked(redis.set).mockResolvedValue("OK" as never);
    vi.mocked(prisma.waCall.findUnique).mockResolvedValue(
      callRow({ direction: "BUSINESS_INITIATED", initiatedById: "agent" }) as never,
    );

    await handleCallsWebhook(
      callsWebhook({
        calls: [
          {
            id: "wacid.ABC",
            from: "916282034535",
            to: "919800000000",
            event: "connect",
            direction: "BUSINESS_INITIATED",
            timestamp: "1791367200",
            session: { sdp_type: "answer", sdp: "v=0 answer" },
          },
        ],
      }),
    );

    const [, message, , userIds] = vi.mocked(sendViaWstoOrgHandler).mock.calls[0];
    expect(userIds).toEqual(["agent"]);
    expect(message.call).toMatchObject({ event: "answer", sdp: "v=0 answer" });
  });

  test("a redelivered connect does not relay the answer twice", async () => {
    vi.mocked(prisma.waCall.findUnique).mockResolvedValue(
      callRow({ direction: "BUSINESS_INITIATED", initiatedById: "agent" }) as never,
    );
    // The first delivery already claimed the relay.
    vi.mocked(redis.set).mockResolvedValue(null as never);

    await handleCallsWebhook(
      callsWebhook({
        calls: [
          {
            id: "wacid.ABC",
            from: "916282034535",
            to: "919800000000",
            event: "connect",
            direction: "BUSINESS_INITIATED",
            timestamp: "1791367200",
            session: { sdp_type: "answer", sdp: "v=0 answer" },
          },
        ],
      }),
    );

    expect(sendViaWstoOrgHandler).not.toHaveBeenCalled();
  });
});

describe("finalCallStatus", () => {
  test.each([
    [{ status: "RINGING", answeredAt: null }, "COMPLETED", "MISSED"],
    [{ status: "RINGING", answeredAt: null }, "FAILED", "FAILED"],
    [{ status: "REJECTED", answeredAt: null }, "COMPLETED", "REJECTED"],
    [{ status: "ACCEPTED", answeredAt: new Date() }, "COMPLETED", "COMPLETED"],
    [{ status: "ACCEPTED", answeredAt: new Date() }, "FAILED", "FAILED"],
  ])("%o + %s → %s", (call, webhook, expected) => {
    expect(finalCallStatus(call as never, webhook as never)).toBe(expected);
  });
});

describe("callSummary", () => {
  test("names the direction and outcome", () => {
    expect(
      callSummary({
        direction: "USER_INITIATED",
        status: "MISSED",
        durationSeconds: null,
      } as never),
    ).toBe("Missed voice call");
    expect(
      callSummary({
        direction: "BUSINESS_INITIATED",
        status: "COMPLETED",
        durationSeconds: 125,
      } as never),
    ).toBe("Outgoing voice call · 2m 05s");
    expect(
      callSummary({
        direction: "BUSINESS_INITIATED",
        status: "MISSED",
        durationSeconds: null,
      } as never),
    ).toBe("Voice call not answered");
  });
});

describe("isMissingCallPermission", () => {
  test("recognises Meta's 138006", () => {
    const Graph = GraphApiError as unknown as new (code: number) => Error;
    expect(isMissingCallPermission(new Graph(138006))).toBe(true);
    expect(isMissingCallPermission(new Graph(131047))).toBe(false);
    expect(isMissingCallPermission(new Error("x"))).toBe(false);
  });
});

describe("getEventType", () => {
  test("routes a calls change carrying statuses to Calls, not to message statuses", async () => {
    const { getEventType } = await import("../whatsappSurvey/wasurvey.utils.js");
    const body = callsWebhook({
      statuses: [
        { id: "wacid.ABC", type: "call", status: "RINGING", timestamp: "1", recipient_id: "9" },
      ],
    });
    expect(getEventType(body)).toBe("calls");
  });
});

describe("isCallingDisabled", () => {
  test("recognises Meta's 138000", () => {
    const Graph = GraphApiError as unknown as new (code: number) => Error;
    expect(isCallingDisabled(new Graph(138000))).toBe(true);
    expect(isCallingDisabled(new Graph(138006))).toBe(false);
  });
});

describe("heartbeatCall", () => {
  test("keeps the call alive for the agent holding it", async () => {
    vi.mocked(prisma.waCall.findFirst).mockResolvedValue(
      callRow({ status: "ACCEPTED", answeredById: "agent", answeredAt: new Date() }) as never,
    );
    await heartbeatCall(actor("agent"), CALL_ID);
    expect(redis.set).toHaveBeenCalledWith(`wacall:alive:${CALL_ID}`, "1", "EX", 20);
  });

  test("refuses a beat from anyone else", async () => {
    vi.mocked(prisma.waCall.findFirst).mockResolvedValue(
      callRow({ status: "ACCEPTED", answeredById: "agent", answeredAt: new Date() }) as never,
    );
    await expect(heartbeatCall(actor("someone-else"), CALL_ID)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(redis.set).not.toHaveBeenCalled();
  });

  test("a late beat cannot revive a finished call", async () => {
    vi.mocked(prisma.waCall.findFirst).mockResolvedValue(
      callRow({ status: "COMPLETED", answeredById: "agent", endedAt: new Date() }) as never,
    );
    await heartbeatCall(actor("agent"), CALL_ID);
    expect(redis.set).not.toHaveBeenCalled();
  });
});
