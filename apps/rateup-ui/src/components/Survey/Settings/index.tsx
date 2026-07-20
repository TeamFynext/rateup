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
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <GeneralSettings
          enabledModules={enabledModules}
          survey={survey}
          setSelectedLanguage={setSelectedLanguage}
        />

        <SecuritySettings survey={survey} surveyId={surveyId} enabledModules={enabledModules} />

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

        <WebhookSettings
          responseWebhookEndpoint={survey?.responseWebhookEndpoint}
          editSurvey={editSurvey}
          enabledModules={enabledModules}
        />

        {survey?.spreadSheetId && <GoogleSheetSettings spreadSheetId={survey?.spreadSheetId} />}

        {enabledModules.includes("tickets") && (
          <TicketSettings survey={survey} surveyId={surveyId} enabledModules={enabledModules} />
        )}

        {enabledModules.includes("flow") && (
          <FlowSettingsUpdate name={flowName} dbFlowId={flowDbId} anonymous={anonymous} />
        )}

        <div className="rounded-xl border border-red-200 bg-red-50 shadow-none [&_.mantine-Paper-root]:border-none [&_.mantine-Paper-root]:bg-transparent [&_.mantine-Paper-root]:shadow-none">
          <OtherSettings />
        </div>
      </div>
    </div>
  );
};

export default SurveySettings;
