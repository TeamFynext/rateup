import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const queryRaw = vi.fn();
const clientQuery = vi.fn();
const publish = vi.fn();
const emitWebhookEvents = vi.fn();

vi.mock("../../../utils/prisma.js", () => ({ default: { $queryRaw: queryRaw } }));
vi.mock("../../../utils/db.js", () => ({
  default: { connect: vi.fn(async () => ({ query: clientQuery, release: vi.fn() })) },
}));
vi.mock("../ws.publisher.js", () => ({ publisher: { publish }, WS_CHANNEL: "ws:messages" }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: { duplicate: () => ({}) } }));
vi.mock("../../../modules/meta/shared/metaMessage.service.js", () => ({
  sendMetaMessage: vi.fn(),
  metaErrorMessage: vi.fn(() => null),
}));
vi.mock("../../../modules/settings/webhooks/webhook.events.js", () => ({ emitWebhookEvents }));
vi.mock("../logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

const { bulkUpdateStatuses } = await import("./index.js");

const storedMessage = {
  messageId: "row-1",
  stats: { read: "", sent: "", failed: "", delivered: "" },
  externalMessageId: "wamid.A",
  sourceIdentifier: "15550001111",
  sourceMessage: "INBOX",
  meteredConversationId: null,
  templateName: null,
  participantId: null,
  campaignId: null,
  participantStatus: null,
  contactPhone: "15550002222",
  contactOrgId: "org-1",
  contactId: "contact-1",
  campaignParticipantDripStageId: null,
  campaignSendId: null,
  dripStageId: null,
  dripStageStatus: null,
};

const batch = [
  { id: "7", value: { messageId: "wamid.A", status: "delivered", timestamp: "2026-10-17" } },
];

describe("bulkUpdateStatuses websocket fan-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryRaw.mockResolvedValue([storedMessage]);
    publish.mockResolvedValue(1);
  });

  it("publishes status updates only after the transaction commits", async () => {
    const order: string[] = [];
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql === "COMMIT") order.push("commit");
      return { rows: [] };
    });
    publish.mockImplementation(async () => {
      order.push("publish");
      return 1;
    });

    const processed = await bulkUpdateStatuses(batch);

    expect(processed).toEqual(["7"]);
    expect(order).toEqual(["commit", "publish"]);
    const [channel, payload] = publish.mock.calls[0];
    expect(channel).toBe("ws:messages");
    expect(JSON.parse(payload)).toMatchObject({
      orgId: "org-1",
      data: { type: "message_status_update", message_status_update: { messageId: "wamid.A" } },
    });
  });

  it("publishes nothing when the transaction rolls back", async () => {
    clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE "WaMessage"')) throw new Error("deadlock detected");
      return { rows: [] };
    });

    await expect(bulkUpdateStatuses(batch)).rejects.toThrow("deadlock detected");

    expect(clientQuery).toHaveBeenCalledWith("ROLLBACK");
    expect(clientQuery).not.toHaveBeenCalledWith("COMMIT");
    expect(publish).not.toHaveBeenCalled();
    expect(emitWebhookEvents).not.toHaveBeenCalled();
  });

  it("does not fail a committed batch over a socket publish that failed", async () => {
    clientQuery.mockResolvedValue({ rows: [] });
    publish.mockRejectedValue(new Error("redis gone"));

    await expect(bulkUpdateStatuses(batch)).resolves.toEqual(["7"]);
  });
});
