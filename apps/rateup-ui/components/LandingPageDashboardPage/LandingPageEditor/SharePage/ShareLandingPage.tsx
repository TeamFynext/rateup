import { useCallback, useEffect, useState } from "react";
import LogoTabpanel from "../../../Survey/ShareSurvey/ShareQR/LogoTabPanel";
import { Group, Stack } from "@mantine/core";
import { RateupButtonBlue } from "../../../Button/RateupButtons";
import Preview from "../../../Survey/ShareSurvey/Preview/Preview";
import styles from "./ShareLandingPage.module.css";
import { useUpdateLandingPageMutation } from "../../../../backend/landingPage/landingPage.query";
import { useRouter } from "next/router";
import { uploadFile } from "../../../../utils/file-upload/upload";
import { useImmerReducer } from "use-immer";
import {
  initialLogoTabPanelState,
  logoTabPanelReducer,
} from "../../../Survey/ShareSurvey/ShareQR/LogoTabPanel/LogoTabPanelReducer";
import { showErrorToast } from "../../../../utils/notifications";
import { useLandingPageObj } from "../LandingPageContext/LandingPageContext";

function ShareLandingPage({ url, isPublished, title }) {
  const [logoTabPanelState, logoTabPanelDispatch] = useImmerReducer(
    logoTabPanelReducer,
    initialLogoTabPanelState,
  );

  const {
    query: { shortUrlId },
  } = useRouter();
  const { mutateAsync: landingPageUpdateMutateAsync } =
    useUpdateLandingPageMutation(shortUrlId);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const { shareSettings } = useLandingPageObj();

  useEffect(() => {
    if (shareSettings) {
      logoTabPanelDispatch({
        type: "update-state-from-api",
        payload: shareSettings,
      });
    }
  }, [shareSettings]);

  const handleSaveOfShareSettings = useCallback(async () => {
    setIsSavingSettings(true);
    if (landingPageUpdateMutateAsync) {
      const newState = { ...logoTabPanelState };
      if (newState?.logoFile instanceof File) {
        const uploadedFileKey = await uploadFile(newState.logoFile);
        newState["logoFile"] =
          `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${uploadedFileKey}`;
      }
      const formData = new FormData();
      for (const property in newState) {
        let value = newState[property];
        formData.append(property, value);
      }
      try {
        await landingPageUpdateMutateAsync({
          shortUrlId,
          shareSettings: newState,
        });
      } catch (err) {
        showErrorToast("Unable to save settings, Please try again later");
      }
    }
    setIsSavingSettings(false);
  }, [logoTabPanelState]);

  return (
    <Group className={styles["logo-tab-panel-and-qr-container"]}>
      <LogoTabpanel
        state={logoTabPanelState}
        dispatch={logoTabPanelDispatch}
        shareSettings={shareSettings}
      />

      {url && (
        <Stack align="center">
          {/* Qr Preview */}
          <Preview
            logoTabPanelState={logoTabPanelState}
            url={url}
            surveyTitle={title}
            isSurveyPublished={isPublished}
          />
          <RateupButtonBlue
            loading={isSavingSettings}
            title="Save Settings"
            onClick={handleSaveOfShareSettings}
          />
        </Stack>
      )}
    </Group>
  );
}

export default ShareLandingPage;
