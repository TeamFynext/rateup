import { Box } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useState } from "react";

import { useEditSurveyMutation } from "@/backend/surveys/surveys.query";

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
  const [debounced] = useDebouncedValue(redirect?.url, 200);

  useEffect(() => {
    setHasGoogleReview(
      survey?.questions?.some(
        (item) =>
          item?.googleReview?.length ||
          !!(item?.reviewPageOptions && Object.keys(item?.reviewPageOptions).length),
      ),
    );
  }, [survey]);
  function validateUrl(url: string) {
    try {
      if (url === "/") return false;
      new URL(url);
      return false;
    } catch {
      return true;
    }
  }

  return (
    <Box className={`${styles["survey-settings-root-div"]}`}>
      <Box className={styles["panels-container"]}>
        <Box className={`${styles["left-panel"]} ${styles["panel"]}`}>
          <GeneralSettings
            enabledModules={enabledModules}
            survey={survey}
            setSelectedLanguage={setSelectedLanguage}
          />

          <SecuritySettings survey={survey} surveyId={surveyId} enabledModules={enabledModules} />
          <WebhookSettings
            responseWebhookEndpoint={survey?.responseWebhookEndpoint}
            editSurvey={editSurvey}
            enabledModules={enabledModules}
          />
        </Box>
        <Box className={`${styles["right-panel"]} ${styles["panel"]}`}>
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
          <GoogleSheetSettings spreadSheetId={survey?.spreadSheetId} />
          <TicketSettings survey={survey} surveyId={surveyId} enabledModules={enabledModules} />
          {enabledModules.includes("flow") && (
            <FlowSettingsUpdate name={flowName} dbFlowId={flowDbId} anonymous={anonymous} />
          )}
        </Box>
      </Box>
      <Box className={styles["other-settings-container"]}>
        <OtherSettings />
      </Box>
    </Box>
  );
};

export default SurveySettings;
