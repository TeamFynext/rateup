import { renderPaymentFailedEmail } from "../react/templates.js";

export function paymentFailed(isRenewal: boolean = false) {
  return renderPaymentFailedEmail(isRenewal);
}
