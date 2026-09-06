import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AudiencePicker, AudienceTabs } from "@/components/Campaign/audience/AudiencePicker.tsx";
import { CampaignParticipantSource } from "@/types/enums.ts";

import type { CampaignWizardStepProps } from "./step.types.ts";

/**
 * Who the campaign goes to.
 *
 * Optional: a draft can be saved with no audience and the recipients added
 * later from the detail page, which is how campaigns were built before the
 * wizard existed. "Next" therefore advances whether or not anything is selected,
 * and the step says so rather than leaving someone hunting for a skip link.
 */
export function AudienceStep({ wizard, registerSubmit }: Readonly<CampaignWizardStepProps>) {
  const { t } = useTranslation("campaign.wizard");
  const { campaign } = wizard;
  // Held here rather than in the picker so the tabs can sit beside the heading,
  // which is where the design puts them.
  const [tab, setTab] = useState<CampaignParticipantSource>(CampaignParticipantSource.INDIVIDUAL);

  // The picker holds its selection in local state and only writes it when its
  // commit runs, so the step's Next has to be that commit. It used to be a bare
  // `goNext()`, on the belief that the picker enrolled each contact as it was
  // ticked — it does not, and everything picked here was thrown away on the way
  // to the next step.
  const commitRef = useRef<(() => Promise<boolean>) | null>(null);
  const handleSubmitChange = useCallback((submit: (() => Promise<boolean>) | null) => {
    commitRef.current = submit;
  }, []);

  useEffect(() => {
    registerSubmit(async () => {
      const commit = commitRef.current;
      // Nothing selected. The step is optional, so this is someone choosing to
      // add recipients later, not a failure — move on without a warning.
      if (!commit) {
        wizard.continueAfterSave();
        return;
      }
      if (await commit()) wizard.continueAfterSave();
    });
  }, [registerSubmit, wizard]);

  if (!campaign) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-8 pt-6 pb-5">
      <div className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-xl font-bold tracking-tight">
            {t("Who should receive this?")}
          </h1>
          <p className="text-muted-foreground text-[13px]">
            {t("Pick contacts, saved groups, or reuse the audience of a past campaign.")}
          </p>
        </div>
        <AudienceTabs value={tab} onChange={setTab} />
      </div>

      {/* The picker owns the two panels — available on the left, selected on the
          right — so this step and the detail page's dialog cannot drift apart. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <AudiencePicker
          campaign={campaign}
          campaignType={campaign.type}
          onSubmitChange={handleSubmitChange}
          tab={tab}
          onTabChange={setTab}
        />
      </div>

      <p className="text-muted-foreground/70 text-center text-[12.5px]">
        {t("Optional — you can add recipients after saving.")}
      </p>
    </div>
  );
}
