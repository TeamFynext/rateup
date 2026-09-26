import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const updateMany = vi.fn();
const findUnique = vi.fn();
const sendViaWstoOrgHandler = vi.fn();
const assignees = vi.fn();
const notify = vi.fn();

vi.mock("../../utils/prisma.js", () => ({
  default: { contact: { updateMany, findUnique }, waInboxAssign: { findMany: assignees } },
}));
vi.mock("../org/ws/org.ws.controller.js", () => ({ sendViaWstoOrgHandler }));
vi.mock("../notification/notify.js", () => ({ notify }));

const { resolveHandoverOwner, setMetaAgentThreadOwner } =
  await import("./metaAgent.threadOwner.js");

const OUR_APP = "our-app-id";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("waclient_id", OUR_APP);
});
afterEach(() => vi.unstubAllEnvs());

describe("resolveHandoverOwner", () => {
  test("reads the new owner's role when Meta gives one", () => {
    expect(
      resolveHandoverOwner({
        control_passed: { new_owner_role: "escalation", metadata: "customer_request" },
      }),
    ).toEqual({ owner: "STAFF", reason: "customer_request" });
    expect(resolveHandoverOwner({ control_passed: { new_owner_role: "ai_agent" } })).toEqual({
      owner: "AI",
      reason: null,
    });
  });

  test("falls back to which app took the thread on control_taken", () => {
    expect(resolveHandoverOwner({ control_taken: { new_owner_app_id: OUR_APP } })?.owner).toBe(
      "STAFF",
    );
    expect(resolveHandoverOwner({ control_taken: { new_owner_app_id: "agent-app" } })?.owner).toBe(
      "AI",
    );
  });

  test("returns null when nothing says who owns the thread now", () => {
    expect(resolveHandoverOwner({})).toBeNull();
    expect(resolveHandoverOwner({ control_taken: { metadata: "x" } })).toBeNull();
  });
});

describe("setMetaAgentThreadOwner", () => {
  const at = new Date("2026-09-22T10:00:00Z");

  test("writes only a changed, not-older state and broadcasts it to the inbox", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findUnique.mockResolvedValue({ id: "contact-1", name: "Ann" });
    assignees.mockResolvedValue([]);

    const changed = await setMetaAgentThreadOwner({
      orgId: "org-1",
      phone: "919188346187",
      owner: "STAFF",
      reason: "customer_request",
      at,
    });

    expect(changed).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        orgId: "org-1",
        phone: "919188346187",
        AND: [
          { OR: [{ metaAgentThreadOwner: null }, { metaAgentThreadOwner: { not: "STAFF" } }] },
          { OR: [{ metaAgentThreadOwnerAt: null }, { metaAgentThreadOwnerAt: { lte: at } }] },
        ],
      },
      data: {
        metaAgentThreadOwner: "STAFF",
        metaAgentThreadOwnerAt: at,
        metaAgentHandoverReason: "customer_request",
      },
    });
    expect(sendViaWstoOrgHandler).toHaveBeenCalledWith(
      "org-1",
      {
        type: "meta_agent_thread",
        meta_agent_thread: {
          contactId: "contact-1",
          owner: "STAFF",
          reason: "customer_request",
          at: at.toISOString(),
        },
      },
      "main",
    );
  });

  test("a guess from standby traffic never beats a handover from the same second", async () => {
    // The customer's message and the agent's handover share a timestamp; the
    // handover is Meta's word, the standby message only suggests the AI.
    updateMany.mockResolvedValue({ count: 0 });

    const changed = await setMetaAgentThreadOwner({
      orgId: "org-1",
      phone: "919188346187",
      owner: "AI",
      at,
      inferred: true,
    });

    expect(changed).toBe(false);
    expect(updateMany.mock.calls[0][0].where.AND[1]).toEqual({
      OR: [{ metaAgentThreadOwnerAt: null }, { metaAgentThreadOwnerAt: { lt: at } }],
    });
  });

  test("a handover to a person asks the assignees for help", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findUnique.mockResolvedValue({ id: "contact-1", name: "Ann" });
    assignees.mockResolvedValue([{ assignedUserId: "user-9" }]);

    await setMetaAgentThreadOwner({ orgId: "org-1", phone: "919188346187", owner: "STAFF", at });

    expect(notify).toHaveBeenCalledWith({
      event: "inbox.handover",
      orgId: "org-1",
      audience: { kind: "users", userIds: ["user-9"] },
      data: { contactId: "contact-1", contactName: "Ann" },
    });
  });

  test("an unassigned handover goes to the queue", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findUnique.mockResolvedValue({ id: "contact-1", name: "Ann" });
    assignees.mockResolvedValue([]);

    await setMetaAgentThreadOwner({ orgId: "org-1", phone: "919188346187", owner: "STAFF", at });

    expect(notify.mock.calls[0][0].audience).toEqual({
      kind: "inboxQueue",
      sourceIdentifier: null,
    });
  });

  test("a staff reply taking the thread, or Meta AI taking it back, notifies nobody", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findUnique.mockResolvedValue({ id: "contact-1", name: "Ann" });

    await setMetaAgentThreadOwner({
      orgId: "org-1",
      phone: "919188346187",
      owner: "STAFF",
      reason: "staff_reply",
      at,
    });
    await setMetaAgentThreadOwner({ orgId: "org-1", phone: "919188346187", owner: "AI", at });

    expect(notify).not.toHaveBeenCalled();
  });

  test("stays quiet when the contact already has that owner or a newer state", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const changed = await setMetaAgentThreadOwner({
      orgId: "org-1",
      phone: "919188346187",
      owner: "AI",
      at,
    });

    expect(changed).toBe(false);
    expect(findUnique).not.toHaveBeenCalled();
    expect(sendViaWstoOrgHandler).not.toHaveBeenCalled();
  });
});
