import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./campaignParticipants.service.js", () => ({
  createCampaignParticipants: vi.fn(),
  createCampaignParticipantsFromContacts: vi.fn(),
  createCampaignParticipantsFromGroup: vi.fn(),
  deleteCampaignParticipantById: vi.fn(),
  getCampaignParticipantById: vi.fn(),
  getCampaignParticipantsByCampaignIdPaginated: vi.fn(),
  multipleDeleteCampaignParticipant: vi.fn(),
}));
vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), fatal: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}));

import { CampaignNotFoundError } from "../campaign.errors.js";
import {
  createCampaignParticipants,
  createCampaignParticipantsFromContacts,
  createCampaignParticipantsFromGroup,
  deleteCampaignParticipantById,
  getCampaignParticipantById,
  getCampaignParticipantsByCampaignIdPaginated,
  multipleDeleteCampaignParticipant,
} from "./campaignParticipants.service.js";
import {
  createCampaignParticipantsFromContactsHandler,
  createCampaignParticipantsFromGroupHandler,
  createCampaignParticipantsHandler,
  deleteCampaignParticipantByIdHandler,
  getCampaignParticipantByIdHandler,
  getCampaignParticipantsByCampaignIdHandler,
  multipleDeleteCampaignParticipantHandler,
} from "./campaignParticipants.controller.js";

type Mock = ReturnType<typeof vi.fn>;

const m = {
  create: createCampaignParticipants as unknown as Mock,
  fromContacts: createCampaignParticipantsFromContacts as unknown as Mock,
  fromGroup: createCampaignParticipantsFromGroup as unknown as Mock,
  deleteById: deleteCampaignParticipantById as unknown as Mock,
  byId: getCampaignParticipantById as unknown as Mock,
  paginated: getCampaignParticipantsByCampaignIdPaginated as unknown as Mock,
  multiDelete: multipleDeleteCampaignParticipant as unknown as Mock,
};

const ORG_A = "org-a";
const CAMPAIGN_ID = "camp-1";

function request(overrides: Record<string, unknown> = {}): any {
  return {
    user: { orgId: ORG_A, userId: "user-1", role: "ADMIN" },
    userId: "user-1",
    params: { campaignId: CAMPAIGN_ID },
    query: {},
    body: {},
    ...overrides,
  };
}

function reply() {
  const rep: any = { code: vi.fn(() => rep), status: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

function sent(rep: any, index = 0) {
  return rep.send.mock.calls[index][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  m.create.mockResolvedValue({ fromContacts: { count: 1 } });
  m.fromContacts.mockResolvedValue({ count: 2 });
  m.fromGroup.mockResolvedValue({ count: 3 });
  m.byId.mockResolvedValue({ id: "p-1" });
  m.deleteById.mockResolvedValue({ id: "p-1" });
  m.paginated.mockResolvedValue({ participants: [], totalCount: 0, searchCount: 0 });
  m.multiDelete.mockResolvedValue({ count: 2 });
});

describe("adding participants", () => {
  test("adds the contacts the caller named to the campaign in the path", async () => {
    const rep = reply();
    const body = { contactIds: ["c-1", "c-2"] };

    await createCampaignParticipantsFromContactsHandler(request({ body }), rep);

    expect(m.fromContacts).toHaveBeenCalledWith(CAMPAIGN_ID, ORG_A, body);
    expect(sent(rep)).toEqual({ count: 2 });
  });

  test("adds the groups the caller named", async () => {
    const body = { groupIds: ["g-1"] };

    await createCampaignParticipantsFromGroupHandler(request({ body }), reply());

    expect(m.fromGroup).toHaveBeenCalledWith(CAMPAIGN_ID, ORG_A, body);
  });

  test("adds from every source at once on the combined endpoint", async () => {
    const body: {
      contactIds: string[];
      groupIds: string[];
      campaignIds: string[];
      status: string[];
    } = { contactIds: ["c-1"], groupIds: ["g-1"], campaignIds: [], status: [] };

    await createCampaignParticipantsHandler(request({ body }), reply());

    expect(m.create).toHaveBeenCalledWith(CAMPAIGN_ID, ORG_A, body);
  });

  test("refuses to copy from another campaign without a status to copy", async () => {
    const rep = reply();

    await createCampaignParticipantsHandler(
      request({ body: { campaignIds: ["camp-old"], status: [] } }),
      rep,
    );

    expect(rep.code).toHaveBeenCalledWith(400);
    expect(sent(rep)).toEqual({ error: "atleast one status required" });
    expect(m.create).not.toHaveBeenCalled();
  });

  test("does not ask for a status when no source campaign was named", async () => {
    await createCampaignParticipantsHandler(request({ body: { contactIds: ["c-1"] } }), reply());

    expect(m.create).toHaveBeenCalled();
  });

  test("all three add handlers carry the caller's org", async () => {
    await createCampaignParticipantsFromContactsHandler(
      request({ body: { contactIds: ["c-1"] } }),
      reply(),
    );
    await createCampaignParticipantsFromGroupHandler(
      request({ body: { groupIds: ["g-1"] } }),
      reply(),
    );
    await createCampaignParticipantsHandler(request({ body: { contactIds: [] } }), reply());

    for (const call of [m.fromContacts, m.fromGroup, m.create]) {
      expect(call.mock.calls[0][1]).toBe(ORG_A);
    }
  });

  test("answers 404 when the campaign in the path is not the caller's", async () => {
    m.fromContacts.mockRejectedValue(new CampaignNotFoundError());
    const rep = reply();

    await createCampaignParticipantsFromContactsHandler(
      request({ body: { contactIds: ["c-1"] } }),
      rep,
    );

    expect(rep.status).toHaveBeenCalledWith(404);
  });

  test("answers 500 for a failure adding contacts, rather than letting it escape", async () => {
    m.fromContacts.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await createCampaignParticipantsFromContactsHandler(
      request({ body: { contactIds: ["c-1"] } }),
      rep,
    );

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(sent(rep).message).toBe("db down");
  });
});

describe("listing participants", () => {
  test("returns the page the query asked for", async () => {
    m.paginated.mockResolvedValue({
      participants: [{ id: "p-1" }],
      totalCount: 1,
      searchCount: 1,
    });
    const rep = reply();
    const query = { page: 0, limit: 50, search: "ada" };

    await getCampaignParticipantsByCampaignIdHandler(request({ query }), rep);

    expect(m.paginated).toHaveBeenCalledWith(CAMPAIGN_ID, ORG_A, query);
    expect(sent(rep).participants).toEqual([{ id: "p-1" }]);
  });

  test("returns one participant by id", async () => {
    const rep = reply();

    await getCampaignParticipantByIdHandler(
      request({ params: { campaignParticipantId: "p-1" } }),
      rep,
    );

    expect(m.byId).toHaveBeenCalledWith("p-1", ORG_A);
    expect(sent(rep)).toEqual({ id: "p-1" });
  });

  test("answers 404 for a participant belonging to another org", async () => {
    m.byId.mockResolvedValue(null);
    const rep = reply();

    await getCampaignParticipantByIdHandler(
      request({ params: { campaignParticipantId: "another-orgs-participant" } }),
      rep,
    );

    expect(m.byId).toHaveBeenCalledWith("another-orgs-participant", ORG_A);
    expect(rep.status).toHaveBeenCalledWith(404);
  });
});

describe("removing participants", () => {
  test("deletes the participant named in the path", async () => {
    const rep = reply();

    await deleteCampaignParticipantByIdHandler(
      request({ params: { campaignParticipantId: "p-1" } }),
      rep,
    );

    expect(m.deleteById).toHaveBeenCalledWith("p-1", ORG_A);
    expect(sent(rep)).toEqual({ id: "p-1" });
  });

  test("deletes every participant the body named", async () => {
    const rep = reply();

    await multipleDeleteCampaignParticipantHandler(request({ body: { ids: ["p-1", "p-2"] } }), rep);

    expect(m.multiDelete).toHaveBeenCalledWith(["p-1", "p-2"], ORG_A);
    expect(sent(rep)).toEqual({ count: 2 });
  });

  test("answers a failed bulk delete as a failure, naming what went wrong", async () => {
    m.multiDelete.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await multipleDeleteCampaignParticipantHandler(request({ body: { ids: ["p-1"] } }), rep);

    expect(rep.status).toHaveBeenCalledWith(500);
    expect(JSON.parse(JSON.stringify(sent(rep)))).toEqual({
      message: "db down",
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  test("carries the caller's org into the bulk delete", async () => {
    await multipleDeleteCampaignParticipantHandler(
      request({ body: { ids: ["another-orgs-participant"] } }),
      reply(),
    );

    expect(m.multiDelete).toHaveBeenCalledWith(["another-orgs-participant"], ORG_A);
  });
});
