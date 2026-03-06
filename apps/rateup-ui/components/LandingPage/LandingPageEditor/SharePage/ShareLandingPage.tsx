"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Group, Stack } from "@mantine/core";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useImmerReducer } from "use-immer";

import { useUpdateLandingPageMutation } from "../../../../backend/landingPage/landingPage.query";
import { uploadFile } from "../../../../utils/file-upload/upload";
import { RateupButtonBlue } from "../../../Button/RateupButtons";
import Preview from "../../../Survey/ShareSurvey/Preview/Preview";
import LogoTabpanel from "../../../Survey/ShareSurvey/ShareQR/LogoTabPanel";
import {
  initialLogoTabPanelState,
  logoTabPanelReducer,
} from "../../../Survey/ShareSurvey/ShareQR/LogoTabPanel/LogoTabPanelReducer";
import { useLandingPageObj } from "../LandingPageContext/LandingPageContext";
import styles from "./ShareLandingPage.module.css";

function ShareLandingPage({ url, isPublished, title }) {
  const [logoTabPanelState, logoTabPanelDispatch] = useImmerReducer(
    logoTabPanelReducer,
    initialLogoTabPanelState,
  );
  const translations = useTranslations();
  const params = useParams();
  const shortUrlId = params?.shortUrlId as string;
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
        toast.error(
          translations("Unable to save settings, Please try again later"),
        );
      }
    }
    setIsSavingSettings(false);
  }, [logoTabPanelState]);

  return (
    <Group className={styles["logo-tab-panel-and-qr-container"]}>
      <LogoTabpanel state={logoTabPanelState} dispatch={logoTabPanelDispatch} />

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
            title={translations("Save Settings")}
            onClick={handleSaveOfShareSettings}
          />
        </Stack>
      )}
    </Group>
  );
}

export default ShareLandingPage;
