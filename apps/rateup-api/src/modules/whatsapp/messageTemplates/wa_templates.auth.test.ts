import { describe, expect, test, vi } from "vitest";

import {
  verifyMessageMonthlyLimitRestriction,
  verifyTemplateMessageLimit,
} from "./wa_templates.auth.js";

function reply() {
  const rep: any = { code: vi.fn(() => rep), send: vi.fn(() => rep) };
  return rep;
}

describe("verifyMessageMonthlyLimitRestriction", () => {
  // NOTE: pins current behaviour. The entire body of this preHandler is commented
  // out behind a "TODO: re-check", so it is a no-op that lets every request past.
  // It is the preHandler on POST /api/wa/templates/send/:templateId
  // (wa_templates.route.ts:128) and on POST /api/wa/flows/:dbFlowId/send
  // (flow.route.ts:205) — the two routes that send billable template messages. So
  // the monthly and annual message limits are enforced on neither.
  // See issues.txt 14.1.
  test("lets an org past without looking at anything at all", async () => {
    const rep = reply();

    await expect(
      verifyMessageMonthlyLimitRestriction({ user: { orgId: "org-1" } } as any, rep),
    ).resolves.toBeUndefined();

    expect(rep.code).not.toHaveBeenCalled();
    expect(rep.send).not.toHaveBeenCalled();
  });

  test("does not even need a request to work with", async () => {
    const rep = reply();

    await expect(verifyMessageMonthlyLimitRestriction({} as any, rep)).resolves.toBeUndefined();

    expect(rep.code).not.toHaveBeenCalled();
  });
});

describe("verifyTemplateMessageLimit", () => {
  // NOTE: the helper the preHandler above used to call. Also entirely commented
  // out, so it accepts any subscription — including none — without complaint.
  // See issues.txt 14.1.
  test("accepts an org with no subscription at all", async () => {
    await expect(verifyTemplateMessageLimit(null)).resolves.toBeUndefined();
  });

  test("accepts an org far past any plausible message limit", async () => {
    await expect(
      verifyTemplateMessageLimit({
        orgId: "org-1",
        isAnnualMessageLimit: true,
        features: { whatsapp: { count: { monthlyMessageLimit: 1 } } },
      }),
    ).resolves.toBeUndefined();
  });
});
