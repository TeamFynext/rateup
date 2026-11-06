import type { CampaignWizardState } from "../useCampaignWizard.ts";

/**
 * What every step receives.
 *
 * `registerSubmit` is how a step tells the shell's footer what "Next" means for
 * it — usually "validate this form, save it, advance". The shell owns the button
 * so the footer stays in one place rather than being redrawn per step.
 */
export interface CampaignWizardStepProps {
  wizard: CampaignWizardState;
  registerSubmit: (submit: () => void | Promise<void>) => void;
}
