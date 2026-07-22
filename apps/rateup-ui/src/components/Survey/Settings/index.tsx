import { useEffect, useState } from "react";

import { useEditSurveyMutation } from "@/backend/surveys/surveys.query";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { cn } from "@/lib/utils";

import FlowSettingsUpdate from "./FlowSettingsUpdate.tsx";
import GeneralSettings from "./GeneralSettings/index.tsx";
import GoogleSheetSettings from "./GoogleSheetSettings.tsx";
import KioskFetchLocSkipPreview from "./KioskFetchLocSkipPreview/index.tsx";
import OtherSettings from "./OtherSettings.tsx";
import RedirectSettings from "./RedirectSettings/index.tsx";
import SecuritySettings from "./SecuritySettings/index.tsx";
import TicketSettings from "./TicketSettings.tsx";
import WebhookSettings from "./WebhookSettings.tsx";

import styles from "./SurveySettings.module.css";

const defaultEnabledModules = [
  "name",
  "password",
  "language",
  "kiosk",
  "teams",
  "preview",
  "location",
  "enableNotificationEmail",
  "notificationEmail",
  "endtoendencryption",
  "redirect",
  "tickets",
  "uniqueDeviceResponse",
];

interface SurveySettingsProps {
  surveyId: string;
  survey: any;
  enabledModules?: string[];
  setSelectedLanguage?: (lang: string) => void;
  flowName?: string;
  flowDbId?: string;
  anonymous?: boolean;
}

const SurveySettings = ({
  surveyId,
  survey,
  enabledModules = defaultEnabledModules,
  setSelectedLanguage = null,
  flowName,
  flowDbId,
  anonymous,
}: SurveySettingsProps) => {
  const [kioskMode, setKioskMode] = useState(survey?.kioskMode);
  const [preview, setPreview] = useState(survey?.skipPreview);
  const [location, setLocation] = useState(survey?.getLocation);
  const [webSurveyAutoTransitionToNextQues, setwebSurveyAutoTransitionToNextQues] = useState(
    survey?.webSurveyAutoTransitionToNextQues,
  );
  const [hasGoogleReview, setHasGoogleReview] = useState(false);
  const [redirect, setRedirect] = useState(survey?.redirect);
  const [redirectError, setRedirectError] = useState({ url: "", time: "" });
  const editSurvey = useEditSurveyMutation(surveyId);
  const debounced = useDebounce(redirect?.url, 200);

  useEffect(() => {
    setHasGoogleReview(
      survey?.questions?.some(
        (item) =>
          item?.googleReview?.length ||
          !!(item?.reviewPageOptions && Object.keys(item?.reviewPageOptions).length),
      ),
    );
  }, [survey]);

  return (
    <div
      className={cn(
        styles["survey-settings-root-div"],
        "min-h-full overflow-auto bg-muted px-[22px] py-6",
      )}
    >
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4">
        {/* Two columns of three, each stacking its own cards so a tall card never
            leaves a gap beside a short one (as it would with a plain grid flow).
            Split so the two columns end up roughly the same height: the two
            tallest cards (General, Behaviour) are balanced against the three
            shorter ones on the right. */}
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <GeneralSettings
              enabledModules={enabledModules}
              survey={survey}
              setSelectedLanguage={setSelectedLanguage}
            />

            <KioskFetchLocSkipPreview
              enabledModules={enabledModules}
              kioskMode={kioskMode}
              setKioskMode={setKioskMode}
              editSurvey={editSurvey}
              hasGoogleReview={hasGoogleReview}
              location={location}
              setLocation={setLocation}
              preview={preview}
              setPreview={setPreview}
              webSurveyAutoTransitionToNextQues={webSurveyAutoTransitionToNextQues}
              setwebSurveyAutoTransitionToNextQues={setwebSurveyAutoTransitionToNextQues}
              survey={survey}
              surveyId={surveyId}
            />

            <WebhookSettings
              responseWebhookEndpoint={survey?.responseWebhookEndpoint}
              editSurvey={editSurvey}
              enabledModules={enabledModules}
            />
          </div>

          <div className="flex flex-col gap-4">
            <SecuritySettings survey={survey} surveyId={surveyId} enabledModules={enabledModules} />

            <RedirectSettings
              enabledModules={enabledModules}
              kioskMode={kioskMode}
              editSurvey={editSurvey}
              redirect={redirect}
              setRedirect={setRedirect}
              debounced={debounced}
              redirectError={redirectError}
              setRedirectError={setRedirectError}
              survey={survey}
            />

            {enabledModules.includes("tickets") && (
              <TicketSettings survey={survey} surveyId={surveyId} enabledModules={enabledModules} />
            )}

            {survey?.spreadSheetId && <GoogleSheetSettings spreadSheetId={survey?.spreadSheetId} />}

            {enabledModules.includes("flow") && (
              <FlowSettingsUpdate name={flowName} dbFlowId={flowDbId} anonymous={anonymous} />
            )}
          </div>
        </div>

        <OtherSettings />
      </div>
    </div>
  );
};

export default SurveySettings;
