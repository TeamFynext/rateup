import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/prisma.js", () => ({
  default: {
    integration: { findMany: vi.fn() },
    webhook: { findUnique: vi.fn() },
    lifecycle: { findUnique: vi.fn() },
  },
}));

vi.mock("../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}));

vi.mock("../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: vi.fn() },
  outgoingWebhookQueue: { add: vi.fn() },
}));

vi.mock("../external/zapier/zapier.service.js", () => ({
  addZapierTriggerToQueue: vi.fn(),
  ZapierTriggers: {
    CONTACT_CREATE: "new_contact_create",
    CONTACT_UPDATED: "contact_updated",
    CONTACT_DELETED: "contact_deleted",
    CONVERSATION_CLOSED: "conversation_closed",
    CONTACT_STAGE_UPDATED: "contact_stage_updated",
  },
}));

vi.mock("../external/getlead/getlead.queue.js", () => ({ addGetLeadSyncToQueue: vi.fn() }));

vi.mock("../../webhook/webhook.service.js", () => ({ enqueueOrgWebhookDispatch: vi.fn() }));

vi.mock("../external/getlead/getlead.service.js", () => ({
  GetLeadTriggers: { LEAD_CREATE: "getlead_lead_create", LEAD_UPDATE: "getlead_lead_update" },
  processGetLead: vi.fn(),
}));
vi.mock("../external/zoho/zoho.service.js", () => ({
  pushCrmLeadStatus: vi.fn(),
  processZoho: vi.fn(),
  ZohoTriggers: {
    CONTACT_CREATE: "contact_created",
    CONTACT_UPDATE: "contact_updated",
    CONTACT_DELETE: "contact_deleted",
    LEAD_CREATE: "lead_created",
    LEAD_UPDATE: "lead_updated",
    BIGIN_CONTACT_CREATE: "bigin_contact_created",
    BIGIN_CONTACT_UPDATE: "bigin_contact_updated",
    BIGIN_CONTACT_DELETE: "bigin_contact_deleted",
    BIGIN_DEAL_CREATE: "bigin_deal_created",
  },
}));

import prisma from "../../../utils/prisma.js";
import { integrationTriggerQueue } from "../../../workers/bullmq/queues/index.js";
import { pushCrmLeadStatus, processZoho } from "../external/zoho/zoho.service.js";
import { addZapierTriggerToQueue } from "../external/zapier/zapier.service.js";
import { addGetLeadSyncToQueue } from "../external/getlead/getlead.queue.js";
import { enqueueOrgWebhookDispatch } from "../../webhook/webhook.service.js";
import {
  emitIntegrationEvent,
  INTEGRATION_EVENT_JOB,
  emitSurveyResponseSubmitted,
} from "./emitIntegrationEvent.js";
import { processIntegrationEvent } from "./integrationEvent.fanout.js";
import { processIntegrationJob } from "../external/integrationDispatch.js";
import type { IntegrationEvent, IntegrationEventOf } from "./integrationEvent.types.js";
import type { IntegrationProvider } from "../providers/integrationProvider.types.js";
import { zohoProvider } from "../external/zoho/zoho.provider.js";
import { getLeadProvider } from "../external/getlead/getlead.provider.js";

type Mock = ReturnType<typeof vi.fn>;
const db = prisma as unknown as Record<string, Record<string, Mock>>;
const jobs = () => (integrationTriggerQueue.add as unknown as Mock).mock.calls;
const jobNames = () => jobs().map((call) => call[0]);

const ORG = "org-1";

/** Every trigger each provider offers, all switched on. */
const ALL_TRIGGERS: Record<string, string[]> = {
  zoho: [
    "contact_created",
    "contact_updated",
    "contact_deleted",
    "lead_created",
    "lead_updated",
    "bigin_contact_created",
    "bigin_contact_updated",
    "bigin_contact_deleted",
    "bigin_deal_created",
  ],
  getlead: ["getlead_lead_create", "getlead_lead_update"],
};

function row(name: string, triggers: string[] = ALL_TRIGGERS[name] ?? []) {
  return {
    name,
    active: true,
    credential: {
      triggerSubscriptions: triggers.map((subscribed_field) => ({
        subscribed_field,
        active: true,
      })),
    },
  };
}

function connect(...names: string[]) {
  db.integration.findMany.mockResolvedValue(names.map((name) => row(name)));
}

const contact = {
  id: "c1",
  orgId: ORG,
  name: "Ann",
  email: "ann@example.com",
  phone: "919000000001",
  source: "WHATSAPP",
  notes: null,
  lifecycleId: null,
  integrationIds: {
    zoho: { contact: { id: "z1" }, lead: { id: "zl1" } },
    bigin: { contact: { id: "b1" } },
  },
};

function leadEvent(
  overrides: Partial<IntegrationEventOf<"lead.stage_changed">> = {},
): IntegrationEventOf<"lead.stage_changed"> {
  return {
    type: "lead.stage_changed",
    lead: {
      id: "lead-1",
      contactId: "c1",
      name: "Ann",
      email: null,
      phone: "919000000001",
      source: "WHATSAPP",
    },
    stage: {
      id: "stage-1",
      name: "Qualified",
      status: "OPEN",
      pipelineId: "p1",
      pipelineName: "Sales",
      pipelineType: "LEADS",
    },
    contact: {
      id: "c1",
      name: "Ann",
      email: null,
      phone: "919000000001",
      source: "WHATSAPP",
      notes: null,
      integrationIds: contact.integrationIds,
    },
    origin: "rateup",
    ...overrides,
  };
}

const run = (event: IntegrationEvent) => processIntegrationEvent({ orgId: ORG, event });

beforeEach(() => {
  vi.clearAllMocks();
  connect("zoho", "getlead");
  db.webhook.findUnique.mockResolvedValue(null);
  db.lifecycle.findUnique.mockResolvedValue({ name: "Customer" });
});

describe("emitIntegrationEvent", () => {
  test("enqueues one event job, whatever the org has connected", async () => {
    await emitIntegrationEvent(ORG, { type: "contact.created", contact });

    expect(jobs()).toEqual([
      [INTEGRATION_EVENT_JOB, { orgId: ORG, event: { type: "contact.created", contact } }],
    ]);
  });

  test("a survey response is announced only when it has a contact", async () => {
    const response = {
      id: "resp-1",
      platform: "WEB",
      createdAt: new Date("2026-09-30T11:00:00.000Z"),
    };
    await emitSurveyResponseSubmitted(ORG, { ...response, contactId: null });
    expect(jobs()).toEqual([]);

    await emitSurveyResponseSubmitted(ORG, { ...response, contactId: "c-1" });
    expect(jobs()).toEqual([
      [
        INTEGRATION_EVENT_JOB,
        {
          orgId: ORG,
          event: {
            type: "survey.response_submitted",
            response: {
              id: "resp-1",
              contactId: "c-1",
              platform: "WEB",
              createdAt: "2026-09-30T11:00:00.000Z",
            },
          },
        },
      ],
    ]);
  });
});

describe("processIntegrationJob", () => {
  test("fans an event job out instead of treating it as a provider job", async () => {
    await processIntegrationJob({
      name: INTEGRATION_EVENT_JOB,
      data: { orgId: ORG, event: { type: "conversation.closed", contact } },
    } as any);

    expect(addZapierTriggerToQueue).toHaveBeenCalledWith(
      "conversation_closed",
      { conversation_closed: contact },
      ORG,
    );
  });

  test("routes a provider job to that provider through the registry", async () => {
    (db.integration as any).findUnique = vi.fn().mockResolvedValue({ name: "zoho", active: true });

    await processIntegrationJob({
      name: "zoho-lead-create",
      data: { integrationName: "zoho", triggerKey: "lead_created", orgId: ORG, data: {} },
    } as any);

    expect(processZoho).toHaveBeenCalled();
  });

  test("drops a job whose integration has since been switched off", async () => {
    (db.integration as any).findUnique = vi.fn().mockResolvedValue({ name: "zoho", active: false });

    await processIntegrationJob({
      name: "zoho-lead-create",
      data: { integrationName: "zoho", triggerKey: "lead_created", orgId: ORG, data: {} },
    } as any);

    expect(processZoho).not.toHaveBeenCalled();
  });

  test("a job for a provider the registry does not know fails loudly", async () => {
    await expect(
      processIntegrationJob({
        name: "x",
        data: { integrationName: "nope", triggerKey: "t", orgId: ORG, data: {} },
      } as any),
    ).rejects.toThrow("Unsupported integration: nope");
  });
});

describe("the fan-out", () => {
  function provider(overrides: Partial<IntegrationProvider>): IntegrationProvider {
    return {
      name: "webhook",
      label: "Test",
      auth: "custom",
      connection: "self",
      events: ["contact.created"],
      subscribedEvents: () => ["contact.created"],
      handleEvent: vi.fn(),
      ...overrides,
    };
  }

  test("reads the org's connected integrations once for every provider", async () => {
    await run({ type: "contact.created", contact });

    expect(db.integration.findMany).toHaveBeenCalledTimes(1);
    expect(db.integration.findMany.mock.calls[0][0].where).toMatchObject({
      orgId: ORG,
      active: true,
    });
  });

  test("skips a provider whose integration the org has not connected", async () => {
    connect();
    const zohoLike = provider({ name: "zoho" as any, connection: "integration" });

    await processIntegrationEvent({ orgId: ORG, event: { type: "contact.created", contact } }, [
      zohoLike,
    ]);

    expect(zohoLike.handleEvent).not.toHaveBeenCalled();
  });

  test("hands a connected provider its own row", async () => {
    connect("zoho");
    const zohoLike = provider({ name: "zoho" as any, connection: "integration" });

    await processIntegrationEvent({ orgId: ORG, event: { type: "contact.created", contact } }, [
      zohoLike,
    ]);

    expect(zohoLike.handleEvent).toHaveBeenCalledWith(
      { type: "contact.created", contact },
      { orgId: ORG, integration: expect.objectContaining({ name: "zoho" }) },
    );
  });

  test("skips a provider the org connected but did not subscribe to this event", async () => {
    const unsubscribed = provider({ subscribedEvents: () => [] });

    await processIntegrationEvent({ orgId: ORG, event: { type: "contact.created", contact } }, [
      unsubscribed,
    ]);

    expect(unsubscribed.handleEvent).not.toHaveBeenCalled();
  });

  test("never asks providers about an event they do not handle", async () => {
    const other = provider({ events: ["contact.deleted"] });

    await processIntegrationEvent({ orgId: ORG, event: { type: "contact.created", contact } }, [
      other,
    ]);

    expect(other.handleEvent).not.toHaveBeenCalled();
    expect(db.integration.findMany).not.toHaveBeenCalled();
  });

  test("one provider failing does not stop the next, and the job still fails", async () => {
    const broken = provider({ handleEvent: vi.fn().mockRejectedValue(new Error("down")) });
    const healthy = provider({});

    await expect(
      processIntegrationEvent({ orgId: ORG, event: { type: "contact.created", contact } }, [
        broken,
        healthy,
      ]),
    ).rejects.toBeInstanceOf(AggregateError);
    expect(healthy.handleEvent).toHaveBeenCalled();
  });
});

describe("per-org subscriptions", () => {
  test("Zoho: an event is on when any trigger it produces is on", () => {
    const integration = row("zoho", ["bigin_deal_created"]) as any;

    expect(zohoProvider.subscribedEvents(integration)).toEqual([
      "contact.created",
      "contact.updated",
      "lead.created",
      "lead.stage_changed",
    ]);
  });

  test("Zoho: the lead status push counts for stage changes", () => {
    const integration = row("zoho", ["lead_updated"]) as any;

    expect(zohoProvider.subscribedEvents(integration)).toContain("lead.stage_changed");
  });

  test("Zoho: with every trigger off, no event is queued at all", async () => {
    db.integration.findMany.mockResolvedValue([row("zoho", [])]);

    await run({ type: "contact.created", contact });

    expect(jobs()).toEqual([]);
  });

  test("GetLead: creates and updates are toggled separately", () => {
    const integration = row("getlead", ["getlead_lead_update"]) as any;

    expect(getLeadProvider.subscribedEvents(integration)).toEqual(["lead.stage_changed"]);
  });

  test("GetLead: an unsubscribed create is not queued", async () => {
    db.integration.findMany.mockResolvedValue([row("getlead", ["getlead_lead_update"])]);

    await run({ ...leadEvent(), type: "lead.created" });

    expect(addGetLeadSyncToQueue).not.toHaveBeenCalled();
  });
});

describe("Zoho adapter", () => {
  test("a new contact becomes a Zoho contact, Bigin contact and Zoho lead", async () => {
    await run({ type: "contact.created", contact });

    expect(jobNames()).toEqual([
      "zoho-contact-create",
      "zoho-bigin-contact-create",
      "zoho-lead-create",
    ]);
    expect(jobs()[2][1].data.Lead_Status).toBe("New");
  });

  test("a lifecycle resolved at create time becomes the lead status", async () => {
    await run({ type: "contact.created", contact, lifecycleName: "Qualified" });

    expect(jobs()[2][1].data.Lead_Status).toBe("Qualified");
  });

  test("a new contact with a lifecycle also opens a Bigin deal", async () => {
    await run({ type: "contact.created", contact: { ...contact, lifecycleId: "lc-1" } });

    expect(jobNames()).toContain("bigin-deal-create");
  });

  test("not connected: nothing is queued for Zoho", async () => {
    connect("getlead");

    await run({ type: "contact.created", contact });

    expect(jobs()).toEqual([]);
  });

  test("a details change updates both mirrored contacts by their ids", async () => {
    await run({ type: "contact.updated", contact, changed: ["details"] });

    expect(jobNames()).toEqual(["zoho-contact-update", "zoho-bigin-contact-update"]);
    expect(jobs()[0][1].data.zohoContactId).toBe("z1");
    expect(jobs()[1][1].data.biginContactId).toBe("b1");
    expect(pushCrmLeadStatus).not.toHaveBeenCalled();
  });

  test("a status-only change sends Zoho nothing", async () => {
    await run({
      type: "contact.updated",
      contact: { ...contact, lifecycleId: "lc-1" },
      changed: ["status"],
    });

    expect(jobs()).toEqual([]);
    expect(pushCrmLeadStatus).not.toHaveBeenCalled();
  });

  test("a lifecycle change goes through the status mapping and moves the Bigin deal", async () => {
    await run({
      type: "contact.updated",
      contact: { ...contact, lifecycleId: "lc-1" },
      changed: ["lifecycle"],
    });

    expect(pushCrmLeadStatus).toHaveBeenCalledWith(
      ORG,
      "zl1",
      { lifecycleId: "lc-1", lifecycleName: "Customer" },
      {},
    );
    expect(jobNames()).toEqual(["zoho-bigin-deal-update"]);
  });

  test("a delete removes both mirrored contacts", async () => {
    await run({ type: "contact.deleted", contact });

    expect(jobs().map((call) => call[1].data)).toEqual([
      { zohoContactId: "z1" },
      { biginContactId: "b1" },
    ]);
  });

  test("a stage change reports the column to the Zoho lead and the Bigin deal", async () => {
    await run(leadEvent());

    expect(pushCrmLeadStatus).toHaveBeenCalledWith(
      ORG,
      "zl1",
      { stageId: "stage-1", stageName: "Qualified" },
      {},
      "lead-1",
    );
    expect(jobs()[0]).toEqual([
      "zoho-bigin-deal-update",
      expect.objectContaining({
        data: expect.objectContaining({ stageId: "stage-1" }),
        rateupLeadId: "lead-1",
        rateupContactId: "c1",
      }),
    ]);
  });

  test("a stage change Zoho made itself is not pushed back", async () => {
    await run(leadEvent({ origin: "integration" }));

    expect(pushCrmLeadStatus).not.toHaveBeenCalled();
    expect(jobNames()).not.toContain("zoho-bigin-deal-update");
  });

  test("a board other than Leads syncs nothing", async () => {
    await run(leadEvent({ stage: { ...leadEvent().stage, pipelineType: "SUPPORT" } }));

    expect(pushCrmLeadStatus).not.toHaveBeenCalled();
    expect(jobs()).toEqual([]);
  });
});

describe("GetLead adapter", () => {
  test("a lead arriving on the board is a create, not a stage change", async () => {
    await run({ ...leadEvent(), type: "lead.created" });

    expect(addGetLeadSyncToQueue).toHaveBeenCalledWith(
      "getlead_lead_create",
      ORG,
      expect.objectContaining({ stageId: "stage-1", stageName: "Qualified" }),
      { rateupLeadId: "lead-1", rateupContactId: "c1" },
    );
  });

  test("a move is an update", async () => {
    await run(leadEvent());

    expect((addGetLeadSyncToQueue as Mock).mock.calls[0][0]).toBe("getlead_lead_update");
  });

  test("a resync still pushes — the CRM must end up on the closing column", async () => {
    await run(leadEvent({ resync: true }));

    expect(addGetLeadSyncToQueue).toHaveBeenCalled();
  });

  test("skips an inbound change and any board other than Leads", async () => {
    await run(leadEvent({ origin: "integration" }));
    await run(leadEvent({ stage: { ...leadEvent().stage, pipelineType: "SUPPORT" } }));

    expect(addGetLeadSyncToQueue).not.toHaveBeenCalled();
  });

  test("not connected: nothing is queued", async () => {
    connect("zoho");

    await run(leadEvent());

    expect(addGetLeadSyncToQueue).not.toHaveBeenCalled();
  });
});

describe("Zapier adapter", () => {
  test("fires without any Integration row — the hook subscriptions decide", async () => {
    connect();

    await run({ type: "contact.created", contact });

    expect(addZapierTriggerToQueue).toHaveBeenCalledWith(
      "new_contact_create",
      { new_contact_create: contact },
      ORG,
    );
  });

  test("a lifecycle-only update is not reported as a contact update", async () => {
    await run({ type: "contact.updated", contact, changed: ["lifecycle"] });

    expect(addZapierTriggerToQueue).not.toHaveBeenCalled();
  });

  test("a status-only update is", async () => {
    await run({ type: "contact.updated", contact, changed: ["status"] });

    expect(addZapierTriggerToQueue).toHaveBeenCalledWith(
      "contact_updated",
      { contact_updated: contact },
      ORG,
    );
  });

  test("a stage change reports the stage, even one Zoho made", async () => {
    await run(leadEvent({ origin: "integration" }));

    expect(addZapierTriggerToQueue).toHaveBeenCalledWith(
      "contact_stage_updated",
      {
        contact_stage_updated: {
          contactId: "c1",
          leadId: "lead-1",
          pipelineId: "p1",
          pipelineName: "Sales",
          pipelineType: "LEADS",
          stageId: "stage-1",
          stageName: "Qualified",
          stageStatus: "OPEN",
        },
      },
      ORG,
    );
  });

  test("a resync moved nothing, and a board-only lead has no contact to key on", async () => {
    await run(leadEvent({ resync: true }));
    await run(leadEvent({ lead: { ...leadEvent().lead, contactId: null }, contact: null }));

    expect(addZapierTriggerToQueue).not.toHaveBeenCalled();
  });
});

describe("outgoing Webhook adapter", () => {
  test("delivers an event the org subscribed to, keyed on the org", async () => {
    db.webhook.findUnique.mockResolvedValue({ events: ["contact.created"] });

    await run({ type: "contact.created", contact });

    expect(enqueueOrgWebhookDispatch).toHaveBeenCalledWith(ORG, "contact.created", { contact });
  });

  test("sends nothing for an event the org did not subscribe to", async () => {
    db.webhook.findUnique.mockResolvedValue({ events: ["message_status"] });

    await run({ type: "contact.created", contact });

    expect(enqueueOrgWebhookDispatch).not.toHaveBeenCalled();
  });
});
