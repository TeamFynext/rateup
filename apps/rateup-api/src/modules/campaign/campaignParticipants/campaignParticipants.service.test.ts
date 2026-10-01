import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    campaign: { findFirst: vi.fn() },
    contact: { findMany: vi.fn() },
    contactGroupMap: { findMany: vi.fn() },
    campaignParticipant: {
      count: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
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
  campaign: { findFirst: Mock };
  contact: { findMany: Mock };
  contactGroupMap: { findMany: Mock };
  campaignParticipant: Record<
    | "count"
    | "createMany"
    | "delete"
    | "deleteMany"
    | "findFirst"
    | "findMany"
    | "findUnique"
    | "update",
    Mock
  >;
  campaignDripStage: { findMany: Mock };
  campaignParticipantDripStage: Record<"createMany" | "update", Mock>;
  waMessage: { findFirst: Mock };
  waMessageCampaginParticipantMap: { create: Mock };
};
const mapStatusesMock = mapStatuses as unknown as Mock;

const CAMPAIGN_ID = "camp-1";
const ORG_A = "org-a";

beforeEach(() => {
  vi.clearAllMocks();
  db.campaign.findFirst.mockResolvedValue({ id: CAMPAIGN_ID });
  db.contact.findMany.mockResolvedValue([]);
  db.contactGroupMap.findMany.mockResolvedValue([]);
  db.campaignParticipant.findFirst.mockResolvedValue(null);
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
    db.contact.findMany.mockResolvedValue([{ id: "c-1" }, { id: "c-2" }]);

    await createCampaignParticipantsFromContacts(CAMPAIGN_ID, ORG_A, {
      contactIds: ["c-1", "c-2"],
    });

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

  test("adds nothing for a contact id belonging to another org", async () => {
    db.contact.findMany.mockResolvedValue([]);

    await createCampaignParticipantsFromContacts(CAMPAIGN_ID, ORG_A, {
      contactIds: ["another-orgs-contact"],
    });

    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({
      id: { in: ["another-orgs-contact"] },
      orgId: ORG_A,
      psid: null,
      igsId: null,
    });
    expect(db.campaignParticipant.createMany.mock.calls[0][0].data).toEqual([]);
  });

  test("a filter adds every WhatsApp contact the list query matches, beside picked ids", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c-1" }, { id: "c-9" }]);

    await createCampaignParticipantsFromContacts(CAMPAIGN_ID, ORG_A, {
      contactIds: ["c-1"],
      filter: { labelIds: "l-1" },
    });

    expect(db.contact.findMany.mock.calls[0][0].where).toEqual({
      orgId: ORG_A,
      psid: null,
      igsId: null,
      OR: [
        { id: { in: ["c-1"] } },
        {
          orgId: ORG_A,
          AND: [{ ContactLabelMap: { some: { labelId: { in: ["l-1"] } } } }],
        },
      ],
    });
    expect(db.campaignParticipant.createMany.mock.calls[0][0].data).toHaveLength(2);
  });

  test("refuses a campaign belonging to another org", async () => {
    db.campaign.findFirst.mockResolvedValue(null);

    await expect(
      createCampaignParticipantsFromContacts(CAMPAIGN_ID, ORG_A, { contactIds: ["c-1"] }),
    ).rejects.toThrow("Campaign not found");
    expect(db.campaignParticipant.createMany).not.toHaveBeenCalled();
  });
});

describe("createCampaignParticipantsFromGroup", () => {
  test("adds every contact in the named groups, remembering which group each came from", async () => {
    db.contactGroupMap.findMany.mockResolvedValue([
      { contactId: "c-1", contactGroupId: "g-1" },
      { contactId: "c-2", contactGroupId: "g-1" },
    ]);

    await createCampaignParticipantsFromGroup(CAMPAIGN_ID, ORG_A, { groupIds: ["g-1"] });

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

  test("a group filter keeps only the WhatsApp members it matches", async () => {
    await createCampaignParticipantsFromGroup(CAMPAIGN_ID, ORG_A, {
      groupIds: ["g-1"],
      groupFilter: { labelIds: "l-1" },
    });

    expect(db.contactGroupMap.findMany.mock.calls[0][0].where.contact).toEqual({
      psid: null,
      igsId: null,
      orgId: ORG_A,
      AND: [{ ContactLabelMap: { some: { labelId: { in: ["l-1"] } } } }],
    });
  });

  test("adds nothing for a group that holds no contacts", async () => {
    await createCampaignParticipantsFromGroup(CAMPAIGN_ID, ORG_A, { groupIds: ["g-empty"] });

    expect(db.campaignParticipant.createMany.mock.calls[0][0].data).toEqual([]);
  });

  test("reads a contact group only when it is the caller's", async () => {
    await createCampaignParticipantsFromGroup(CAMPAIGN_ID, ORG_A, {
      groupIds: ["another-orgs-group"],
    });

    expect(db.contactGroupMap.findMany.mock.calls[0][0]).toEqual({
      where: {
        contactGroupId: { in: ["another-orgs-group"] },
        contactGroup: { team: { orgId: ORG_A } },
        contact: { psid: null, igsId: null },
      },
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

    await createCampaignParticipantsFromAnotherCampaign(CAMPAIGN_ID, ORG_A, {
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

    await createCampaignParticipantsFromAnotherCampaign(CAMPAIGN_ID, ORG_A, {
      campaignIds: ["camp-old"],
    } as any);

    expect(db.campaignParticipant.createMany.mock.calls[0][0].data[0].status).toBe(
      CampaignParticipantStatus.PENDING,
    );
  });

  test("copies only from campaigns the caller's org owns", async () => {
    await createCampaignParticipantsFromAnotherCampaign(CAMPAIGN_ID, ORG_A, {
      campaignIds: ["another-orgs-campaign"],
    } as any);

    expect(db.campaignParticipant.findMany.mock.calls[0][0].where).toEqual({
      campaignId: { in: ["another-orgs-campaign"] },
      campaign: { team: { orgId: ORG_A } },
      contact: { psid: null, igsId: null },
    });
  });

  test("carries an individually-added participant's own source through", async () => {
    db.campaignParticipant.findMany.mockResolvedValue([
      {
        contactId: "c-1",
        contactGroupId: null,
        status: "pending",
        source: CampaignParticipantSource.INDIVIDUAL,
      },
    ]);

    await createCampaignParticipantsFromAnotherCampaign(CAMPAIGN_ID, ORG_A, {
      campaignIds: ["camp-old"],
    } as any);

    expect(db.campaignParticipant.createMany.mock.calls[0][0].data[0]).toMatchObject({
      source: CampaignParticipantSource.INDIVIDUAL,
      contactGroupId: null,
    });
  });

  test("carries a group-sourced participant's source through too", async () => {
    db.campaignParticipant.findMany.mockResolvedValue([
      {
        contactId: "c-1",
        contactGroupId: "g-1",
        status: "pending",
        source: CampaignParticipantSource.GROUP,
      },
    ]);

    await createCampaignParticipantsFromAnotherCampaign(CAMPAIGN_ID, ORG_A, {
      campaignIds: ["camp-old"],
    } as any);

    expect(db.campaignParticipant.createMany.mock.calls[0][0].data[0]).toMatchObject({
      source: CampaignParticipantSource.GROUP,
      contactGroupId: "g-1",
    });
  });
});

describe("createCampaignParticipants", () => {
  test("draws from contacts, groups and other campaigns at once", async () => {
    db.contact.findMany.mockResolvedValue([{ id: "c-1" }]);

    await createCampaignParticipants(CAMPAIGN_ID, ORG_A, {
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

    await createCampaignParticipants(CAMPAIGN_ID, ORG_A, {
      contactIds: [],
      groupIds: [],
    } as any);

    const { data } = db.campaignParticipantDripStage.createMany.mock.calls[0][0];
    expect(data).toHaveLength(4);
    expect(data[0]).toEqual({ participantId: "p-1", dripStageId: "s-1", status: "PENDING" });
  });

  test("skips the drip mapping for a campaign with no stages", async () => {
    db.campaignParticipant.findMany.mockResolvedValue([{ id: "p-1", status: "PENDING" }]);

    await createCampaignParticipants(CAMPAIGN_ID, ORG_A, { contactIds: [], groupIds: [] } as any);

    expect(db.campaignParticipantDripStage.createMany).not.toHaveBeenCalled();
  });

  test("reports what each source contributed", async () => {
    db.campaignParticipant.createMany.mockResolvedValue({ count: 2 });

    await expect(
      createCampaignParticipants(CAMPAIGN_ID, ORG_A, { contactIds: [], groupIds: [] } as any),
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
    const result = await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, ORG_A, {
      page: 0,
      limit: 50,
    } as any);

    expect(result.totalCount).toBe(1);
    expect(result.searchCount).toBe(1);
    expect(result.participants[0].id).toBe("p-1");
  });

  test("brings each participant's contact details back with them", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, ORG_A, {
      page: 0,
      limit: 50,
    } as any);

    // `id` comes back too: the participants table links a row through to the
    // contact, and to the inbox thread for a reply.
    expect(db.campaignParticipant.findMany.mock.calls[0][0].include.contact.select).toEqual({
      id: true,
      name: true,
      phone: true,
      consent: true,
    });
  });

  test("brings each participant's attempt history back with them", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, ORG_A, {
      page: 0,
      limit: 50,
    } as any);

    // One chip per attempt in the table, so the messages have to arrive ordered
    // by the send they belonged to.
    const include = db.campaignParticipant.findMany.mock.calls[0][0].include;
    expect(include.WaMessageCampaginParticipantMap.orderBy).toEqual({
      campaignSend: { attemptNo: "asc" },
    });
    expect(include.WaMessageCampaginParticipantMap.select.campaignSend.select).toEqual({
      attemptNo: true,
      trigger: true,
    });
  });

  test("searches names and numbers when a search term is given", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, ORG_A, {
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

    const result = await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, ORG_A, {
      page: 0,
      limit: 50,
      search: "ada",
    } as any);

    expect(result.totalCount).toBe(100);
    expect(result.searchCount).toBe(3);
  });

  test("filters on a contact's consent flag", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, ORG_A, {
      page: 0,
      limit: 50,
      consent: "true",
    } as any);

    expect(db.campaignParticipant.findMany.mock.calls[0][0].where.OR).toContainEqual({
      contact: { consent: { equals: true } },
    });
  });

  test("sorts by the column asked for", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, ORG_A, {
      page: 0,
      limit: 50,
      sort: "sentAt",
      desc: "desc",
    } as any);

    expect(db.campaignParticipant.findMany.mock.calls[0][0].orderBy).toEqual({ sentAt: "desc" });
  });

  test("builds a status filter using Prisma's equals operator", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, ORG_A, {
      page: 0,
      limit: 50,
      status: "SENT",
    } as any);

    expect(db.campaignParticipant.findMany.mock.calls[0][0].where.OR).toContainEqual({
      status: { equals: "SENT", mode: "insensitive" },
    });
  });

  test("treats the page number as zero-based", async () => {
    await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, ORG_A, {
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

    const result = await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, ORG_A, {
      page: 0,
      limit: 50,
      selectedDripStage: "s-1",
    } as any);

    expect(result.participants[0].status).toBe("SENT");
    expect(result.participants[0].dripStageId).toBe("s-1");
  });

  test("falls back to the participant's own status when no stage is selected", async () => {
    const result = await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, ORG_A, {
      page: 0,
      limit: 50,
    } as any);

    expect(result.participants[0].status).toBe("PENDING");
    expect(result.participants[0].dripStageId).toBeNull();
  });

  test("falls back to the participant's own fields when it has no row for the selected drip stage", async () => {
    db.campaignParticipant.findMany.mockResolvedValue([
      { ...PARTICIPANT, CampaignParticipantDripStage: [] },
    ]);

    const result = await getCampaignParticipantsByCampaignIdPaginated(CAMPAIGN_ID, ORG_A, {
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

  test.each([
    [
      "reads",
      () => getCampaignParticipantById("p-1", ORG_A),
      () => db.campaignParticipant.findFirst,
    ],
    [
      "deletes",
      () => deleteCampaignParticipantById("p-1", ORG_A),
      () => db.campaignParticipant.delete,
    ],
  ])("scopes a %s of one participant to the caller's org", async (_label, run, model) => {
    await run();

    expect(model().mock.calls[0][0].where).toEqual({
      id: "p-1",
      campaign: { team: { orgId: ORG_A } },
    });
  });

  test("updates a participant by id, as the dispatcher calls it", async () => {
    await updateCampaignParticipant("p-1", { status: "SENT" } as any);

    expect(db.campaignParticipant.update.mock.calls[0][0].where).toEqual({ id: "p-1" });
  });

  test("scopes a bulk delete to the caller's org", async () => {
    await multipleDeleteCampaignParticipant(["p-1", "p-2"], ORG_A);

    expect(db.campaignParticipant.deleteMany.mock.calls[0][0]).toEqual({
      where: { id: { in: ["p-1", "p-2"] }, campaign: { team: { orgId: ORG_A } } },
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

  test("throws instead of creating a link to nothing when the message cannot be found", async () => {
    db.waMessage.findFirst.mockResolvedValue(null);

    await expect(addWaMessageCampaignParticipantMap("p-1", "wamid-unknown")).rejects.toThrow(
      "WaMessage with messageId wamid-unknown not found.",
    );

    expect(db.waMessageCampaginParticipantMap.create).not.toHaveBeenCalled();
  });

  test("finds the message across every org", async () => {
    await addWaMessageCampaignParticipantMap("p-1", "wamid-1");

    expect(JSON.stringify(db.waMessage.findFirst.mock.calls[0][0])).not.toContain("orgId");
  });
});
