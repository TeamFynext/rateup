import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({
  default: {
    contact: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    lead: { findUnique: vi.fn(), update: vi.fn() },
    pipelineStage: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
}));
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
vi.mock("./hubspot.auth.js", () => ({ hubSpotClientFor: vi.fn(async () => client) }));

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
import { fromHubSpotContact, processHubSpotInboundJob } from "./hubspot.inbound.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as {
  contact: Record<string, Mock>;
  lead: Record<string, Mock>;
  pipelineStage: Record<string, Mock>;
};
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
      portalId: 4401,
      syncContacts: true,
      syncDeals: true,
      dealPipelineId: "default",
      stageMappings: [
        { stageId: "col-new", hubspotStageId: "appointmentscheduled" },
        { stageId: "col-won-a", hubspotStageId: "closedwon" },
        { stageId: "col-won-b", hubspotStageId: "closedwon" },
      ],
      ...credential,
    },
  }) as never;

const job = (
  objectType: "contact" | "deal",
  created = false,
  objectId = objectType === "deal" ? "9001" : "701",
) => ({
  integrationName: "hubspot",
  triggerKey: "inbound",
  orgId: "org-1",
  data: { objectType, objectId, created },
});

const hubSpotContact = (properties: Record<string, string | null> = {}) => ({
  data: {
    id: "701",
    properties: {
      firstname: "Asha",
      lastname: "Nair",
      email: "Asha@Example.com",
      phone: "+91 98765 43210",
      ...properties,
    },
  },
});

const rateUpContact = (over: Record<string, unknown> = {}) => ({
  id: "c-1",
  orgId: "org-1",
  name: "Asha",
  email: "asha@example.com",
  phone: "919876543210",
  ...over,
});

const OURS = {
  firstname: "Asha",
  lastname: "Nair",
  email: "asha@example.com",
  phone: "+919876543210",
};

const notFound = () =>
  Object.assign(new Error("HTTP 404"), { isAxiosError: true, response: { status: 404 } });

beforeEach(() => {
  vi.clearAllMocks();
  findLink.mockResolvedValue(null);
  client.get.mockResolvedValue(hubSpotContact());
  db.contact.findUnique.mockResolvedValue(rateUpContact());
  db.contact.update.mockImplementation(async ({ data }) => ({ ...rateUpContact(), ...data }));
});

describe("a HubSpot contact, in RateUp's terms", () => {
  test("joins the names and keeps a number only when it carries its country code", () => {
    expect(fromHubSpotContact(hubSpotContact().data.properties)).toEqual({
      name: "Asha Nair",
      email: "asha@example.com",
      phone: "919876543210",
    });
    expect(fromHubSpotContact({ phone: "098765 43210" }).phone).toBeNull();
  });
});

describe("a linked contact edited in HubSpot", () => {
  beforeEach(() => findLink.mockResolvedValue({ rateupId: "c-1", lastSyncHash: "older" }));

  test("its new name reaches RateUp, and the link records RateUp's values", async () => {
    await expect(processHubSpotInboundJob(integration(), job("contact"))).resolves.toBe("applied");

    expect(db.contact.update).toHaveBeenCalledWith({
      where: { id: "c-1" },
      data: { name: "Asha Nair" },
    });
    expect(recordLink).toHaveBeenCalledWith(CONTACT_LINK, {
      rateupId: "c-1",
      externalId: "701",
      payload: OURS,
    });
    expect(emitIntegrationEvent).toHaveBeenCalledWith("org-1", {
      type: "contact.updated",
      contact: expect.objectContaining({ id: "c-1", name: "Asha Nair" }),
      changed: ["details"],
    });
  });

  test("RateUp's own push coming back is skipped", async () => {
    findLink.mockResolvedValue({ rateupId: "c-1", lastSyncHash: hashSyncPayload(OURS) });
    await expect(processHubSpotInboundJob(integration(), job("contact"))).resolves.toBe("echo");
    expect(db.contact.update).not.toHaveBeenCalled();
  });

  test("a phone another RateUp contact has is left alone", async () => {
    client.get.mockResolvedValue(hubSpotContact({ phone: "+971501234567" }));
    db.contact.findUnique
      .mockResolvedValueOnce(rateUpContact({ name: "Asha Nair" }))
      .mockResolvedValueOnce({ id: "c-other" });

    await expect(processHubSpotInboundJob(integration(), job("contact"))).resolves.toBe(
      "unchanged",
    );
    expect(db.contact.update).not.toHaveBeenCalled();
  });

  test("with contacts not being synced, nothing comes back either", async () => {
    await expect(
      processHubSpotInboundJob(integration({ syncContacts: false }), job("contact")),
    ).resolves.toBe("sync_off");
    expect(client.get).not.toHaveBeenCalled();
  });

  test("deleted in HubSpot, it only loses its link", async () => {
    client.get.mockRejectedValue(notFound());
    await expect(processHubSpotInboundJob(integration(), job("contact"))).resolves.toBe("deleted");
    expect(removeLink).toHaveBeenCalledWith(CONTACT_LINK, "c-1");
    expect(db.contact.update).not.toHaveBeenCalled();
  });
});

describe("a contact created in HubSpot", () => {
  test("is ignored unless importing is on, and an edit alone never imports", async () => {
    await expect(processHubSpotInboundJob(integration(), job("contact", true))).resolves.toBe(
      "ignored",
    );
    await expect(
      processHubSpotInboundJob(integration({ importContacts: true }), job("contact", false)),
    ).resolves.toBe("ignored");
    expect(client.get).not.toHaveBeenCalled();
  });

  test("is linked to the RateUp contact with the same number", async () => {
    await expect(
      processHubSpotInboundJob(integration({ importContacts: true }), job("contact", true)),
    ).resolves.toBe("linked");
    expect(createContact).not.toHaveBeenCalled();
    expect(recordLink).toHaveBeenCalledWith(
      CONTACT_LINK,
      expect.objectContaining({ rateupId: "c-1", externalId: "701" }),
    );
  });

  test("is created quietly, linked, then announced", async () => {
    db.contact.findUnique.mockResolvedValue(null);
    db.contact.findFirst.mockResolvedValue(null);
    (createContact as Mock).mockResolvedValue({ id: "c-new", orgId: "org-1" });

    await expect(
      processHubSpotInboundJob(integration({ importContacts: true }), job("contact", true)),
    ).resolves.toBe("created");
    expect(createContact).toHaveBeenCalledWith(
      {
        orgId: "org-1",
        phone: "919876543210",
        name: "Asha Nair",
        email: "asha@example.com",
        source: "HubSpot",
      },
      undefined,
      { quiet: true },
    );
    expect(recordLink).toHaveBeenCalledWith(
      CONTACT_LINK,
      expect.objectContaining({ rateupId: "c-new" }),
    );
    expect(emitIntegrationEvent).toHaveBeenCalledWith("org-1", {
      type: "contact.created",
      contact: { id: "c-new", orgId: "org-1" },
    });
  });

  test("without a phone RateUp cannot hold it", async () => {
    client.get.mockResolvedValue(hubSpotContact({ phone: null }));
    db.contact.findFirst.mockResolvedValue(null);
    await expect(
      processHubSpotInboundJob(integration({ importContacts: true }), job("contact", true)),
    ).resolves.toBe("no_phone");
    expect(createContact).not.toHaveBeenCalled();
  });
});

const hubSpotDeal = (properties: Record<string, string> = {}, contactIds: string[] = []) => ({
  data: {
    id: "9001",
    properties: {
      dealname: "Bulk order",
      pipeline: "default",
      dealstage: "closedwon",
      ...properties,
    },
    associations: { contacts: { results: contactIds.map((id) => ({ id })) } },
  },
});

describe("a linked deal changed in HubSpot", () => {
  beforeEach(() => {
    findLink.mockResolvedValue({ rateupId: "lead-1", lastSyncHash: "older" });
    client.get.mockResolvedValue(hubSpotDeal());
    db.lead.findUnique.mockResolvedValue({
      id: "lead-1",
      name: "Bulk order",
      stageId: "col-new",
      pipeline: { orgId: "org-1" },
    });
    db.pipelineStage.findFirst.mockResolvedValue({ id: "col-won-a" });
  });

  test("moves the lead to the first column mapped to its stage, without pushing it back", async () => {
    await expect(processHubSpotInboundJob(integration(), job("deal"))).resolves.toBe("applied");
    expect(db.pipelineStage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ["col-won-a", "col-won-b"] },
          pipeline: { orgId: "org-1", type: "LEADS" },
        },
        orderBy: { order: "asc" },
      }),
    );
    expect(moveLead).toHaveBeenCalledWith("lead-1", "col-won-a", null, false);
    expect(recordLink).toHaveBeenCalledWith(LEAD_LINK, {
      rateupId: "lead-1",
      externalId: "9001",
      payload: { dealname: "Bulk order", pipeline: "default", dealstage: "closedwon" },
    });
  });

  test("a lead already in a column mapped to the stage stays put", async () => {
    db.lead.findUnique.mockResolvedValue({
      id: "lead-1",
      name: "Bulk order",
      stageId: "col-won-b",
      pipeline: { orgId: "org-1" },
    });
    await expect(processHubSpotInboundJob(integration(), job("deal"))).resolves.toBe("unchanged");
    expect(moveLead).not.toHaveBeenCalled();
  });

  test("a new deal name renames the lead", async () => {
    client.get.mockResolvedValue(
      hubSpotDeal({ dealname: "Bulk order — 40 units", dealstage: "appointmentscheduled" }),
    );
    await processHubSpotInboundJob(integration(), job("deal"));
    expect(db.lead.update).toHaveBeenCalledWith({
      where: { id: "lead-1" },
      data: { name: "Bulk order — 40 units" },
    });
    expect(moveLead).not.toHaveBeenCalled();
  });

  test("RateUp's own push coming back is skipped", async () => {
    findLink.mockResolvedValue({
      rateupId: "lead-1",
      lastSyncHash: hashSyncPayload({
        dealname: "Bulk order",
        pipeline: "default",
        dealstage: "closedwon",
      }),
    });
    await expect(processHubSpotInboundJob(integration(), job("deal"))).resolves.toBe("echo");
    expect(moveLead).not.toHaveBeenCalled();
  });

  test("a deal moved to another pipeline is left alone", async () => {
    client.get.mockResolvedValue(hubSpotDeal({ pipeline: "renewals" }));
    await expect(processHubSpotInboundJob(integration(), job("deal"))).resolves.toBe(
      "other_pipeline",
    );
    expect(moveLead).not.toHaveBeenCalled();
  });

  test("with deals not being synced, nothing comes back", async () => {
    await expect(
      processHubSpotInboundJob(integration({ syncDeals: false }), job("deal")),
    ).resolves.toBe("sync_off");
  });
});

describe("a deal created in HubSpot", () => {
  beforeEach(() => {
    client.get.mockResolvedValue(hubSpotDeal({ dealstage: "appointmentscheduled" }, ["701"]));
    db.pipelineStage.findFirst.mockResolvedValue({ id: "col-new" });
    db.pipelineStage.findUnique.mockResolvedValue({ pipelineId: "board-1" });
    (createLead as Mock).mockResolvedValue({ id: "lead-new" });
  });

  test("is ignored unless importing is on", async () => {
    await expect(processHubSpotInboundJob(integration(), job("deal", true))).resolves.toBe(
      "ignored",
    );
  });

  test("opens a lead in the mapped column, on its linked contact, not pushed back", async () => {
    findLink.mockResolvedValueOnce(null).mockResolvedValueOnce({ rateupId: "c-1" });

    await expect(
      processHubSpotInboundJob(integration({ importDeals: true }), job("deal", true, "9001")),
    ).resolves.toBe("created");
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        pipelineId: "board-1",
        stageId: "col-new",
        name: "Bulk order",
        contactId: "c-1",
        phone: "919876543210",
        syncIntegrations: false,
      }),
    );
    expect(recordLink).toHaveBeenCalledWith(
      LEAD_LINK,
      expect.objectContaining({ rateupId: "lead-new", externalId: "9001" }),
    );
  });

  test("a deal whose stage no column maps to is skipped", async () => {
    client.get.mockResolvedValue(hubSpotDeal({ dealstage: "contractsent" }));
    await expect(
      processHubSpotInboundJob(integration({ importDeals: true }), job("deal", true)),
    ).resolves.toBe("unmapped");
    expect(createLead).not.toHaveBeenCalled();
  });
});
