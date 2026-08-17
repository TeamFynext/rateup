import { formatDateT1 } from "../../date.js";
import {
  formatAmountPaid,
  renderSubscriptionActivatedEmail,
  renderTrialStartedEmail,
} from "../react/templates.js";

export function createEmailBodySubscriptionActivated(
  plan: string,
  validity: Date,
  isRenewed: boolean = false,
  /** Minor units (paise/cents) as the payment provider reports them. */
  paid?: { amountMinor: number; currency?: string },
) {
  return renderSubscriptionActivatedEmail({
    planName: plan,
    validUntil: formatDateT1(validity),
    isRenewed,
    amountPaid: formatAmountPaid(paid?.amountMinor, paid?.currency),
  });
}

export function createEmailBodyTrialSubscriptionActivated(
  plan: {
    trialDays: number;
    displayName: string | null;
    paymentPlan?: { amount: number; period: string } | null;
  },
  expiresAt: string,
  userName: string,
) {
  const { amount, period } = plan.paymentPlan ?? {};
  return renderTrialStartedEmail({
    userName,
    planName: plan.displayName ?? "RateUp",
    trialDays: plan.trialDays,
    expiresAt,
    renewalPrice: amount === undefined ? undefined : `${amount} / ${period}`,
  });
}
