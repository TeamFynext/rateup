import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    orgMember: { findMany: vi.fn() },
    teamMember: { findMany: vi.fn() },
    whatsappSettings: { findMany: vi.fn() },
    expoPushToken: { findMany: vi.fn() },
  },
}));
vi.mock("../../authz/actor.js", () => ({ loadActor: vi.fn() }));
vi.mock("../whatsapp/settings/wa_channel_access.js", () => ({ getChannelScope: vi.fn() }));
vi.mock("../../utils/email/react/templates.js", () => ({
  renderNotificationEmailBodies: vi.fn(async () => ({ html: "<p>h</p>", text: "t" })),
}));

import { loadActor } from "../../authz/actor.js";
import prisma from "../../utils/prisma.js";
import { getChannelScope } from "../whatsapp/settings/wa_channel_access.js";
import { dispatchNotification } from "./notification.dispatch.js";

const db = prisma as unknown as {
  orgMember: { findMany: ReturnType<typeof vi.fn> };
  teamMember: { findMany: ReturnType<typeof vi.fn> };
  whatsappSettings: { findMany: ReturnType<typeof vi.fn> };
  expoPushToken: { findMany: ReturnType<typeof vi.fn> };
};

function actor(
  userId: string,
  permissions: string[],
  scope: { all?: boolean; teamIds?: string[]; inbox?: string } = {},
) {
  return {
    userId,
    orgId: "org-1",
    scope: { all: scope.all ?? true, teamIds: scope.teamIds ?? [], inbox: scope.inbox ?? "all" },
    can: (permission: string) => permissions.includes(permission),
  };
}

const member = (userId: string, setting: Record<string, unknown> | null = null) => ({
  userId,
  notificationSetting: setting,
  user: { email: `${userId}@test.example` },
});

const setting = (overrides: Record<string, unknown>, channels: Record<string, boolean> = {}) => ({
  inApp: true,
  push: true,
  email: true,
  desktop: true,
  sound: true,
  overrides,
  ...channels,
});

const actors = new Map<string, ReturnType<typeof actor>>();

beforeEach(() => {
  vi.clearAllMocks();
  actors.clear();
  vi.mocked(loadActor).mockImplementation(async (userId) => (actors.get(userId) ?? null) as never);
  db.expoPushToken.findMany.mockImplementation(async ({ where }) =>
    (where.userId.in as string[]).map((id) => ({ expoToken: `token-${id}` })),
  );
  db.whatsappSettings.findMany.mockResolvedValue([]);
});

const contact = { contactId: "c-1", contactName: "Ann" };

describe("dispatchNotification", () => {
  test("never reads the member who caused it", async () => {
    db.orgMember.findMany.mockResolvedValue([]);

    await dispatchNotification({
      event: "inbox.assigned",
      orgId: "org-1",
      audience: { kind: "users", userIds: ["u-1", "u-2"] },
      data: contact,
      actorUserId: "u-1",
    });

    expect(db.orgMember.findMany.mock.calls[0][0].where).toEqual({
      orgId: "org-1",
      user: { active: true },
      userId: { in: ["u-1", "u-2"] },
      NOT: { userId: "u-1" },
    });
  });

  test("skips a recipient without the event's permission", async () => {
    db.orgMember.findMany.mockResolvedValue([member("u-1"), member("u-2")]);
    actors.set("u-1", actor("u-1", ["campaigns.read"]));
    actors.set("u-2", actor("u-2", []));

    const jobs = await dispatchNotification({
      event: "campaign.completed",
      orgId: "org-1",
      audience: { kind: "users", userIds: ["u-1", "u-2"] },
      data: { campaignId: "cmp-1", campaignName: "Diwali" },
    });

    const users = jobs.flatMap((j) =>
      j.systemNotificationData ? [j.systemNotificationData.userId] : [],
    );
    expect(users).toEqual(["u-1"]);
    expect(jobs.filter((j) => j.emailData).map((j) => j.emailData!.to)).toEqual([
      "u-1@test.example",
    ]);
  });

  test("uses the catalogue defaults: a completed campaign is a bell row and an email, not a push", async () => {
    db.orgMember.findMany.mockResolvedValue([member("u-1")]);
    actors.set("u-1", actor("u-1", ["campaigns.read"]));

    const jobs = await dispatchNotification({
      event: "campaign.completed",
      orgId: "org-1",
      audience: { kind: "users", userIds: ["u-1"] },
      data: { campaignId: "cmp-1", campaignName: "Diwali" },
    });

    expect(jobs.some((j) => j.pushNotificationData)).toBe(false);
    const row = jobs.find((j) => j.systemNotificationData)!.systemNotificationData!;
    expect(row).toMatchObject({
      event: "campaign.completed",
      source: "campaigns",
      subSource: "campaign.completed",
      feed: true,
      toast: true,
      desktop: false,
    });
    expect(row.data).toMatchObject({ campaignId: "cmp-1", path: "/dashboard/campaign/cmp-1" });
    expect(jobs.find((j) => j.emailData)!.emailData!.subject).toBe("Campaign completed");
  });

  test("honours a member's own switches", async () => {
    db.orgMember.findMany.mockResolvedValue([
      member("u-1", setting({ "inbox.assigned": { push: false } })),
      member("u-2", setting({}, { inApp: false, desktop: false })),
    ]);
    actors.set("u-1", actor("u-1", ["inbox.read"]));
    actors.set("u-2", actor("u-2", ["inbox.read"]));

    const jobs = await dispatchNotification({
      event: "inbox.assigned",
      orgId: "org-1",
      audience: { kind: "users", userIds: ["u-1", "u-2"] },
      data: contact,
    });

    expect(
      jobs.filter((j) => j.systemNotificationData).map((j) => j.systemNotificationData!.userId),
    ).toEqual(["u-1"]);
    expect(jobs.find((j) => j.pushNotificationData)!.pushNotificationData!.expoTokens).toEqual([
      "token-u-2",
    ]);
  });

  test("a new message is live-only and pushes the payload installed apps understand", async () => {
    db.orgMember.findMany.mockResolvedValue([member("u-1")]);
    actors.set("u-1", actor("u-1", ["inbox.read"]));

    const jobs = await dispatchNotification({
      event: "inbox.message.assigned",
      orgId: "org-1",
      audience: { kind: "users", userIds: ["u-1"] },
      data: contact,
    });

    expect(jobs.find((j) => j.systemNotificationData)!.systemNotificationData!.feed).toBe(false);
    expect(jobs.find((j) => j.pushNotificationData)!.pushNotificationData).toMatchObject({
      body: "New message from Ann",
      data: { type: "wa_message", contactId: "c-1" },
    });
  });

  test("the unassigned queue skips assigned-only members and members outside the channel", async () => {
    db.whatsappSettings.findMany.mockResolvedValue([
      { id: "ch-1", phone: "+91 98765 43210", ibaId: null, fbPageId: null },
      { id: "ch-2", phone: null, ibaId: "iba-2", fbPageId: null },
    ]);
    db.orgMember.findMany.mockResolvedValue([member("u-1"), member("u-2"), member("u-3")]);
    actors.set("u-1", actor("u-1", ["inbox.read"], { all: false, teamIds: ["t-1"] }));
    actors.set("u-2", actor("u-2", ["inbox.read"], { inbox: "assigned_only", all: false }));
    actors.set("u-3", actor("u-3", ["inbox.read"], { all: false, teamIds: ["t-3"] }));
    vi.mocked(getChannelScope).mockImplementation(async (a) =>
      a.userId === "u-1" ? { all: false, ids: new Set(["ch-2"]) } : { all: false, ids: new Set() },
    );

    const jobs = await dispatchNotification({
      event: "inbox.message.unassigned",
      orgId: "org-1",
      audience: { kind: "inboxQueue", sourceIdentifier: "iba-2" },
      data: contact,
    });

    expect(db.orgMember.findMany.mock.calls[0][0].where.userId).toBeUndefined();
    expect(jobs.find((j) => j.pushNotificationData)!.pushNotificationData!.expoTokens).toEqual([
      "token-u-1",
    ]);
  });

  test("a team audience reads the team's members", async () => {
    db.teamMember.findMany.mockResolvedValue([{ userId: "u-1" }]);
    db.orgMember.findMany.mockResolvedValue([]);

    await dispatchNotification({
      event: "campaign.failed",
      orgId: "org-1",
      audience: { kind: "team", teamId: "t-1" },
      data: { campaignId: "cmp-1", campaignName: "Diwali", reason: "x" },
    });

    expect(db.teamMember.findMany.mock.calls[0][0].where).toEqual({
      teamId: "t-1",
      team: { orgId: "org-1" },
    });
    expect(db.orgMember.findMany.mock.calls[0][0].where.userId).toEqual({ in: ["u-1"] });
  });

  test("a team-limited permitted audience leaves out team-scoped members of other teams", async () => {
    db.orgMember.findMany.mockResolvedValue([member("u-1"), member("u-2"), member("u-3")]);
    actors.set("u-1", actor("u-1", ["loyalty.manage"]));
    actors.set("u-2", actor("u-2", ["loyalty.manage"], { all: false, teamIds: ["t-1"] }));
    actors.set("u-3", actor("u-3", ["loyalty.manage"], { all: false, teamIds: ["t-9"] }));

    const jobs = await dispatchNotification({
      event: "loyalty.feedback_negative",
      orgId: "org-1",
      audience: { kind: "permitted", teamId: "t-1" },
      data: { customerName: "Ann" },
    });

    expect(
      jobs.filter((j) => j.systemNotificationData).map((j) => j.systemNotificationData!.userId),
    ).toEqual(["u-1", "u-2"]);
  });
});
