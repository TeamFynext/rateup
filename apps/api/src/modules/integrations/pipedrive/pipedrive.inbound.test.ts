import { beforeEach, describe, expect, test, vi } from "vite-plus/test";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    contact: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    lead: { findUnique: vi.fn(), update: vi.fn() },
    pipelineStage: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    pipelineLostReason: { findFirst: vi.fn() },
  },
}));
vi.mock("../../../utils/redisConnection.js", () => ({ default: { set: vi.fn(), del: vi.fn() } }));
vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
}));
vi.mock("../events/emitIntegrationEvent.js", () => ({ emitIntegrationEvent: vi.fn() }));
vi.mock("../shared/entityLink.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shared/entityLink.js")>()),
  findLinkByExternalId: vi.fn(),
  recordLink: vi.fn(),
  removeLink: vi.fn(),
}));
vi.mock("../../contact/contact.service.js", () => ({ createContact: vi.fn() }));
vi.mock("../../pipeline/pipelineLead/lead.service.js", () => ({
  moveLead: vi.fn(),
  createLead: vi.fn(),
}));

const client = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("./pipedrive.client.js", () => ({ pipedriveClientFor: vi.fn(async () => client) }));

import prisma from "../../../utils/prisma.js";
import { createContact } from "../../contact/contact.service.js";
import { createLead, moveLead } from "../../pipeline/pipelineLead/lead.service.js";
import { emitIntegrationEvent } from "../events/emitIntegrationEvent.js";
import {
  findLinkByExternalId,
  hashSyncPayload,
  recordLink,
  removeLink,
} from "../shared/entityLink.js";
import {
  fromPipedriveDeal,
  fromPipedrivePerson,
  processPipedriveInboundJob,
} from "./pipedrive.inbound.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;
const findLink = findLinkByExternalId as unknown as Mock;

const CONTACT_LINK = { integrationId: "int-1", entityType: "contact" };
const LEAD_LINK = { integrationId: "int-1", entityType: "lead" };

const integration = (credential: Record<string, unknown> = {}) =>
  ({
    id: "int-1",
    orgId: "org-1",
    credential: {
      access_token: "at",
      refresh_token: "rt",
      apiDomain: "https://acme.pipedrive.com",
      companyId: 9100,
      syncContacts: true,
      syncDeals: true,
      dealPipelineId: 1,
      stageMappings: [
        { stageId: "col-new", pipedriveStageId: 11 },
        { stageId: "col-talk", pipedriveStageId: 12 },
      ],
      ...credential,
    },
  }) as never;

const job = (object: "person" | "deal", created = false) => ({
  integrationName: "pipedrive",
  triggerKey: "inbound",
  orgId: "org-1",
  data: { object, id: "77", created },
});

/** What Pipedrive answers for a record. */
const records = new Map<string, unknown>();

const person = (over: Record<string, unknown> = {}) => ({
  id: 77,
  name: "Asha Nair",
  emails: [{ value: "Asha@Example.com", primary: true }],
  phones: [{ value: "+91 98765 43210", primary: true }],
  ...over,
});

const deal = (over: Record<string, unknown> = {}) => ({
  id: 77,
  title: "Bulk order",
  pipeline_id: 1,
  stage_id: 12,
  status: "open",
  person_id: 77,
  ...over,
});

const contactRow = (over: Record<string, unknown> = {}) => ({
  id: "c-1",
  orgId: "org-1",
  name: "Asha Nair",
  email: "asha@example.com",
  phone: "919876543210",
  ...over,
});

const leadRow = (over: Record<string, unknown> = {}) => ({
  id: "lead-1",
  name: "Bulk order",
  stageId: "col-new",
  lostReasonId: null,
  pipelineId: "board-1",
  pipeline: { orgId: "org-1" },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  records.clear();
  client.get.mockImplementation(async (url: string) => {
    if (!records.has(url)) throw { isAxiosError: true, response: { status: 404 } };
    return { data: { data: records.get(url) } };
  });
  findLink.mockResolvedValue(null);
  db.contact.findUnique.mockResolvedValue(null);
  db.contact.findFirst.mockResolvedValue(null);
  db.contact.update.mockImplementation(async ({ data }) => ({ ...contactRow(), ...data }));
});

describe("a Pipedrive person in RateUp's terms", () => {
  test("primary email lower-cased; a + number as digits", () => {
    expect(fromPipedrivePerson(person() as never)).toEqual({
      name: "Asha Nair",
      email: "asha@example.com",
      phone: "919876543210",
    });
  });

  test("a number without a country code is left out", () => {
    expect(
      fromPipedrivePerson(person({ phones: [{ value: "098765 43210" }] }) as never).phone,
    ).toBe(null);
  });

  test("a name that is only the email or phone is no name", () => {
    expect(fromPipedrivePerson(person({ name: "asha@example.com" }) as never).name).toBeNull();
    expect(
      fromPipedrivePerson(
        person({ name: "+919876543210", phones: [{ value: "+919876543210" }] }) as never,
      ).name,
    ).toBeNull();
  });
});

describe("person changes", () => {
  test("an edit to a linked person updates the contact and tells the other integrations", async () => {
    records.set("/v2/persons/77", person({ name: "Asha N. Nair" }));
    findLink.mockResolvedValue({ rateupId: "c-1", lastSyncHash: "old" });
    db.contact.findUnique.mockResolvedValueOnce(contactRow());

    expect(await processPipedriveInboundJob(integration(), job("person"))).toBe("applied");

    expect(db.contact.update).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: { name: "Asha N. Nair" },
    });
    expect(recordLink).toHaveBeenCalledWith(CONTACT_LINK, {
      rateupId: "c-1",
      externalId: "77",
      payload: { name: "Asha N. Nair", email: "asha@example.com", phone: "+919876543210" },
    });
    expect(emitIntegrationEvent).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ type: "contact.updated", changed: ["details"] }),
    );
  });

  test("RateUp's own write coming back is skipped", async () => {
    records.set("/v2/persons/77", person());
    findLink.mockResolvedValue({
      rateupId: "c-1",
      lastSyncHash: hashSyncPayload({
        name: "Asha Nair",
        email: "asha@example.com",
        phone: "+919876543210",
      }),
    });

    expect(await processPipedriveInboundJob(integration(), job("person"))).toBe("echo");
    expect(db.contact.update).not.toHaveBeenCalled();
  });

  test("a phone another contact has is left as it was", async () => {
    records.set("/v2/persons/77", person({ phones: [{ value: "+15550100", primary: true }] }));
    findLink.mockResolvedValue({ rateupId: "c-1", lastSyncHash: "old" });
    db.contact.findUnique
      .mockResolvedValueOnce(contactRow())
      .mockResolvedValueOnce({ id: "c-other" });

    expect(await processPipedriveInboundJob(integration(), job("person"))).toBe("unchanged");
    expect(db.contact.update).not.toHaveBeenCalled();
  });

  test("edits are not taken with the contacts switch off", async () => {
    findLink.mockResolvedValue({ rateupId: "c-1" });
    expect(
      await processPipedriveInboundJob(integration({ syncContacts: false }), job("person")),
    ).toBe("sync_off");
    expect(client.get).not.toHaveBeenCalled();
  });

  test("a person deleted in Pipedrive only loses its link", async () => {
    findLink.mockResolvedValue({ rateupId: "c-1" });
    expect(await processPipedriveInboundJob(integration(), job("person"))).toBe("deleted");
    expect(removeLink).toHaveBeenCalledWith(CONTACT_LINK, "c-1");
  });

  test("a new person is imported only behind its switch, and only when new", async () => {
    records.set("/v2/persons/77", person());
    expect(await processPipedriveInboundJob(integration(), job("person", true))).toBe("ignored");
    expect(
      await processPipedriveInboundJob(integration({ importContacts: true }), job("person")),
    ).toBe("ignored");

    (createContact as unknown as Mock).mockResolvedValue({ id: "c-new" });
    expect(
      await processPipedriveInboundJob(integration({ importContacts: true }), job("person", true)),
    ).toBe("created");
    expect(createContact).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org-1", phone: "919876543210", source: "Pipedrive" }),
      undefined,
      { quiet: true },
    );
    expect(emitIntegrationEvent).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ type: "contact.created" }),
    );
  });

  test("an imported person RateUp has by email is linked, not duplicated", async () => {
    records.set("/v2/persons/77", person({ phones: [] }));
    db.contact.findFirst.mockResolvedValue(contactRow());

    expect(
      await processPipedriveInboundJob(integration({ importContacts: true }), job("person", true)),
    ).toBe("linked");
    expect(createContact).not.toHaveBeenCalled();
  });
});

describe("a Pipedrive deal in RateUp's terms", () => {
  test("an open deal keeps its stage; a closed one drops it", () => {
    expect(fromPipedriveDeal(deal() as never)).toEqual({
      title: "Bulk order",
      pipeline_id: 1,
      stage_id: 12,
      status: "open",
    });
    expect(fromPipedriveDeal(deal({ status: "lost", lost_reason: " Price " }) as never)).toEqual({
      title: "Bulk order",
      pipeline_id: 1,
      status: "lost",
      lost_reason: "Price",
    });
  });
});

describe("deal changes", () => {
  test("a stage change moves the lead through the mapping, without pushing it back", async () => {
    records.set("/v2/deals/77", deal());
    findLink.mockResolvedValue({ rateupId: "lead-1", lastSyncHash: "old" });
    db.lead.findUnique.mockResolvedValue(leadRow());
    db.pipelineStage.findFirst.mockResolvedValue({ id: "col-talk" });

    expect(await processPipedriveInboundJob(integration(), job("deal"))).toBe("applied");
    expect(moveLead).toHaveBeenCalledWith("lead-1", "col-talk", null, false);
    expect(recordLink).toHaveBeenCalledWith(
      LEAD_LINK,
      expect.objectContaining({ rateupId: "lead-1", externalId: "77" }),
    );
  });

  test("a won deal moves the lead to the first Won column", async () => {
    records.set("/v2/deals/77", deal({ status: "won" }));
    findLink.mockResolvedValue({ rateupId: "lead-1", lastSyncHash: "old" });
    db.lead.findUnique.mockResolvedValue(leadRow());
    db.pipelineStage.findMany.mockResolvedValue([{ id: "col-won" }, { id: "col-won-2" }]);

    await processPipedriveInboundJob(integration(), job("deal"));
    expect(db.pipelineStage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "WON" }) }),
    );
    expect(moveLead).toHaveBeenCalledWith("lead-1", "col-won", null, false);
  });

  test("a lost deal's reason is set when the board has one of that name", async () => {
    records.set("/v2/deals/77", deal({ status: "lost", lost_reason: "Price" }));
    findLink.mockResolvedValue({ rateupId: "lead-1", lastSyncHash: "old" });
    db.lead.findUnique.mockResolvedValue(leadRow({ stageId: "col-lost" }));
    db.pipelineStage.findMany.mockResolvedValue([{ id: "col-lost" }]);
    db.pipelineLostReason.findFirst.mockResolvedValue({ id: "reason-price" });

    expect(await processPipedriveInboundJob(integration(), job("deal"))).toBe("applied");
    expect(moveLead).not.toHaveBeenCalled();
    expect(db.lead.update).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { lostReasonId: "reason-price" },
    });
  });

  test("RateUp's own write coming back is skipped", async () => {
    records.set("/v2/deals/77", deal());
    findLink.mockResolvedValue({
      rateupId: "lead-1",
      lastSyncHash: hashSyncPayload({
        title: "Bulk order",
        pipeline_id: 1,
        stage_id: 12,
        status: "open",
      }),
    });

    expect(await processPipedriveInboundJob(integration(), job("deal"))).toBe("echo");
    expect(moveLead).not.toHaveBeenCalled();
  });

  test("a deal in another pipeline is ignored", async () => {
    records.set("/v2/deals/77", deal({ pipeline_id: 2 }));
    findLink.mockResolvedValue({ rateupId: "lead-1", lastSyncHash: "old" });
    expect(await processPipedriveInboundJob(integration(), job("deal"))).toBe("other_pipeline");
  });

  test("a deleted deal only loses its link", async () => {
    records.set("/v2/deals/77", deal({ is_deleted: true }));
    findLink.mockResolvedValue({ rateupId: "lead-1" });
    expect(await processPipedriveInboundJob(integration(), job("deal"))).toBe("deleted");
    expect(removeLink).toHaveBeenCalledWith(LEAD_LINK, "lead-1");
  });

  test("a new deal is imported behind its switch, with its person", async () => {
    records.set("/v2/deals/77", deal({ stage_id: 11 }));
    records.set("/v2/persons/77", person());
    db.pipelineStage.findFirst.mockResolvedValue({ id: "col-new" });
    db.pipelineStage.findUnique.mockResolvedValue({ pipelineId: "board-1" });
    findLink.mockResolvedValue(null);
    db.contact.findUnique
      .mockResolvedValueOnce(contactRow()) // the person matched by phone
      .mockResolvedValueOnce(contactRow()); // read back for the lead
    (createLead as unknown as Mock).mockResolvedValue({ id: "lead-new" });

    expect(
      await processPipedriveInboundJob(integration({ importDeals: true }), job("deal", true)),
    ).toBe("created");
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        stageId: "col-new",
        name: "Bulk order",
        contactId: "c-1",
        syncIntegrations: false,
      }),
    );
    expect(recordLink).toHaveBeenCalledWith(
      LEAD_LINK,
      expect.objectContaining({ rateupId: "lead-new", externalId: "77" }),
    );
  });

  test("a new deal in an unmapped stage is skipped", async () => {
    records.set("/v2/deals/77", deal({ stage_id: 99 }));
    expect(
      await processPipedriveInboundJob(integration({ importDeals: true }), job("deal", true)),
    ).toBe("unmapped");
    expect(createLead).not.toHaveBeenCalled();
  });
});
