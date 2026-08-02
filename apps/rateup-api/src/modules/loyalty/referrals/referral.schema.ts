import z from "zod";

export const trackReferralSchema = z.object({
  referralCode: z.string().min(1, "Referral code is required"),
  refereeContactId: z.string().min(1, "Referee contact ID is required"),
});

export const completeReferralSchema = z.object({
  referralId: z.string().min(1),
  // `purchaseAmount` is gone. It was accepted here, passed through the controller,
  // named `_purchaseAmount` in the service and never read — the signature promised
  // a purchase-triggered reward that the code does not implement, and the whole
  // bonus is paid at trackReferral time. See issues.txt 20.41.
});

export const referrerIdParamSchema = z.object({
  referrerId: z.string(),
});

export type TrackReferralInput = z.infer<typeof trackReferralSchema>;
export type CompleteReferralInput = z.infer<typeof completeReferralSchema>;
export type ReferrerIdParam = z.infer<typeof referrerIdParamSchema>;
