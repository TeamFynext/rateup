import { beforeEach, describe, expect, test, vi } from "vitest";

const contactFindMany = vi.fn();
const agentFindMany = vi.fn();
const setThreadControl = vi.fn();

vi.mock("../../utils/prisma.js", () => ({
  default: {
    contact: { findMany: contactFindMany },
    metaBusinessAgent: { findMany: agentFindMany },
  },
}));
vi.mock("./metaAgent.service.js", () => ({ setThreadControl }));

const { releaseThreadsOnTicketClose } = await import("./metaAgent.autoRelease.js");

const ORG = "org-1";
const agent = (id: string, phoneId: string, phone: string) => ({
  whatsappSettingsId: id,
  whatsappSettings: { phoneId, phone },
});
const contact = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  phone: "919188346187",
  lastReceivedMetadata: { phone_number_id: "pid-1" },
  lastMessageSourceIdentifier: "15551323034",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  agentFindMany.mockResolvedValue([agent("ws-1", "pid-1", "+1 555-132-3034")]);
});

describe("releaseThreadsOnTicketClose", () => {
  test("only looks at staff-held, non-spam contacts, on agents with the setting on", async () => {
    contactFindMany.mockResolvedValue([contact()]);

    await releaseThreadsOnTicketClose(ORG, ["c1"]);

    expect(contactFindMany.mock.calls[0][0].where).toMatchObject({
      orgId: ORG,
      id: { in: ["c1"] },
      metaAgentThreadOwner: "STAFF",
      isSpam: false,
    });
    expect(agentFindMany.mock.calls[0][0].where).toEqual({
      orgId: ORG,
      status: "ONBOARDED",
      releaseOnTicketClose: true,
    });
  });

  test("releases on the number the customer wrote to, recording why", async () => {
    agentFindMany.mockResolvedValue([
      agent("ws-other", "pid-2", "+44 7000 000000"),
      agent("ws-1", "pid-1", "+1 555-132-3034"),
    ]);
    contactFindMany.mockResolvedValue([contact()]);

    await releaseThreadsOnTicketClose(ORG, ["c1"]);

    expect(setThreadControl).toHaveBeenCalledWith(
      ORG,
      "ws-1",
      { action: "release", to: "+919188346187" },
      "ticket_closed",
    );
  });

  test("falls back to the channel number when Meta's phone id is missing", async () => {
    contactFindMany.mockResolvedValue([contact({ lastReceivedMetadata: null })]);

    await releaseThreadsOnTicketClose(ORG, ["c1"]);

    expect(setThreadControl).toHaveBeenCalledWith(ORG, "ws-1", expect.anything(), "ticket_closed");
  });

  test("leaves a customer on a number without the agent alone", async () => {
    contactFindMany.mockResolvedValue([
      contact({
        lastReceivedMetadata: { phone_number_id: "pid-9" },
        lastMessageSourceIdentifier: "447000000000",
      }),
    ]);

    await releaseThreadsOnTicketClose(ORG, ["c1"]);

    expect(setThreadControl).not.toHaveBeenCalled();
  });

  test("does nothing when no agent has the setting on", async () => {
    contactFindMany.mockResolvedValue([contact()]);
    agentFindMany.mockResolvedValue([]);

    await releaseThreadsOnTicketClose(ORG, ["c1"]);

    expect(setThreadControl).not.toHaveBeenCalled();
  });

  test("a failed release never fails the close, and the rest still go", async () => {
    contactFindMany.mockResolvedValue([contact(), contact({ id: "c2", phone: "919000000002" })]);
    setThreadControl.mockRejectedValueOnce(new Error("Meta said no"));

    await expect(releaseThreadsOnTicketClose(ORG, ["c1", "c2"])).resolves.toBeUndefined();
    expect(setThreadControl).toHaveBeenCalledTimes(2);
  });

  test("skips the lookups entirely for an empty list", async () => {
    await releaseThreadsOnTicketClose(ORG, []);

    expect(contactFindMany).not.toHaveBeenCalled();
  });
});
