import { z } from "zod";

const createReferralSchema = z.object({
  name: z.string().trim().min(1).max(120),
  // Was any non-empty value, written to a column the operator later uses to
  // contact the influencer.
  email: z.email().max(254),
});

const trackVisitSchema = z.object({
  code: z.string().trim().min(1).max(64),
});

const byIdParamsSchema = z.object({
  id: z.uuid(),
});

export type CreateReferralInput = z.infer<typeof createReferralSchema>;
export type TrackVisitInput = z.infer<typeof trackVisitSchema>;
export type ByIdParams = z.infer<typeof byIdParamsSchema>;

export { createReferralSchema, trackVisitSchema, byIdParamsSchema };
