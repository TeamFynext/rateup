import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../../utils/logger.js", () => ({
  log: { error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const integration = { findUnique: vi.fn() };
const leadActivity = { create: vi.fn() };
vi.mock("../../../../utils/prisma.js", () => ({
  default: { integration, leadActivity, contact: {}, lead: {} },
}));

const queueAdd = vi.fn();
vi.mock("../../../../workers/bullmq/queues/index.js", () => ({
  integrationTriggerQueue: { add: (...a: unknown[]) => queueAdd(...a) },
  zapierTriggerQueue: { add: vi.fn() },
}));

vi.mock("../../../pipeline/pipelineLead/lead.service.js", () => ({
  moveLead: vi.fn(),
  resolvePipelineForContact: vi.fn(),
  setContactStage: vi.fn(),
}));

const { pushCrmLeadStatus } = await import("./zoho.crm.js");

const MAPPED = [{ stageId: "stage-1", stageName: "Qualified", zohoLeadStatus: "Qualified Lead" }];

function credentialWith(mappings: unknown[]) {
  integration.findUnique.mockResolvedValue({
    credential: { crm: { leadLifecycleMappings: mappings } },
  });
}

/** The single activity written, or undefined if none was. */
const written = () => leadActivity.create.mock.calls[0]?.[0]?.data;

beforeEach(() => {
  vi.clearAllMocks();
  leadActivity.create.mockResolvedValue({});
  queueAdd.mockResolvedValue({});
});

describe("pushCrmLeadStatus on the lead timeline", () => {
  test("records a sync naming the status it pushed", async () => {
    credentialWith(MAPPED);

    await pushCrmLeadStatus(
      "org-1",
      "zoho-lead-1",
      { stageId: "stage-1", stageName: "Qualified" },
      {},
      "lead-1",
    );

    expect(written()).toMatchObject({
      leadId: "lead-1",
      userId: null,
      type: "INTEGRATION_SYNCED",
      details: {
        automated: true,
        integrationName: "Zoho CRM",
        externalId: "zoho-lead-1",
        toStageName: "Qualified Lead",
      },
    });
  });

  test("flags an unmapped column as synced-without-status", async () => {
    // A column the org never mapped pushes no Lead_Status, which used to be a
    // warn line only. It is a mapping gap the org has to fix, so it belongs on
    // the timeline rather than in the logs.
    credentialWith([{ stageId: "other", zohoLeadStatus: "Something" }]);

    await pushCrmLeadStatus(
      "org-1",
      "zoho-lead-1",
      { stageId: "stage-1", stageName: "Qualified" },
      {},
      "lead-1",
    );

    expect(written().details).toMatchObject({
      integrationName: "Zoho CRM",
      statusRejected: true,
    });
  });

  test("writes nothing when the caller has no lead — a contact has no timeline", async () => {
    credentialWith(MAPPED);

    await pushCrmLeadStatus("org-1", "zoho-lead-1", { stageId: "stage-1", stageName: "Qualified" });

    expect(leadActivity.create).not.toHaveBeenCalled();
    // The push itself still happens; only the timeline entry is skipped.
    expect(queueAdd).toHaveBeenCalled();
  });

  test("a failed timeline write never fails the push that already happened", async () => {
    credentialWith(MAPPED);
    leadActivity.create.mockRejectedValue(new Error("db down"));

    await expect(
      pushCrmLeadStatus(
        "org-1",
        "zoho-lead-1",
        { stageId: "stage-1", stageName: "Qualified" },
        {},
        "lead-1",
      ),
    ).resolves.toBeUndefined();
  });

  test("records nothing when the org has no Zoho integration", async () => {
    integration.findUnique.mockResolvedValue(null);

    await pushCrmLeadStatus(
      "org-1",
      "zoho-lead-1",
      { stageId: "stage-1", stageName: "Qualified" },
      {},
      "lead-1",
    );

    expect(leadActivity.create).not.toHaveBeenCalled();
  });
});
