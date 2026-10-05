/** The wizard's steps, in order. `id` is what rides in `?step=`. */
export const CAMPAIGN_WIZARD_STEPS = [
  "basics",
  "template",
  "audience",
  "schedule",
  "retries",
  "review",
] as const;

export type CampaignWizardStep = (typeof CAMPAIGN_WIZARD_STEPS)[number];

export function isCampaignWizardStep(value: unknown): value is CampaignWizardStep {
  return typeof value === "string" && (CAMPAIGN_WIZARD_STEPS as readonly string[]).includes(value);
}
