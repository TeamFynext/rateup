import { useCallback, useEffect } from "react";

import { Group, Stack, Title } from "@mantine/core";
import { useTranslations } from "next-intl";
import { useImmerReducer } from "use-immer";

import {
  useGetShareSettings,
  useUpdateShareSettingsMutation,
} from "../../../../backend/surveyShareSettings/surveyShareSettings.query";
import { showErrorToast } from "../../../../utils/notifications";
import { RateupButtonBlue } from "../../../Button/RateupButtons";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import Preview from "../Preview/Preview";
import LogoTabpanel from "./LogoTabPanel";
import {
  initialLogoTabPanelState,
  logoTabPanelReducer,
} from "./LogoTabPanel/LogoTabPanelReducer";
import styles from "./ShareQR.module.css";

interface ShareQRProps {
  url: string;
  sx?: any;
  title: string;
  isPublished: boolean;
  id?: string;
  queryKey?: string;
  resourceName?: string;
}

type ShareQRState = {
  qrBgColor: string;
  qrColor: string;
  logoSize: number;
  logoFillType: string;
  logoBorderRadius: number;
  logoFile: null | File;
};

const ShareQR = ({
  url,
  sx,
  title,
  isPublished,
  id,
  queryKey,
  resourceName,
}: ShareQRProps) => {
  const [logoTabPanelState, logoTabPanelDispatch] = useImmerReducer(
    logoTabPanelReducer,
    initialLogoTabPanelState,
  );

  // currently we are using only two resources(first arg below) survey, menu.
  const shareSettings = useGetShareSettings(queryKey, resourceName, id);
  // useUpdateShareSettingsMutation can return null.
  const shareSettingsMutation = useUpdateShareSettingsMutation(
    queryKey,
    resourceName,
    id,
  );
  const translations = useTranslations();
  useEffect(() => {
    const qrSettingsFromApi = shareSettings?.data;
    if (qrSettingsFromApi) {
      logoTabPanelDispatch({
        type: "update-state-from-api",
        payload: qrSettingsFromApi,
      });
    }
  }, [shareSettings.data]);

  const handleSaveOfSurveyShareSettings = useCallback(async () => {
    if (shareSettingsMutation) {
      const formData = new FormData();
      for (const property in logoTabPanelState) {
        let value = logoTabPanelState[property];
        formData.append(property, value);
      }
      try {
        await shareSettingsMutation.mutateAsync({
          params: {
            resourceName,
            id,
          },
          body: formData,
        });
      } catch (err) {
        showErrorToast(
          translations("Unable to save settings, Please try again later"),
        );
      }
    }
  }, [logoTabPanelState]);

  return (
    <PaperLayout style={{ ...sx }}>
      <>
        <Title order={2} mb="sm" pb="md" className={styles["heading"]}>
          {translations("Generate & Share QR Code")}
        </Title>

        <Group className={styles["options-preview-container"]}>
          <LogoTabpanel
            state={logoTabPanelState}
            dispatch={logoTabPanelDispatch}
          />

          {/*..... QR Editor - Preview ........ */}

          {url && (
            <Stack align="center">
              <Preview
                logoTabPanelState={logoTabPanelState}
                url={url}
                surveyTitle={title}
                isSurveyPublished={isPublished}
              />
              <RateupButtonBlue
                loading={shareSettingsMutation?.isPending}
                title={translations("Save Settings")}
                onClick={handleSaveOfSurveyShareSettings}
              />
            </Stack>
          )}
        </Group>
      </>
    </PaperLayout>
  );
};

export default ShareQR;
