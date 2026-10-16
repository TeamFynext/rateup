import { describe, expect, test } from "vitest";
import { messageStatusWebhookEvents, type MessageStatusWebhookInput } from "./statusWebhook.js";

const ORG = "11111111-1111-4111-8111-111111111111";

function input(over: Partial<MessageStatusWebhookInput> = {}): MessageStatusWebhookInput {
  return {
    orgId: ORG,
    messageId: "wamid.ABC",
    reported: new Set(["delivered"]),
    newStatuses: { delivered: "2026-10-16T10:00:01.000Z" },
    recipientPhone: "919000000001",
    channel: "919800000000",
    templateName: "order_update",
    sourceMessage: "CAMPAIGN",
    campaignId: "camp-1",
    error: null,
    errorMessage: null,
    ...over,
  };
}

describe("messageStatusWebhookEvents", () => {
  test("a delivered receipt", () => {
    expect(messageStatusWebhookEvents(input())).toEqual([
      {
        orgId: ORG,
        type: "message.status",
        data: {
          messageId: "wamid.ABC",
          status: "delivered",
          timestamp: "2026-10-16T10:00:01.000Z",
          recipientPhone: "919000000001",
          channel: "919800000000",
          templateName: "order_update",
          source: "campaign",
          campaignId: "camp-1",
          error: null,
        },
      },
    ]);
  });

  test("a failure carries Meta's code and title and the stored reason", () => {
    const [event] = messageStatusWebhookEvents(
      input({
        reported: new Set(["failed"]),
        newStatuses: { failed: "2026-10-16T10:00:02.000Z", sent: "2026-10-16T10:00:02.000Z" },
        error: { code: 131026, title: "Message undeliverable" },
        errorMessage: "Message undeliverable",
      }),
    );

    expect(event!.data).toMatchObject({
      status: "failed",
      error: { code: 131026, title: "Message undeliverable", message: "Message undeliverable" },
    });
  });

  test("a status already stored is not announced again", () => {
    expect(messageStatusWebhookEvents(input({ newStatuses: {} }))).toEqual([]);
  });

  test("a status the consumer inferred, rather than Meta reported, is not announced", () => {
    // `read` alone: the consumer back-fills `sent` and `delivered`.
    const events = messageStatusWebhookEvents(
      input({
        reported: new Set(["read"]),
        newStatuses: {
          sent: "2026-10-16T10:00:03.000Z",
          delivered: "2026-10-16T10:00:03.000Z",
          read: "2026-10-16T10:00:03.000Z",
        },
      }),
    );

    expect(events.map((e) => (e.data as { status: string }).status)).toEqual(["read"]);
  });

  test("several statuses in one batch come out in the order they happen", () => {
    const events = messageStatusWebhookEvents(
      input({
        reported: new Set(["read", "sent", "delivered"]),
        newStatuses: { read: "t3", delivered: "t2", sent: "t1" },
      }),
    );

    expect(events.map((e) => (e.data as { status: string }).status)).toEqual([
      "sent",
      "delivered",
      "read",
    ]);
  });

  test("ignores statuses a receiver does not see", () => {
    expect(
      messageStatusWebhookEvents(
        input({ reported: new Set(["completed"]), newStatuses: { completed: "t" } }),
      ),
    ).toEqual([]);
  });

  test("a message with no org (no contact) produces nothing", () => {
    expect(messageStatusWebhookEvents(input({ orgId: undefined }))).toEqual([]);
  });

  test("unknown source, template and campaign are null", () => {
    const [event] = messageStatusWebhookEvents(
      input({ sourceMessage: null, templateName: undefined, campaignId: "" }),
    );

    expect(event!.data).toMatchObject({ source: null, templateName: null, campaignId: null });
  });
});
