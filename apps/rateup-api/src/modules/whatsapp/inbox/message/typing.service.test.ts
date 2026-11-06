import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/prisma.js", () => ({
  default: {
    contact: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
    waMessage: { findFirst: vi.fn() },
  },
}));
vi.mock("../../../../utils/redisConnection.js", () => ({
  default: { set: vi.fn(), getdel: vi.fn() },
}));
vi.mock("../../../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("../../../org/ws/org.ws.controller.js", () => ({ sendViaWstoOrgHandler: vi.fn() }));
vi.mock("../../wa_axios.js", () => ({ callMetaApi: vi.fn() }));
vi.mock("../../settings/wa_settings.service.js", () => ({
  getWaSettings: vi.fn(),
  getWaSettingsByPhone: vi.fn(),
}));
vi.mock("../../metaChannel/metaChannel.service.js", () => ({
  getInstagramChannel: vi.fn(),
  getMessengerChannel: vi.fn(),
}));
vi.mock("../../../../../generated/prisma/client.js", () => ({
  PlatformType: { WHATSAPP: "WHATSAPP", INSTAGRAM: "INSTAGRAM", FACEBOOK: "FACEBOOK" },
}));

import prisma from "../../../../utils/prisma.js";
import redis from "../../../../utils/redisConnection.js";
import { sendViaWstoOrgHandler } from "../../../org/ws/org.ws.controller.js";
import { callMetaApi } from "../../wa_axios.js";
import { getWaSettings, getWaSettingsByPhone } from "../../settings/wa_settings.service.js";
import { getMessengerChannel } from "../../metaChannel/metaChannel.service.js";
import { setAgentTyping } from "./typing.service.js";

const db = prisma as unknown as {
  contact: { findFirst: ReturnType<typeof vi.fn> };
  user: { findUnique: ReturnType<typeof vi.fn> };
  waMessage: { findFirst: ReturnType<typeof vi.fn> };
};
const kv = redis as unknown as {
  set: ReturnType<typeof vi.fn>;
  getdel: ReturnType<typeof vi.fn>;
};
const callMetaApiMock = vi.mocked(callMetaApi);

const WA_INBOUND = {
  messageId: "wamid.abc",
  sourceIdentifier: "15551323034",
  sourcePlatform: "WHATSAPP",
  contact: { orgId: "org-1", phone: "15550001", igsId: null, psid: null },
};
const FB_INBOUND = {
  messageId: null,
  sourceIdentifier: "page-1",
  sourcePlatform: "FACEBOOK",
  contact: { orgId: "org-1", phone: null, igsId: null, psid: "psid-1" },
};

const base = { orgId: "org-1", userId: "user-1", contactId: "contact-1" };

beforeEach(() => {
  vi.clearAllMocks();
  db.contact.findFirst.mockResolvedValue({ id: "contact-1" });
  db.user.findUnique.mockResolvedValue({ name: "Priya", email: "priya@x.com" });
  db.waMessage.findFirst.mockResolvedValue(WA_INBOUND);
  kv.set.mockResolvedValue("OK");
  kv.getdel.mockResolvedValue("1");
  vi.mocked(getWaSettingsByPhone).mockResolvedValue({ phoneId: "phone-1" } as never);
  vi.mocked(getWaSettings).mockResolvedValue({ phoneId: "phone-1", accessToken: "tok" } as never);
  vi.mocked(getMessengerChannel).mockResolvedValue({ pageAccessToken: "page-tok" } as never);
  callMetaApiMock.mockResolvedValue({ data: { success: true } } as never);
});

describe("setAgentTyping", () => {
  test("tells teammates who is typing", async () => {
    await setAgentTyping({ ...base, conversationId: "conv-1", typing: true });

    expect(sendViaWstoOrgHandler).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({
        type: "inbox_typing",
        inbox_typing: expect.objectContaining({
          contactId: "contact-1",
          conversationId: "conv-1",
          userId: "user-1",
          userName: "Priya",
          typing: true,
        }),
      }),
      "main",
    );
  });

  test("refuses a contact from another org", async () => {
    db.contact.findFirst.mockResolvedValue(null);

    await expect(setAgentTyping({ ...base, typing: true })).rejects.toThrow("Contact not found");
    expect(db.contact.findFirst.mock.calls[0][0].where).toEqual({
      id: "contact-1",
      orgId: "org-1",
    });
    expect(sendViaWstoOrgHandler).not.toHaveBeenCalled();
  });

  // The WhatsApp bubble rides on a read receipt for the customer's last message.
  test("shows the WhatsApp typing bubble", async () => {
    await setAgentTyping({ ...base, typing: true });
    await vi.waitFor(() => expect(callMetaApiMock).toHaveBeenCalled());

    expect(kv.set).toHaveBeenCalledWith("inbox:typing:org-1:contact-1", "1", "EX", 20, "NX");
    expect(callMetaApiMock).toHaveBeenCalledWith("/phone-1/messages", "POST", "tok", {
      messaging_product: "whatsapp",
      status: "read",
      message_id: "wamid.abc",
      typing_indicator: { type: "text" },
    });
  });

  test("only looks inside the 24 h service window", async () => {
    await setAgentTyping({ ...base, typing: true });
    await vi.waitFor(() => expect(db.waMessage.findFirst).toHaveBeenCalled());

    const since = db.waMessage.findFirst.mock.calls[0][0].where.waCreatedAt.gte as Date;
    expect(Date.now() - since.getTime()).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 1000);
  });

  test("sends one bubble per window while the agent keeps typing", async () => {
    kv.set.mockResolvedValue(null);

    await setAgentTyping({ ...base, typing: true });
    await new Promise((r) => setTimeout(r, 0));

    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("shows the Messenger typing bubble and takes it down", async () => {
    db.waMessage.findFirst.mockResolvedValue(FB_INBOUND);

    await setAgentTyping({ ...base, typing: true });
    await vi.waitFor(() => expect(callMetaApiMock).toHaveBeenCalledTimes(1));
    await setAgentTyping({ ...base, typing: false });
    await vi.waitFor(() => expect(callMetaApiMock).toHaveBeenCalledTimes(2));

    expect(callMetaApiMock.mock.calls[0]).toEqual([
      "/me/messages",
      "POST",
      "page-tok",
      { recipient: { id: "psid-1" }, sender_action: "typing_on" },
    ]);
    expect(callMetaApiMock.mock.calls[1]).toEqual([
      "/me/messages",
      "POST",
      "page-tok",
      { recipient: { id: "psid-1" }, sender_action: "typing_off" },
    ]);
  });

  // The reply hides the bubble itself; an explicit off could beat the queued message.
  test("leaves the bubble to the reply when typing stopped because it was sent", async () => {
    db.waMessage.findFirst.mockResolvedValue(FB_INBOUND);

    await setAgentTyping({ ...base, typing: false, sent: true });
    await new Promise((r) => setTimeout(r, 0));

    expect(kv.getdel).toHaveBeenCalled();
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("does not take down a bubble it never showed", async () => {
    db.waMessage.findFirst.mockResolvedValue(FB_INBOUND);
    kv.getdel.mockResolvedValue("0");

    await setAgentTyping({ ...base, typing: false });
    await new Promise((r) => setTimeout(r, 0));

    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("WhatsApp has no typing-off call", async () => {
    await setAgentTyping({ ...base, typing: false });
    await vi.waitFor(() => expect(db.waMessage.findFirst).toHaveBeenCalled());

    expect(callMetaApiMock).not.toHaveBeenCalled();
  });

  test("marks the slot empty when there is no window to type into", async () => {
    db.waMessage.findFirst.mockResolvedValue(null);

    await setAgentTyping({ ...base, typing: true });
    await vi.waitFor(() =>
      expect(kv.set).toHaveBeenCalledWith("inbox:typing:org-1:contact-1", "0", "KEEPTTL"),
    );
    expect(callMetaApiMock).not.toHaveBeenCalled();
  });
});
