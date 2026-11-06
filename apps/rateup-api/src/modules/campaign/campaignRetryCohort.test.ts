import { describe, expect, it, vi, type Mock } from "vitest";

vi.mock("../../utils/prisma.js", () => ({
  default: {
    campaignParticipant: { count: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));

import prisma from "../../utils/prisma.js";
import { countInFlightParticipants, SENT_SETTLES_AFTER_HOURS } from "./campaignRetryCohort.js";

const count = prisma.campaignParticipant.count as unknown as Mock;

describe("countInFlightParticipants", () => {
  it("counts PENDING always, and SENT only while it is younger than the cutoff", async () => {
    count.mockResolvedValue(3);
    const now = new Date("2026-09-14T12:00:00Z");

    await expect(countInFlightParticipants("camp-1", now)).resolves.toBe(3);

    const where = count.mock.calls[0][0].where;
    expect(where.campaignId).toBe("camp-1");
    expect(where.OR[0]).toEqual({ status: "PENDING" });
    expect(where.OR[1].status).toBe("SENT");
    // 24h before `now`: a message sent on Friday no longer holds Monday's campaign.
    const cutoff = where.OR[1].OR[1].sentAt.gt as Date;
    expect(now.getTime() - cutoff.getTime()).toBe(SENT_SETTLES_AFTER_HOURS * 60 * 60 * 1000);
    // ...but a SENT row that was never stamped is still treated as fresh.
    expect(where.OR[1].OR[0]).toEqual({ sentAt: null });
  });
});
