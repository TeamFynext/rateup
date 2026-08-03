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
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
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

    expect(m.fromContacts).toHaveBeenCalledWith(CAMPAIGN_ID, body);
    expect(sent(rep)).toEqual({ count: 2 });
  });

  test("adds the groups the caller named", async () => {
    const body = { groupIds: ["g-1"] };

    await createCampaignParticipantsFromGroupHandler(request({ body }), reply());

    expect(m.fromGroup).toHaveBeenCalledWith(CAMPAIGN_ID, body);
  });

  test("adds from every source at once on the combined endpoint", async () => {
    const body: {
      contactIds: string[];
      groupIds: string[];
      campaignIds: string[];
      status: string[];
    } = { contactIds: ["c-1"], groupIds: ["g-1"], campaignIds: [], status: [] };

    await createCampaignParticipantsHandler(request({ body }), reply());

    expect(m.create).toHaveBeenCalledWith(CAMPAIGN_ID, body);
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

  // NOTE: pins current behaviour. None of the three add handlers reads
  // request.user — the campaign id comes from the path and the contact, group and
  // campaign ids from the body, all unchecked. Combined with the unscoped lookups
  // in campaignParticipants.service.ts, this is how another org's contacts end up
  // on a campaign that will message them. See issues.txt 17.3.
  test("none of the three add handlers consults who is asking", async () => {
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
      expect(call.mock.calls[0]).not.toContain(ORG_A);
    }
  });

  // NOTE: no try/catch on any of the three, so a service failure escapes to
  // fastify's default handler. See issues.txt 17.6.
  test("lets a failure adding contacts propagate", async () => {
    m.fromContacts.mockRejectedValue(new Error("db down"));

    await expect(
      createCampaignParticipantsFromContactsHandler(
        request({ body: { contactIds: ["c-1"] } }),
        reply(),
      ),
    ).rejects.toThrow("db down");
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

    expect(m.paginated).toHaveBeenCalledWith(CAMPAIGN_ID, query);
    expect(sent(rep).participants).toEqual([{ id: "p-1" }]);
  });

  test("returns one participant by id", async () => {
    const rep = reply();

    await getCampaignParticipantByIdHandler(
      request({ params: { campaignParticipantId: "p-1" } }),
      rep,
    );

    expect(m.byId).toHaveBeenCalledWith("p-1");
    expect(sent(rep)).toEqual({ id: "p-1" });
  });

  // NOTE: the participant lookup takes the id from the path and nothing else, so a
  // participant id is enough to read another org's contact name and number.
  // See issues.txt 17.3.
  test("returns a participant without checking the campaign or the org", async () => {
    await getCampaignParticipantByIdHandler(
      request({ params: { campaignParticipantId: "another-orgs-participant" } }),
      reply(),
    );

    expect(m.byId).toHaveBeenCalledWith("another-orgs-participant");
    expect(m.byId.mock.calls[0]).toHaveLength(1);
  });
});

describe("removing participants", () => {
  test("deletes the participant named in the path", async () => {
    const rep = reply();

    await deleteCampaignParticipantByIdHandler(
      request({ params: { campaignParticipantId: "p-1" } }),
      rep,
    );

    expect(m.deleteById).toHaveBeenCalledWith("p-1");
    expect(sent(rep)).toEqual({ id: "p-1" });
  });

  test("deletes every participant the body named", async () => {
    const rep = reply();

    await multipleDeleteCampaignParticipantHandler(request({ body: { ids: ["p-1", "p-2"] } }), rep);

    expect(m.multiDelete).toHaveBeenCalledWith(["p-1", "p-2"]);
    expect(sent(rep)).toEqual({ count: 2 });
  });

  // NOTE: pins current behaviour. The bulk delete catches its failure and sends the
  // caught Error as the response body — with no status code, so fastify answers 200
  // with a body whose own properties are non-enumerable, i.e. {}. The caller is
  // told the delete succeeded. See issues.txt 17.6.
  test("answers a failed bulk delete as an empty success", async () => {
    m.multiDelete.mockRejectedValue(new Error("db down"));
    const rep = reply();

    await multipleDeleteCampaignParticipantHandler(request({ body: { ids: ["p-1"] } }), rep);

    expect(rep.code).not.toHaveBeenCalled();
    expect(JSON.stringify(sent(rep))).toBe("{}");
  });

  // NOTE: the ids come straight from the body with no ownership check, so a list of
  // another org's participant ids removes them from their campaign.
  // See issues.txt 17.3.
  test("deletes any participant ids it is handed", async () => {
    await multipleDeleteCampaignParticipantHandler(
      request({ body: { ids: ["another-orgs-participant"] } }),
      reply(),
    );

    expect(m.multiDelete).toHaveBeenCalledWith(["another-orgs-participant"]);
  });
});
