import { Group, Stack } from "@mantine/core";
import { useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useImmerReducer } from "use-immer";

import { useUpdateLinktreeMutation } from "@/backend/linktree/linktree.query";
import { uploadFile } from "@/utils/file-upload/upload.ts";

import { RateupButtonBlue } from "../../../Button/RateupButtons.tsx";
import Preview from "../../../Survey/ShareSurvey/Preview/Preview.tsx";
import LogoTabpanel from "../../../Survey/ShareSurvey/ShareQR/LogoTabPanel/index.tsx";
import {
  initialLogoTabPanelState,
  logoTabPanelReducer,
} from "../../../Survey/ShareSurvey/ShareQR/LogoTabPanel/LogoTabPanelReducer.tsx";
import { useLinktreeObj } from "../LinktreeContext/LinktreeContext.tsx";

import styles from "./ShareLinktree.module.css";

function ShareLinktree({ url, isPublished, title }) {
  const [logoTabPanelState, logoTabPanelDispatch] = useImmerReducer(
    logoTabPanelReducer,
    initialLogoTabPanelState,
  );

  const params = useParams({
    strict: false,
  });
  const shortUrlId = params?.shortUrlId as string;
  const { mutateAsync: linktreeUpdateMutateAsync } = useUpdateLinktreeMutation(shortUrlId);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const { shareSettings } = useLinktreeObj();

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
    if (linktreeUpdateMutateAsync) {
      const newState = { ...logoTabPanelState };
      if (newState?.logoFile instanceof File) {
        const uploadedFileKey = await uploadFile(newState.logoFile);
        newState["logoFile"] = `${import.meta.env.VITE_AWS_CLOUDFRONT_URL}${uploadedFileKey}`;
      }
      const formData = new FormData();
      for (const property in newState) {
        const value = newState[property];
        formData.append(property, value);
      }
      try {
        await linktreeUpdateMutateAsync({
          shortUrlId,
          shareSettings: newState,
        });
      } catch {
        toast.error("Unable to save settings, Please try again later");
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
            title="Save Settings"
            onClick={handleSaveOfShareSettings}
          />
        </Stack>
      )}
    </Group>
  );
}

export default ShareLinktree;
