import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    contactGroupMap: { findMany: vi.fn() },
    campaignParticipant: {
      count: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    campaignDripStage: { findMany: vi.fn() },
    campaignParticipantDripStage: { createMany: vi.fn(), update: vi.fn() },
    waMessage: { findFirst: vi.fn() },
    waMessageCampaginParticipantMap: { create: vi.fn() },
  },
  excludeFields: vi.fn(),
}));
vi.mock("../../whatsapp/whatsappSurvey/wasurvey.utils.js", () => ({ mapStatuses: vi.fn() }));

import prisma from "../../../utils/prisma.js";
import { mapStatuses } from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { CampaignParticipantSource, CampaignParticipantStatus } from "../../../types/enums.js";
import {
  addWaMessageCampaignParticipantMap,
  createCampaignParticipants,
  createCampaignParticipantsFromAnotherCampaign,
  createCampaignParticipantsFromContacts,
  createCampaignParticipantsFromGroup,
  deleteCampaignParticipantById,
  getCampaignParticipantById,
  getCampaignParticipantsByCampaignId,
  getCampaignParticipantsByCampaignIdPaginated,
  getCampaignParticipantsByIds,
  multipleDeleteCampaignParticipant,
  updateCampaignParticipant,
  updateDripCampaignParticipant,
} from "./campaignParticipants.service.js";

type Mock = ReturnType<typeof vi.fn>;

const db = prisma as unknown as {
  contactGroupMap: { findMany: Mock };
  campaignParticipant: Record<
    "count" | "createMany" | "delete" | "deleteMany" | "findMany" | "findUnique" | "update",
    Mock
  >;
  campaignDripStage: { findMany: Mock };
  campaignParticipantDripStage: Record<"createMany" | "update", Mock>;
  waMessage: { findFirst: Mock };
  waMessageCampaginParticipantMap: { create: Mock };
};
const mapStatusesMock = mapStatuses as unknown as Mock;

const CAMPAIGN_ID = "camp-1";

beforeEach(() => {
  vi.clearAllMocks();
  db.contactGroupMap.findMany.mockResolvedValue([]);
  db.campaignParticipant.createMany.mockResolvedValue({ count: 0 });
  db.campaignParticipant.findMany.mockResolvedValue([]);
  db.campaignParticipant.findUnique.mockResolvedValue(null);
  db.campaignParticipant.count.mockResolvedValue(0);
  db.campaignParticipant.delete.mockResolvedValue({ id: "p-1" });
  db.campaignParticipant.deleteMany.mockResolvedValue({ count: 0 });
  db.campaignParticipant.update.mockResolvedValue({ id: "p-1" });
  db.campaignDripStage.findMany.mockResolvedValue([]);
  db.campaignParticipantDripStage.createMany.mockResolvedValue({ count: 0 });
  db.campaignParticipantDripStage.update.mockResolvedValue({ id: "pds-1" });
  db.waMessage.findFirst.mockResolvedValue({ id: "msg-1" });
  db.waMessageCampaginParticipantMap.create.mockResolvedValue({ id: "map-1" });
  mapStatusesMock.mockReturnValue(["PENDING"]);
});

describe("createCampaignParticipantsFromContacts", () => {
  test("adds one pending participant per contact", async () => {
    await createCampaignParticipantsFromContacts(CAMPAIGN_ID, { contactIds: ["c-1", "c-2"] });

    expect(db.campaignParticipant.createMany.mock.calls[0][0]).toEqual({
      data: [
        {
          campaignId: CAMPAIGN_ID,
          contactId: "c-1",
          source: CampaignParticipantSource.INDIVIDUAL,
          status: CampaignParticipantStatus.PENDING,
        },
        {
          campaignId: CAMPAIGN_ID,
          contactId: "c-2",
          source: CampaignParticipantSource.INDIVIDUAL,
          status: CampaignParticipantStatus.PENDING,
        },
      ],
      skipDuplicates: true,
    });
  });

  // NOTE: pins current behaviour. The contact ids go from the request body into
  // createMany with nothing in between — no lookup, no org check. So naming another
  // org's contact ids adds their customers to your campaign, and the next send
  // messages them from your WhatsApp number. See issues.txt 17.3.
  test("adds any contact id it is handed, whoever owns it", async () => {
    await createCampaignParticipantsFromContacts(CAMPAIGN_ID, {
      contactIds: ["another-orgs-contact"],
    });

    expect(db.campaignParticipant.createMany.mock.calls[0][0].data[0].contactId).toBe(
      "another-orgs-contact",
    );
  });
});

describe("createCampaignParticipantsFromGroup", () => {
  test("adds every contact in the named groups, remembering which group each came from", async () => {
    db.contactGroupMap.findMany.mockResolvedValue([
      { contactId: "c-1", contactGroupId: "g-1" },
      { contactId: "c-2", contactGroupId: "g-1" },
    ]);

    await createCampaignParticipantsFromGroup(CAMPAIGN_ID, { groupIds: ["g-1"] });

    expect(db.campaignParticipant.createMany.mock.calls[0][0].data).toEqual([
      {
        campaignId: CAMPAIGN_ID,
        contactId: "c-1",
        source: CampaignParticipantSource.GROUP,
        contactGroupId: "g-1",
        status: CampaignParticipantStatus.PENDING,
      },
      {
        campaignId: CAMPAIGN_ID,
        contactId: "c-2",
        source: CampaignParticipantSource.GROUP,
        contactGroupId: "g-1",
        status: CampaignParticipantStatus.PENDING,
      },
    ]);
  });

  test("adds nothing for a group that holds no contacts", async () => {
    await createCampaignParticipantsFromGroup(CAMPAIGN_ID, { groupIds: ["g-empty"] });

    expect(db.campaignParticipant.createMany.mock.calls[0][0].data).toEqual([]);
  });

  // NOTE: same gap as above, and worse in effect — one group id pulls in every
  // contact that group holds. The lookup filters on contactGroupId alone.
  // See issues.txt 17.3.
  test("reads a contact group without checking whose it is", async () => {
    await createCampaignParticipantsFromGroup(CAMPAIGN_ID, {
      groupIds: ["another-orgs-group"],
    });

    expect(db.contactGroupMap.findMany.mock.calls[0][0]).toEqual({
      where: { contactGroupId: { in: ["another-orgs-group"] } },
    });
  });
});

describe("createCampaignParticipantsFromAnotherCampaign", () => {
  test("copies across only the participants in the statuses asked for", async () => {
    mapStatusesMock.mockReturnValue(["SENT"]);
    db.campaignParticipant.findMany.mockResolvedValue([
      { contactId: "c-1", contactGroupId: "g-1", status: "sent" },
      { contactId: "c-2", contactGroupId: null, status: "failed" },
    ]);

    await createCampaignParticipantsFromAnotherCampaign(CAMPAIGN_ID, {
      campaignIds: ["camp-old"],
      status: ["SENT"],
    } as any);

    const { data } = db.campaignParticipant.createMany.mock.calls[0][0];
    expect(data).toHaveLength(1);
    expect(data[0].contactId).toBe("c-1");
  });

  test("resets every copied participant to pending", async () => {
    db.campaignParticipant.findMany.mockResolvedValue([
      { contactId: "c-1", contactGroupId: null, status: "pending" },
    ]);

    await createCampaignParticipantsFromAnotherCampaign(CAMPAIGN_ID, {
      campaignIds: ["camp-old"],
    } as any);

    expect(db.campaignParticipant.createMany.mock.calls[0][0].data[0].status).toBe(
      CampaignParticipantStatus.PENDING,
    );
  });

  // NOTE: pins current behaviour. The source campaigns are read by id alone. So
  // naming another org's campaign id copies their entire participant list — every
  // contact they were about to message — into your campaign. See issues.txt 17.3.
  test("copies from any campaign id it is handed", async () => {
    await createCampaignParticipantsFromAnotherCampaign(CAMPAIGN_ID, {
      campaignIds: ["another-orgs-campaign"],
    } as any);

    expect(db.campaignParticipant.findMany.mock.calls[0][0].where).toEqual({
      campaignId: { in: ["another-orgs-campaign"] },
    });
  });

  // NOTE: every copied participant is marked as having come from a GROUP, even one
  // that was added individually and has no contactGroupId. The source is wrong for
  // anything but a group-sourced participant. See issues.txt 17.8.
  test("marks an individually-added participant as group-sourced", async () => {
    db.campaignParticipant.findMany.mockResolvedValue([
      { contactId: "c-1", contactGroupId: null, status: "pending" },
    ]);

    await createCampaignParticipantsFromAnotherCampaign(CAMPAIGN_ID, {
      campaignIds: ["camp-old"],
    } as any);

    expect(db.campaignParticipant.createMany.mock.calls[0][0].data[0]).toMatchObject({
      source: CampaignParticipantSource.GROUP,
      contactGroupId: null,
    });
  });
});

describe("createCampaignParticipants", () => {
  test("draws from contacts, groups and other campaigns at once", async () => {
    await createCampaignParticipants(CAMPAIGN_ID, {
      contactIds: ["c-1"],
      groupIds: ["g-1"],
      campaignIds: ["camp-old"],
    } as any);

    expect(db.campaignParticipant.createMany).toHaveBeenCalledTimes(3);
  });

  test("gives every participant a row for every drip stage", async () => {
    db.campaignParticipant.findMany.mockResolvedValue([
      { id: "p-1", status: "PENDING" },
      { id: "p-2", status: "PENDING" },
    ]);
    db.campaignDripStage.findMany.mockResolvedValue([{ id: "s-1" }, { id: "s-2" }]);

    await createCampaignParticipants(CAMPAIGN_ID, {
      contactIds: [],
      groupIds: [],
    } as any);

    const { data } = db.campaignParticipantDripStage.createMany.mock.calls[0][0];
    expect(data).toHaveLength(4);
    expect(data[0]).toEqual({ participantId: "p-1", dripStageId: "s-1", status: "PENDING" });
  });

  test("skips the drip mapping for a campaign with no stages", async () => {
    db.campaignParticipant.findMany.mockResolvedValue([{ id: "p-1", status: "PENDING" }]);

    await createCampaignParticipants(CAMPAIGN_ID, { contactIds: [], groupIds: [] } as any);

    expect(db.campaignParticipantDripStage.createMany).not.toHaveBeenCalled();
  });

  test("reports what each source contributed", async () => {
    db.campaignParticipant.createMany.mockResolvedValue({ count: 2 });

    await expect(
      createCampaignParticipants(CAMPAIGN_ID, { contactIds: [], groupIds: [] } as any),
    ).resolves.toEqual({
      fromContacts: { count: 2 },
      fromGroups: { count: 2 },
      fromCampaigns: { count: 2 },
    });
  });
});

describe("getCampaignParticipantsByCampaignIdPaginated", () => {
  const PARTICIPANT: {
    id: string;
    status: string;
    sentAt: Date | null;
    createdAt: Date;
    contact: { name: string; phone: string; consent: boolean };
  } = {
    id: "p-1",
    status: "PENDING",
    sentAt: null,
    createdAt: new Date("2026-03-01"),
    contact: { name: "Ada", phone: "1", consent: true },
  };

  beforeEach(() => {
    db.campaignParticipant.findMany.mockResolvedValue([PARTICIPANT]);
    db.campaignParticipant.count.mockResolvedValue(1);
  });

  test("returns the page alongside the total and the filtered total", async () => {
    const result = await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, {
      page: 0,
      limit: 50,
    } as any);

    expect(result.totalCount).toBe(1);
    expect(result.searchCount).toBe(1);
    expect(result.participants[0].id).toBe("p-1");
  });

  test("brings each participant's contact details back with them", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, { page: 0, limit: 50 } as any);

    expect(db.campaignParticipant.findMany.mock.calls[0][0].include.contact.select).toEqual({
      name: true,
      phone: true,
      consent: true,
    });
  });

  test("searches names and numbers when a search term is given", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, {
      page: 0,
      limit: 50,
      search: "ada",
    } as any);

    const { where } = db.campaignParticipant.findMany.mock.calls[0][0];
    expect(where.OR).toEqual([
      { contact: { name: { contains: "ada", mode: "insensitive" } } },
      { contact: { phone: { contains: "ada" } } },
    ]);
  });

  test("counts the search separately from the total", async () => {
    db.campaignParticipant.count.mockResolvedValueOnce(100).mockResolvedValueOnce(3);

    const result = await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, {
      page: 0,
      limit: 50,
      search: "ada",
    } as any);

    expect(result.totalCount).toBe(100);
    expect(result.searchCount).toBe(3);
  });

  test("filters on a contact's consent flag", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, {
      page: 0,
      limit: 50,
      consent: "true",
    } as any);

    expect(db.campaignParticipant.findMany.mock.calls[0][0].where.OR).toContainEqual({
      contact: { consent: { equals: true } },
    });
  });

  test("sorts by the column asked for", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, {
      page: 0,
      limit: 50,
      sort: "sentAt",
      desc: "desc",
    } as any);

    expect(db.campaignParticipant.findMany.mock.calls[0][0].orderBy).toEqual({ sentAt: "desc" });
  });

  // NOTE: previously the clause built for createdAt, status and sentAt used
  // `{ [key]: { equal: value, mode: "insensitive" } }` — Prisma's operator is
  // `equals`, not `equal`, so this filter never actually worked (Prisma rejects
  // unknown arguments, raising a validation error rather than filtering). Fixed to
  // use `equals`, and `mode` (string-only) is no longer applied to the createdAt /
  // sentAt DateTime fields. See issues.txt 17.9.
  test("builds a status filter using Prisma's equals operator", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, {
      page: 0,
      limit: 50,
      status: "SENT",
    } as any);

    expect(db.campaignParticipant.findMany.mock.calls[0][0].where.OR).toContainEqual({
      status: { equals: "SENT", mode: "insensitive" },
    });
  });

  // NOTE: pins current behaviour. The page number is multiplied by the limit, so
  // pages are zero-based — the same convention issues.txt 8.2 and 13.6 record
  // elsewhere, still unstated. See issues.txt 17.9.
  test("treats the page number as zero-based", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, {
      page: 1,
      limit: 50,
    } as any);

    expect(db.campaignParticipant.findMany.mock.calls[0][0].skip).toBe(50);
  });

  test("reads a participant's status from the drip stage when one is selected", async () => {
    db.campaignParticipant.findMany.mockResolvedValue([
      {
        ...PARTICIPANT,
        CampaignParticipantDripStage: [
          { status: "SENT", dripStageId: "s-1", sentAt: new Date("2026-03-02"), createdAt: null },
        ],
      },
    ]);

    const result = await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, {
      page: 0,
      limit: 50,
      selectedDripStage: "s-1",
    } as any);

    expect(result.participants[0].status).toBe("SENT");
    expect(result.participants[0].dripStageId).toBe("s-1");
  });

  test("falls back to the participant's own status when no stage is selected", async () => {
    const result = await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, {
      page: 0,
      limit: 50,
    } as any);

    expect(result.participants[0].status).toBe("PENDING");
    expect(result.participants[0].dripStageId).toBeNull();
  });

  // NOTE: previously the status was read as `CampaignParticipantDripStage?.[0].status`
  // — the optional chain guarded the property being absent, but not the array being
  // EMPTY. Selecting a drip stage that a participant has no row for gave
  // `undefined.status` and a TypeError, taking the whole page listing down rather
  // than that one participant. Fixed to fall back to the participant's own fields
  // when it has no row for the selected drip stage. See issues.txt 17.9.
  test("falls back to the participant's own fields when it has no row for the selected drip stage", async () => {
    db.campaignParticipant.findMany.mockResolvedValue([
      { ...PARTICIPANT, CampaignParticipantDripStage: [] },
    ]);

    const result = await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, {
      page: 0,
      limit: 50,
      selectedDripStage: "s-1",
    } as any);

    expect(result.participants[0].status).toBe(PARTICIPANT.status);
    expect(result.participants[0].dripStageId).toBeNull();
    expect(result.participants[0].sentAt).toBe(PARTICIPANT.sentAt);
    expect(result.participants[0].createdAt).toBe(PARTICIPANT.createdAt);
  });
});

describe("reading and writing one participant", () => {
  test("lists a campaign's participants with their contact details", async () => {
    await getCampaignParticipantsByCampaignId(CAMPAIGN_ID);

    expect(db.campaignParticipant.findMany.mock.calls[0][0].where).toEqual({
      campaignId: CAMPAIGN_ID,
    });
  });

  test("returns several participants by id, with the whole contact", async () => {
    await getCampaignParticipantsByIds(["p-1", "p-2"]);

    expect(db.campaignParticipant.findMany.mock.calls[0][0]).toEqual({
      where: { id: { in: ["p-1", "p-2"] } },
      include: { contact: true },
    });
  });

  // NOTE: none of these five take a campaign, let alone an org — an id is the whole
  // authorisation. getCampaignParticipantByIdHandler and
  // deleteCampaignParticipantByIdHandler pass the path parameter straight in.
  // See issues.txt 17.3.
  test.each([
    ["reads", () => getCampaignParticipantById("p-1"), () => db.campaignParticipant.findUnique],
    ["deletes", () => deleteCampaignParticipantById("p-1"), () => db.campaignParticipant.delete],
    [
      "updates",
      () => updateCampaignParticipant("p-1", { status: "SENT" } as any),
      () => db.campaignParticipant.update,
    ],
  ])("%s a participant by id alone", async (_label, run, model) => {
    await run();

    expect(model().mock.calls[0][0].where).toEqual({ id: "p-1" });
  });

  test("deletes several participants by id alone", async () => {
    await multipleDeleteCampaignParticipant(["p-1", "p-2"]);

    expect(db.campaignParticipant.deleteMany.mock.calls[0][0]).toEqual({
      where: { id: { in: ["p-1", "p-2"] } },
    });
  });

  test("updates a drip-stage row by id alone", async () => {
    await updateDripCampaignParticipant("pds-1", { status: "SENT" } as any);

    expect(db.campaignParticipantDripStage.update.mock.calls[0][0].where).toEqual({ id: "pds-1" });
  });
});

describe("addWaMessageCampaignParticipantMap", () => {
  test("links the participant to the message that was sent to them", async () => {
    await addWaMessageCampaignParticipantMap("p-1", "wamid-1");

    expect(db.waMessage.findFirst.mock.calls[0][0]).toEqual({ where: { messageId: "wamid-1" } });
    expect(db.waMessageCampaginParticipantMap.create.mock.calls[0][0].data).toEqual({
      campaignParticipantId: "p-1",
      waMessageId: "msg-1",
    });
  });

  // NOTE: previously the message lookup was optional-chained but the create was not
  // guarded, so a message id that matches nothing produced a link row pointing at no
  // message — and the participant's delivery status could never be resolved from it
  // afterwards. Fixed to throw a clear error instead of writing a dangling link.
  // See issues.txt 17.9.
  test("throws instead of creating a link to nothing when the message cannot be found", async () => {
    db.waMessage.findFirst.mockResolvedValue(null);

    await expect(addWaMessageCampaignParticipantMap("p-1", "wamid-unknown")).rejects.toThrow(
      "WaMessage with messageId wamid-unknown not found.",
    );

    expect(db.waMessageCampaginParticipantMap.create).not.toHaveBeenCalled();
  });

  // NOTE: the message is looked up by its WhatsApp id alone, across every org.
  // See issues.txt 17.3.
  test("finds the message across every org", async () => {
    await addWaMessageCampaignParticipantMap("p-1", "wamid-1");

    expect(JSON.stringify(db.waMessage.findFirst.mock.calls[0][0])).not.toContain("orgId");
  });
});
