import { beforeEach, describe, expect, test, vi } from "vitest";

const db = vi.hoisted(() => {
  const client = {
    org: { findUnique: vi.fn(), delete: vi.fn() },
    orgMember: { findMany: vi.fn() },
    order: { updateMany: vi.fn() },
    user: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  };
  client.$transaction.mockImplementation((run: (tx: typeof client) => unknown) => run(client));
  return client;
});
const deleteLogin = vi.hoisted(() => vi.fn());
vi.mock("../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../utils/logger.js", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("../../utils/supertoken/supertoken.js", () => ({ deleteSuperTokenUserForId: deleteLogin }));
vi.mock("../../workers/bullmq/queues/index.js", () => ({ notificationQueue: { add: vi.fn() } }));

import { deleteOrg } from "./org.services.js";

const ORG = "0a5b8a7e-2f7c-4d2e-9a51-3c1f0e6b9d24";
const member = (userId: string, orgs: number) => ({
  userId,
  user: { _count: { orgMember: orgs } },
});

beforeEach(() => {
  vi.clearAllMocks();
  db.org.findUnique.mockResolvedValue({ name: "Acme" });
  deleteLogin.mockResolvedValue(undefined);
});

describe("deleteOrg", () => {
  test("a member who is also in another org keeps their account", async () => {
    db.orgMember.findMany.mockResolvedValue([member("only-here", 1), member("also-elsewhere", 2)]);

    const result = await deleteOrg(ORG);

    expect(db.user.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["only-here"] } } });
    expect(deleteLogin).toHaveBeenCalledTimes(1);
    expect(deleteLogin).toHaveBeenCalledWith("only-here");
    expect(result).toEqual({
      orgName: "Acme",
      usersDeleted: ["only-here"],
      usersKept: ["also-elsewhere"],
    });
  });

  test("orders are kept, detached, with the org's name on them", async () => {
    db.orgMember.findMany.mockResolvedValue([member("u1", 1)]);
    await deleteOrg(ORG);
    expect(db.order.updateMany.mock.calls[0][0]).toEqual({
      where: { orgId: ORG },
      data: { orgId: null, deletedOrgInfo: "Acme" },
    });
  });

  test("a failure inside the transaction is thrown, not reported as success", async () => {
    db.orgMember.findMany.mockResolvedValue([member("u1", 1)]);
    db.org.delete.mockRejectedValueOnce(new Error("FK violation"));
    await expect(deleteOrg(ORG)).rejects.toThrow("FK violation");
    expect(deleteLogin).not.toHaveBeenCalled();
  });

  test("an unknown org is an error", async () => {
    db.org.findUnique.mockResolvedValue(null);
    await expect(deleteOrg(ORG)).rejects.toThrow("not found");
  });

  test("a sign-in that will not delete does not undo the org delete", async () => {
    db.orgMember.findMany.mockResolvedValue([member("u1", 1)]);
    deleteLogin.mockRejectedValueOnce(new Error("supertokens down"));
    await expect(deleteOrg(ORG)).resolves.toMatchObject({ usersDeleted: ["u1"] });
  });
});
