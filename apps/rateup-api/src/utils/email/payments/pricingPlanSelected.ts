import { renderPricingPlanSelectedEmail } from "../react/templates.js";

export function createEmailBodyPricingPlanSelected(data: {
  name: string;
  email: string;
  orgName?: string;
  planName: string;
}) {
  return renderPricingPlanSelectedEmail(data);
}
