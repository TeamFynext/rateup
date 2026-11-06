import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: { channel: { findMany: vi.fn() } },
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));
vi.mock("../../../utils/auditLog.js", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("../settings/wa_channel_access.js", () => ({ invalidateChannelAccessCache: vi.fn() }));
vi.mock("./metaChannel.login.js", () => ({
  exchangeLoginCode: vi.fn(),
  listGrantedAccounts: vi.fn(),
  readLogin: vi.fn(),
  storeLogin: vi.fn(),
}));
vi.mock("./metaChannel.service.js", async () => {
  class MetaChannelConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "MetaChannelConflictError";
    }
  }
  return {
    connectMetaChannel: vi.fn(),
    deleteMetaChannel: vi.fn(),
    getAccessibleMetaChannels: vi.fn(),
    getMetaChannelById: vi.fn(),
    MetaChannelConflictError,
    // The real one: it is what keeps tokens out of every answer.
    toPublicMetaChannel: (channel: Record<string, unknown>) => {
      const { pageAccessToken: _page, accessToken: _user, ...safe } = channel;
      return safe;
    },
  };
});

import prisma from "../../../utils/prisma.js";
import { log } from "../../../utils/logger.js";
import { recordAuditEvent } from "../../../utils/auditLog.js";
import { invalidateChannelAccessCache } from "../settings/wa_channel_access.js";
import {
  exchangeLoginCode,
  listGrantedAccounts,
  readLogin,
  storeLogin,
} from "./metaChannel.login.js";
import {
  connectMetaChannel,
  deleteMetaChannel,
  getAccessibleMetaChannels,
  getMetaChannelById,
  MetaChannelConflictError,
} from "./metaChannel.service.js";
import {
  connectMetaChannelHandler,
  deleteMetaChannelHandler,
  getMetaChannelsHandler,
  metaChannelLoginHandler,
} from "./metaChannel.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const db = (prisma as unknown as { channel: { findMany: Mock } }).channel;

const m = {
  exchange: exchangeLoginCode as unknown as Mock,
  listGranted: listGrantedAccounts as unknown as Mock,
  readLogin: readLogin as unknown as Mock,
  storeLogin: storeLogin as unknown as Mock,
  connect: connectMetaChannel as unknown as Mock,
  remove: deleteMetaChannel as unknown as Mock,
  list: getAccessibleMetaChannels as unknown as Mock,
  getById: getMetaChannelById as unknown as Mock,
};

const ORG = "org-1";
const LOGIN_ID = "11111111-1111-4111-8111-111111111111";
const CHANNEL_ID = "22222222-2222-4222-8222-222222222222";

/** A granted Instagram account, as listGrantedAccounts returns it. */
function granted(accountId: string, overrides: Record<string, unknown> = {}) {
  return {
    accountId,
    fbPageId: `page-of-${accountId}`,
    pageAccessToken: `page-token-${accountId}`,
    name: `Name ${accountId}`,
    username: `user_${accountId}`,
    pageName: `Page ${accountId}`,
    pictureUrl: `https://cdn/${accountId}.jpg`,
    ...overrides,
  };
}

/** A stored channel row, tokens included, as the service hands it back. */
function channelRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CHANNEL_ID,
    orgId: ORG,
    platform: "INSTAGRAM",
    accountId: "iba-1",
    fbPageId: "page-1",
    name: "The Shop",
    username: "the_shop",
    pageName: "The Shop Page",
    pageAccessToken: "secret-page-token",
    accessToken: "secret-user-token",
    status: "ACTIVE",
    ...overrides,
  };
}

function request(overrides: Record<string, unknown> = {}): any {
  return {
    user: { orgId: ORG, userId: "user-1" },
    actor: { orgId: ORG, userId: "user-1" },
    query: {},
    params: {},
    body: {},
    ...overrides,
  };
}

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

const sent = (rep: any) => rep.send.mock.calls[0][0];

beforeEach(() => {
  vi.clearAllMocks();
  db.findMany.mockResolvedValue([]);
  m.exchange.mockResolvedValue("user-token");
  m.listGranted.mockResolvedValue([]);
  m.readLogin.mockResolvedValue("user-token");
  m.storeLogin.mockResolvedValue(LOGIN_ID);
  m.connect.mockImplementation(async (orgId: string, input: Record<string, unknown>) =>
    channelRow({ orgId, platform: input.platform, accountId: input.accountId }),
  );
  m.remove.mockResolvedValue({});
  m.list.mockResolvedValue([]);
  m.getById.mockResolvedValue(channelRow());
});

describe("getMetaChannelsHandler", () => {
  test("lists the actor's channels without any token", async () => {
    m.list.mockResolvedValue([channelRow(), channelRow({ id: "other", platform: "FACEBOOK" })]);
    const rep = reply();

    await getMetaChannelsHandler(request(), rep);

    const body = sent(rep);
    expect(body).toHaveLength(2);
    for (const channel of body) {
      expect(channel).not.toHaveProperty("pageAccessToken");
      expect(channel).not.toHaveProperty("accessToken");
    }
    expect(body[0]).toMatchObject({ id: CHANNEL_ID, accountId: "iba-1", username: "the_shop" });
  });

  test("passes the platform filter through to the scoped lookup", async () => {
    const req = request({ query: { platform: "FACEBOOK" } });

    await getMetaChannelsHandler(req, reply());

    expect(m.list).toHaveBeenCalledWith(req.actor, "FACEBOOK");
  });

  test("lists both platforms when none is asked for", async () => {
    const req = request();

    await getMetaChannelsHandler(req, reply());

    expect(m.list).toHaveBeenCalledWith(req.actor, undefined);
  });
});

describe("metaChannelLoginHandler", () => {
  const loginRequest = (platform = "INSTAGRAM") =>
    request({ body: { platform, code: "login-code" } });

  test("trades the code and lists what it granted for the platform asked", async () => {
    await metaChannelLoginHandler(loginRequest("FACEBOOK"), reply());

    expect(m.exchange).toHaveBeenCalledWith("login-code");
    expect(m.listGranted).toHaveBeenCalledWith("FACEBOOK", "user-token");
  });

  test("parks the login token under the org and the platform", async () => {
    const rep = reply();

    await metaChannelLoginHandler(loginRequest("INSTAGRAM"), rep);

    expect(m.storeLogin).toHaveBeenCalledWith(ORG, "INSTAGRAM", "user-token");
    expect(sent(rep)).toMatchObject({ platform: "INSTAGRAM", loginId: LOGIN_ID });
  });

  test("returns the accounts without their Page tokens", async () => {
    m.listGranted.mockResolvedValue([granted("iba-1"), granted("iba-2")]);
    const rep = reply();

    await metaChannelLoginHandler(loginRequest(), rep);

    const { accounts } = sent(rep);
    expect(accounts).toHaveLength(2);
    expect(JSON.stringify(sent(rep))).not.toContain("page-token");
    expect(accounts[0]).toEqual({
      accountId: "iba-1",
      fbPageId: "page-of-iba-1",
      name: "Name iba-1",
      username: "user_iba-1",
      pageName: "Page iba-1",
      pictureUrl: "https://cdn/iba-1.jpg",
      connectedChannelId: null,
      connectedElsewhere: false,
    });
  });

  test("flags accounts already connected here and those held by another org", async () => {
    m.listGranted.mockResolvedValue([granted("iba-1"), granted("iba-2"), granted("iba-3")]);
    db.findMany.mockResolvedValue([
      { id: "mine", orgId: ORG, accountId: "iba-1" },
      { id: "theirs", orgId: "org-other", accountId: "iba-2" },
    ]);
    const rep = reply();

    await metaChannelLoginHandler(loginRequest(), rep);

    const byId = Object.fromEntries(
      sent(rep).accounts.map((account: { accountId: string }) => [account.accountId, account]),
    );
    expect(byId["iba-1"]).toMatchObject({ connectedChannelId: "mine", connectedElsewhere: false });
    // Another org's channel id is never handed out.
    expect(byId["iba-2"]).toMatchObject({ connectedChannelId: null, connectedElsewhere: true });
    expect(byId["iba-3"]).toMatchObject({ connectedChannelId: null, connectedElsewhere: false });
  });

  test("looks the connected accounts up on the login's platform only", async () => {
    m.listGranted.mockResolvedValue([granted("page-1")]);

    await metaChannelLoginHandler(loginRequest("FACEBOOK"), reply());

    // A Page connected for Messenger says nothing about an Instagram account with that id.
    expect(db.findMany.mock.calls[0][0]).toEqual({
      where: { platform: "FACEBOOK", accountId: { in: ["page-1"] } },
      select: { id: true, orgId: true, accountId: true },
    });
  });
});

describe("connectMetaChannelHandler", () => {
  const connectRequest = (accountIds: string[], platform = "INSTAGRAM") =>
    request({ body: { platform, loginId: LOGIN_ID, accountIds } });

  beforeEach(() => {
    m.listGranted.mockResolvedValue([granted("iba-1"), granted("iba-2")]);
  });

  test("answers 410 when the login has expired, connecting nothing", async () => {
    m.readLogin.mockResolvedValue(null);
    const rep = reply();

    await connectMetaChannelHandler(connectRequest(["iba-1"]), rep);

    expect(rep.code).toHaveBeenCalledWith(410);
    expect(m.listGranted).not.toHaveBeenCalled();
    expect(m.connect).not.toHaveBeenCalled();
  });

  test("reads the login back under the org and the platform asked", async () => {
    await connectMetaChannelHandler(connectRequest(["page-1"], "FACEBOOK"), reply());

    expect(m.readLogin).toHaveBeenCalledWith(ORG, "FACEBOOK", LOGIN_ID);
    // The grant is re-read with the stored token, not taken from the browser.
    expect(m.listGranted).toHaveBeenCalledWith("FACEBOOK", "user-token");
  });

  test("connects a granted account with its platform, ids, names and tokens", async () => {
    const rep = reply();

    await connectMetaChannelHandler(connectRequest(["iba-1"]), rep);

    expect(m.connect).toHaveBeenCalledWith(ORG, {
      platform: "INSTAGRAM",
      accessToken: "user-token",
      accountId: "iba-1",
      fbPageId: "page-of-iba-1",
      pageAccessToken: "page-token-iba-1",
      name: "Name iba-1",
      username: "user_iba-1",
      pageName: "Page iba-1",
      pictureUrl: "https://cdn/iba-1.jpg",
    });
    expect(rep.code).toHaveBeenCalledWith(200);
    const [result] = sent(rep).results;
    expect(result.accountId).toBe("iba-1");
    expect(result.channel).toMatchObject({ platform: "INSTAGRAM", accountId: "iba-1" });
    expect(result.channel).not.toHaveProperty("pageAccessToken");
    expect(result.channel).not.toHaveProperty("accessToken");
  });

  test("records an audit event per connected channel", async () => {
    const req = connectRequest(["iba-1"]);

    await connectMetaChannelHandler(req, reply());

    expect(recordAuditEvent).toHaveBeenCalledWith(req, "Channel added", {
      platform: "INSTAGRAM",
      accountId: "iba-1",
      name: "the_shop",
    });
  });

  test("an account the login did not share is refused on its own", async () => {
    const rep = reply();

    await connectMetaChannelHandler(connectRequest(["iba-1", "iba-9"]), rep);

    expect(m.connect).toHaveBeenCalledTimes(1);
    expect(rep.code).toHaveBeenCalledWith(200);
    expect(sent(rep).results[1]).toEqual({
      accountId: "iba-9",
      error: "This Instagram account was not shared in the Facebook login",
    });
  });

  test("a Page the Messenger login did not share says so in Page terms", async () => {
    m.listGranted.mockResolvedValue([]);
    const rep = reply();

    await connectMetaChannelHandler(connectRequest(["page-9"], "FACEBOOK"), rep);

    expect(sent(rep).results[0].error).toBe("This Page was not shared in the Facebook login");
  });

  test("an account held by another org is reported without failing the others", async () => {
    m.connect.mockImplementation(async (orgId: string, input: { accountId: string }) => {
      if (input.accountId === "iba-1") {
        throw new MetaChannelConflictError(
          "This Instagram account is already connected to another organization",
        );
      }
      return channelRow({ orgId, accountId: input.accountId, id: "chan-2" });
    });
    const rep = reply();

    await connectMetaChannelHandler(connectRequest(["iba-1", "iba-2"]), rep);

    expect(rep.code).toHaveBeenCalledWith(200);
    const [conflict, ok] = sent(rep).results;
    expect(conflict).toEqual({
      accountId: "iba-1",
      error: "This Instagram account is already connected to another organization",
    });
    expect(ok.channel).toMatchObject({ id: "chan-2", accountId: "iba-2" });
    // A conflict is an expected answer, not an error worth logging.
    expect(log.error).not.toHaveBeenCalled();
  });

  test("an unexpected failure is logged and reported in the results", async () => {
    m.connect.mockRejectedValue(new Error("graph is down"));
    const rep = reply();

    await connectMetaChannelHandler(connectRequest(["iba-1"]), rep);

    expect(log.error).toHaveBeenCalled();
    expect(sent(rep).results).toEqual([{ accountId: "iba-1", error: "graph is down" }]);
  });

  test("answers 400 when nothing could be connected", async () => {
    m.connect.mockRejectedValue(new MetaChannelConflictError("taken"));
    const rep = reply();

    await connectMetaChannelHandler(connectRequest(["iba-1", "iba-9"]), rep);

    expect(rep.code).toHaveBeenCalledWith(400);
    expect(sent(rep).results).toHaveLength(2);
    expect(invalidateChannelAccessCache).not.toHaveBeenCalled();
  });

  test("connects a repeated account id once", async () => {
    const rep = reply();

    await connectMetaChannelHandler(connectRequest(["iba-1", "iba-1", "iba-2", "iba-1"]), rep);

    expect(m.connect).toHaveBeenCalledTimes(2);
    expect(sent(rep).results.map((result: { accountId: string }) => result.accountId)).toEqual([
      "iba-1",
      "iba-2",
    ]);
  });

  test("refreshes the org's cached channel scopes once something connected", async () => {
    await connectMetaChannelHandler(connectRequest(["iba-1"]), reply());

    expect(invalidateChannelAccessCache).toHaveBeenCalledWith(ORG);
  });
});

describe("deleteMetaChannelHandler", () => {
  const deleteRequest = () => request({ params: { channelId: CHANNEL_ID } });

  test("answers 404 for a channel this org does not have", async () => {
    m.getById.mockResolvedValue(null);
    const rep = reply();

    await deleteMetaChannelHandler(deleteRequest(), rep);

    expect(m.getById).toHaveBeenCalledWith(CHANNEL_ID, ORG);
    expect(rep.code).toHaveBeenCalledWith(404);
    expect(m.remove).not.toHaveBeenCalled();
    expect(invalidateChannelAccessCache).not.toHaveBeenCalled();
  });

  test("deletes the channel within the org and refreshes the scope cache", async () => {
    const req = deleteRequest();
    const rep = reply();

    await deleteMetaChannelHandler(req, rep);

    expect(m.remove).toHaveBeenCalledWith(CHANNEL_ID, ORG);
    expect(invalidateChannelAccessCache).toHaveBeenCalledWith(ORG);
    expect(recordAuditEvent).toHaveBeenCalledWith(req, "Channel removed", {
      platform: "INSTAGRAM",
      accountId: "iba-1",
      name: "the_shop",
    });
    expect(sent(rep)).toEqual({ deleted: true });
  });
});
