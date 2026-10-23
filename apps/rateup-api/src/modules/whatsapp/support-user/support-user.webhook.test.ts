import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: { contact: { findFirst: vi.fn() } },
}));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  notificationQueue: { add: vi.fn() },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock("../inbox/message/wamessage.controller.js", () => ({ handleWaMessages: vi.fn() }));
vi.mock("../../../utils/email/react/templates.js", () => ({
  renderSupportWidgetEmail: vi.fn(),
}));

import prisma from "../../../utils/prisma.js";
import { handleWaMessages } from "../inbox/message/wamessage.controller.js";
import { supportUserWebhookEventHandler } from "./support-user.controller.js";

type Mock = ReturnType<typeof vi.fn>;
const findFirst = prisma.contact.findFirst as unknown as Mock;

const KEY_ORG = "11111111-1111-1111-1111-111111111111";
const CONTACT = "22222222-2222-2222-2222-222222222222";

function body(contactId: string) {
  return {
    object: "support_user",
    entry: [
      {
        id: contactId,
        changes: [{ field: "messages", value: { messages: [{ text: { body: "hi" } }] } }],
      },
    ],
  };
}

function reply() {
  const rep: any = { sent: false, code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

beforeEach(() => vi.clearAllMocks());

describe("support widget webhook", () => {
  test("looks the contact up inside the widget key's org", async () => {
    findFirst.mockResolvedValueOnce({ orgId: KEY_ORG, other: "919000000001" });

    await supportUserWebhookEventHandler(
      { body: body(CONTACT), user: { orgId: KEY_ORG } } as never,
      reply(),
    );

    expect(findFirst.mock.calls[0][0].where).toEqual({ id: CONTACT, orgId: KEY_ORG });
    expect(handleWaMessages).toHaveBeenCalledWith(
      "receive",
      expect.anything(),
      "919000000001",
      KEY_ORG,
      "WEBCHAT",
      undefined,
    );
  });

  test("drops a message for a contact of another org", async () => {
    findFirst.mockResolvedValueOnce(null);

    await supportUserWebhookEventHandler(
      { body: body(CONTACT), user: { orgId: KEY_ORG } } as never,
      reply(),
    );

    expect(handleWaMessages).not.toHaveBeenCalled();
  });
});
