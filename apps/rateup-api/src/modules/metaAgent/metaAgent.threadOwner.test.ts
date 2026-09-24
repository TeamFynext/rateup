import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const updateMany = vi.fn();
const findUnique = vi.fn();
const sendViaWstoOrgHandler = vi.fn();

vi.mock("../../utils/prisma.js", () => ({ default: { contact: { updateMany, findUnique } } }));
vi.mock("../org/ws/org.ws.controller.js", () => ({ sendViaWstoOrgHandler }));

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
    findUnique.mockResolvedValue({ id: "contact-1" });

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
