import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    team: { findUnique: vi.fn(), update: vi.fn() },
    channel: { findMany: vi.fn() },
    teamChannel: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
  excludeFields: vi.fn(),
}));
vi.mock("../user/user.service.js", () => ({
  createUser: vi.fn(),
  getUserRecipeName: vi.fn(),
}));
vi.mock("supertokens-node/recipe/emailpassword/index.js", () => ({
  default: { signUp: vi.fn(), createResetPasswordLink: vi.fn() },
}));
vi.mock("supertokens-node/recipe/emailverification/index.js", () => ({
  default: { createEmailVerificationToken: vi.fn(), verifyEmailUsingToken: vi.fn() },
}));
vi.mock("../../utils/hubspot.js", () => ({
  createHubSpotContact: vi.fn(),
  getHubSpotCompanyByOwnerEmail: vi.fn(),
}));
vi.mock("../whatsapp/settings/wa_channel_access.js", () => ({
  invalidateChannelAccessCache: vi.fn(),
}));
vi.mock("../../workers/bullmq/queues/index.js", () => ({
  notificationQueue: { add: vi.fn() },
  sendTransactionalEmail: vi.fn(),
}));
vi.mock("../../utils/email/supertoken/inviteEmail.js", () => ({ createEmailBody: vi.fn() }));
vi.mock("../email/email.util.js", () => ({ getEmailBodyTemplate: vi.fn() }));

import prisma from "../../utils/prisma.js";
import { invalidateChannelAccessCache } from "../whatsapp/settings/wa_channel_access.js";
import { getTeamChannels, setTeamChannels } from "./team.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  team: { findUnique: Mock; update: Mock };
  channel: { findMany: Mock };
  teamChannel: { deleteMany: Mock; createMany: Mock };
  $transaction: Mock;
};

const ORG = "org-1";
const TEAM = "team-1";

/** A Channel row as getTeamChannels selects it: a WhatsApp number by default. */
function channel(overrides: Record<string, unknown> = {}) {
  return {
    id: "wa-1",
    platform: "WHATSAPP",
    accountId: "phone-1",
    address: "+15551323034",
    name: "Shop",
    username: null,
    status: "CONNECTED",
    ...overrides,
  };
}

const WA_CHANNEL = channel();
const PAGE_CHANNEL = channel({
  id: "page-chan-1",
  platform: "FACEBOOK",
  accountId: "page-1",
  address: null,
  name: "The Shop",
  status: "ACTIVE",
});
const IG_CHANNEL = channel({
  id: "ig-chan-1",
  platform: "INSTAGRAM",
  accountId: "iba-1",
  address: null,
  name: "The Shop IG",
  username: "the_shop",
  status: "ACTIVE",
});

/** The team row getTeamChannels reads: its grants, of any platform, through TeamChannel. */
function teamWithGrants(allChannels: boolean, channels: unknown[] = []) {
  return { allChannels, channelGrants: channels.map((granted) => ({ channel: granted })) };
}

beforeEach(() => {
  vi.clearAllMocks();
  // setTeamChannels reads the team's org first; the later read is getTeamChannels.
  db.team.findUnique.mockImplementation(async (args: { select?: { orgId?: boolean } }) =>
    args.select?.orgId ? { orgId: ORG } : teamWithGrants(false),
  );
  db.channel.findMany.mockResolvedValue([]);
  // Each write returns a marker, so the transaction's contents can be read back.
  db.team.update.mockImplementation((args: unknown) => ({ op: "team.update", args }));
  db.teamChannel.deleteMany.mockImplementation((args: unknown) => ({
    op: "grant.deleteMany",
    args,
  }));
  db.teamChannel.createMany.mockImplementation((args: unknown) => ({
    op: "grant.createMany",
    args,
  }));
  db.$transaction.mockResolvedValue([]);
});

describe("setTeamChannels", () => {
  test("grants a mixed-platform id list through the one TeamChannel table", async () => {
    db.channel.findMany.mockResolvedValue([
      { id: "wa-1" },
      { id: "page-chan-1" },
      { id: "ig-chan-1" },
    ]);

    await setTeamChannels(TEAM, {
      allChannels: false,
      channelIds: ["wa-1", "page-chan-1", "ig-chan-1"],
    });

    // WhatsApp numbers, Messenger Pages and Instagram accounts are all Channel rows.
    expect(db.teamChannel.createMany).toHaveBeenCalledTimes(1);
    expect(db.teamChannel.createMany).toHaveBeenCalledWith({
      data: [
        { teamId: TEAM, channelId: "wa-1" },
        { teamId: TEAM, channelId: "page-chan-1" },
        { teamId: TEAM, channelId: "ig-chan-1" },
      ],
      skipDuplicates: true,
    });
  });

  test("drops grants that are no longer listed, whatever their platform", async () => {
    db.channel.findMany.mockResolvedValue([{ id: "wa-1" }, { id: "page-chan-1" }]);

    await setTeamChannels(TEAM, { allChannels: false, channelIds: ["wa-1", "page-chan-1"] });

    expect(db.teamChannel.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.teamChannel.deleteMany).toHaveBeenCalledWith({
      where: { teamId: TEAM, channelId: { notIn: ["wa-1", "page-chan-1"] } },
    });
  });

  test("resolves every id against the channel registry, within the team's own org", async () => {
    await setTeamChannels(TEAM, { allChannels: false, channelIds: ["wa-1", "page-chan-1"] });

    expect(db.channel.findMany).toHaveBeenCalledTimes(1);
    expect(db.channel.findMany.mock.calls[0][0]).toEqual({
      where: { orgId: ORG, id: { in: ["wa-1", "page-chan-1"] } },
      select: { id: true },
    });
  });

  test("only the ids the registry confirms are granted", async () => {
    db.channel.findMany.mockResolvedValue([{ id: "ig-chan-1" }]);

    await setTeamChannels(TEAM, { allChannels: false, channelIds: ["ig-chan-1", "elsewhere"] });

    expect(db.teamChannel.createMany.mock.calls[0][0].data).toEqual([
      { teamId: TEAM, channelId: "ig-chan-1" },
    ]);
    expect(db.teamChannel.deleteMany).toHaveBeenCalledWith({
      where: { teamId: TEAM, channelId: { notIn: ["ig-chan-1"] } },
    });
  });

  test("ids from another org grant nothing and clear every grant", async () => {
    await setTeamChannels(TEAM, { allChannels: false, channelIds: ["someone-elses"] });

    expect(db.teamChannel.createMany.mock.calls[0][0].data).toEqual([]);
    expect(db.teamChannel.deleteMany).toHaveBeenCalledWith({ where: { teamId: TEAM } });
  });

  test("allChannels clears every grant without reading any channel", async () => {
    await setTeamChannels(TEAM, { allChannels: true, channelIds: ["wa-1", "page-chan-1"] });

    expect(db.channel.findMany).not.toHaveBeenCalled();
    expect(db.team.update).toHaveBeenCalledWith({
      where: { id: TEAM },
      data: { allChannels: true },
    });
    expect(db.teamChannel.deleteMany).toHaveBeenCalledWith({ where: { teamId: TEAM } });
    expect(db.teamChannel.createMany.mock.calls[0][0].data).toEqual([]);
  });

  test("writes the flag and the grants in one transaction", async () => {
    await setTeamChannels(TEAM, { allChannels: false, channelIds: [] });

    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.$transaction.mock.calls[0][0].map((write: { op: string }) => write.op)).toEqual([
      "team.update",
      "grant.deleteMany",
      "grant.createMany",
    ]);
  });

  test("refreshes the org's cached channel scopes", async () => {
    await setTeamChannels(TEAM, { allChannels: false, channelIds: [] });

    expect(invalidateChannelAccessCache).toHaveBeenCalledWith(ORG);
  });

  test("returns the team's channels as read back afterwards", async () => {
    db.channel.findMany.mockResolvedValue([{ id: "wa-1" }]);
    db.team.findUnique.mockImplementation(async (args: { select?: { orgId?: boolean } }) =>
      args.select?.orgId ? { orgId: ORG } : teamWithGrants(false, [WA_CHANNEL]),
    );

    await expect(
      setTeamChannels(TEAM, { allChannels: false, channelIds: ["wa-1"] }),
    ).resolves.toEqual({ allChannels: false, channels: [WA_CHANNEL] });
  });

  test("refuses a team that does not exist", async () => {
    db.team.findUnique.mockResolvedValue(null);

    await expect(setTeamChannels(TEAM, { allChannels: false, channelIds: [] })).rejects.toThrow(
      "Team not found",
    );
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("getTeamChannels", () => {
  test("lists WhatsApp numbers, Messenger Pages and Instagram accounts as registry rows", async () => {
    db.team.findUnique.mockResolvedValue(
      teamWithGrants(false, [WA_CHANNEL, PAGE_CHANNEL, IG_CHANNEL]),
    );

    await expect(getTeamChannels(TEAM)).resolves.toEqual({
      allChannels: false,
      channels: [WA_CHANNEL, PAGE_CHANNEL, IG_CHANNEL],
    });
  });

  test("reads the grants through channelGrants, oldest first, never a credential", async () => {
    db.team.findUnique.mockResolvedValue(teamWithGrants(false));

    await getTeamChannels(TEAM);

    expect(db.team.findUnique).toHaveBeenCalledWith({
      where: { id: TEAM },
      select: {
        allChannels: true,
        channelGrants: {
          select: {
            channel: {
              select: {
                id: true,
                platform: true,
                accountId: true,
                address: true,
                name: true,
                username: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  });

  test("an unscoped team reports the flag and no list", async () => {
    db.team.findUnique.mockResolvedValue(teamWithGrants(true, [WA_CHANNEL, PAGE_CHANNEL]));

    await expect(getTeamChannels(TEAM)).resolves.toEqual({ allChannels: true, channels: [] });
  });

  test("a team that does not exist reads as unscoped", async () => {
    db.team.findUnique.mockResolvedValue(null);

    await expect(getTeamChannels(TEAM)).resolves.toEqual({ allChannels: true, channels: [] });
  });
});
