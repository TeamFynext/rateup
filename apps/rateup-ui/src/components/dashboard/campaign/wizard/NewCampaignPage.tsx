import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import type { StepperStep } from "@/components/ui/stepper.tsx";
import { CampaignStatus, CampaignType } from "@/types/enums.ts";

import { CampaignWizardShell } from "./CampaignWizardShell.tsx";
import { BasicsForm } from "./steps/BasicsStep.tsx";
import { CAMPAIGN_WIZARD_STEPS, STEP_LABELS } from "./useCampaignWizard.ts";

/**
 * Step one, on its own route.
 *
 * Only Basics is rendered here — everything after it saves against a campaign
 * id, and there is no campaign yet. But it wears the full wizard chrome,
 * including the step rail: someone landing on "Create campaign" should be able
 * to see that it is a six-step flow and roughly what is coming, and step one was
 * otherwise the only screen in the wizard that did not show its own position.
 *
 * Submitting creates the `DRAFT` and hands over to `/edit`, from which point the
 * flow is resumable and every step writes as it goes.
 */
export function NewCampaignPage() {
  const { t } = useTranslation("campaign.wizard");
  const navigate = useNavigate();
  const [type, setType] = useState<CampaignType>(CampaignType.WHATSAPP);
  const [isCreating, setIsCreating] = useState(false);

  const submitRef = useRef<() => void | Promise<void>>(() => {});
  const registerSubmit = useCallback((submit: () => void | Promise<void>) => {
    submitRef.current = submit;
  }, []);

  // Where a successful create lands. "Save & exit" runs the same submit as Next
  // — on this step saving *is* creating the draft — and only differs in where it
  // goes afterwards. A ref, not state, so the value is already in place by the
  // time the submit it guards resolves.
  const exitAfterCreate = useRef(false);
  const saveAndExit = useCallback(async () => {
    exitAfterCreate.current = true;
    try {
      await submitRef.current();
    } finally {
      // An invalid form keeps the user here, so Next must not inherit this.
      exitAfterCreate.current = false;
    }
  }, []);

  const steps = useMemo<StepperStep[]>(
    () =>
      CAMPAIGN_WIZARD_STEPS.filter((id) => !(type === CampaignType.DRIP && id === "retries")).map(
        (id) => ({
          id,
          label: STEP_LABELS[id],
          complete: false,
          // Nothing after Basics can be reached until the draft exists, because
          // every later step saves against a campaign id.
          enabled: id === "basics",
        }),
      ),
    [type],
  );

  return (
    <CampaignWizardShell
      title={type === CampaignType.DRIP ? t("New drip") : t("New broadcast")}
      steps={steps}
      currentStep="basics"
      onBack={undefined}
      canGoBack={false}
      onNext={() => void submitRef.current()}
      onSaveAndExit={() => void saveAndExit()}
      showNext
      isBusy={isCreating}
      scrollBody
    >
      <div className="flex w-full justify-center px-8 pt-12 pb-8">
        <BasicsForm
          defaults={{ name: "", teamId: "", type: CampaignType.WHATSAPP }}
          status={CampaignStatus.DRAFT}
          registerSubmit={registerSubmit}
          onTypeChange={setType}
          onPendingChange={setIsCreating}
          onCreated={(campaignId) => {
            // Same rule as the rest of the wizard: silent on Next, said out loud
            // when leaving, because the page that would show it is going away.
            if (exitAfterCreate.current)
              toast.success(t("Draft saved"), { id: "campaign-wizard-save" });
            return void (exitAfterCreate.current
              ? navigate({ to: "/dashboard/campaign" })
              : navigate({
                  to: "/dashboard/campaign/$campaignId/edit",
                  params: { campaignId },
                  search: { step: "template" },
                }));
          }}
        />
      </div>
    </CampaignWizardShell>
  );
}
