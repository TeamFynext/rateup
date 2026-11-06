import { formatDateT1 } from "../../date.js";
import { formatAmountPaid, renderSubscriptionActivatedEmail } from "../react/templates.js";

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
