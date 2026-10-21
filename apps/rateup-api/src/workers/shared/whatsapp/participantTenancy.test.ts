import { beforeEach, describe, expect, it, vi } from "vitest";

// MSG-4 / MSG-12: the participant query must take credentials, template and recipients from
// the campaign's org — never from the contact's.
const db = vi.hoisted(() => ({
  $queryRawUnsafe: vi.fn(),
  campaign: { findUnique: vi.fn() },
  campaignDripStage: { findUnique: vi.fn() },
}));
vi.mock("../../../utils/prisma.js", () => ({ default: db }));
vi.mock("../../../utils/db.js", () => ({ default: { connect: vi.fn() } }));
vi.mock("../ws.publisher.js", () => ({ publisher: { publish: vi.fn() }, WS_CHANNEL: "ws" }));
vi.mock("../../../utils/redisConnection.js", () => ({ default: { duplicate: () => ({}) } }));
vi.mock("../../../modules/whatsapp/meta/metaMessage.service.js", () => ({
  sendMetaMessage: vi.fn(),
  metaErrorMessage: vi.fn(),
}));

const { fetchCampaignParticipants, aes_decrypt } = await import("./index.js");

const squash = (sql: string) => sql.replace(/\s+/g, " ");

beforeEach(() => {
  vi.clearAllMocks();
  db.$queryRawUnsafe.mockResolvedValue([]);
  db.campaign.findUnique.mockResolvedValue({ useUserConsent: false });
  db.campaignDripStage.findUnique.mockResolvedValue({ waTemplateId: "tpl-1" });
});

describe("fetchCampaignParticipants tenancy", () => {
  it.each([
    ["a single-template campaign", undefined],
    ["a drip stage", "stage-1"],
  ])("binds settings, template and contacts to the campaign's org for %s", async (_, stage) => {
    await fetchCampaignParticipants("camp-1", undefined, ["PENDING"], stage);

    const sql = squash(db.$queryRawUnsafe.mock.calls[0][0]);
    expect(sql).toContain('JOIN "Team" ct ON ct.id = camp."teamId"');
    expect(sql).toContain('wt."orgId" = ct."orgId"');
    expect(sql).toContain('WHERE was."orgId" = ct."orgId"');
    expect(sql).toContain('AND c."orgId" = ct."orgId"');
    expect(sql).not.toContain('was."orgId" = c."orgId"');
  });
});

describe("aes_decrypt", () => {
  it("is the shared helper, which also reads GCM tokens", async () => {
    const shared = await import("../../../../utils/encryption/encryption.utils.js");
    expect(aes_decrypt).toBe(shared.aes_decrypt);
  });
});
