import { Group, Title, Tabs, Stack } from "@mantine/core";
import React, { useState, useEffect, useCallback } from "react";
import Preview from "../Preview/Preview";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import LogoTabpanel from "./LogoTabPanel";
import styles from "./ShareQR.module.css";
import { RateupButtonBlue } from "../../../Button/RateupButtons";
import {
  useGetShareSettings,
  useUpdateShareSettingsMutation,
} from "../../../../backend/surveyShareSettings/surveyShareSettings.query";
import { getLogoFileValueForFileInput, getLogoSrc } from "./utils";

interface ShareQRProps {
  url: string;
  sx?: any;
  title: string;
  isPublished: boolean;
  id: string;
  queryKey: string;
  resourceName: string;
}

type ShareQRState = {
  qrBgColor: string;
  qrColor: string;
  logoSize: number;
  logoFillType: string;
  logoBorderRadius: number;
  logoFile: null | File;
};

export enum statePropertiesEnum {
  QrBgColor = "qrBgColor",
  QrColor = "qrColor",
  LogoSize = "logoSize",
  LogoFillType = "logoFillType",
  LogoBorderRadius = "logoBorderRadius",
  LogoFile = "logoFile",
}

const ShareQR = ({
  url,
  sx,
  title,
  isPublished,
  id,
  queryKey,
  resourceName,
}: ShareQRProps) => {
  const [state, setState] = useState<ShareQRState>({
    qrBgColor: "#FFFFFF",
    qrColor: "#000000",
    logoSize: 75,
    logoFillType: "contain",
    logoBorderRadius: 50,
    logoFile: null,
  });

  // currently we are using only two resources(first arg below) survey, menu.

  const shareSettings = useGetShareSettings(queryKey, resourceName, id);
  const shareSettingsMutation = useUpdateShareSettingsMutation(
    queryKey,
    resourceName,
    id,
  );

  const {
    qrBgColor,
    qrColor,
    logoSize,
    logoFillType,
    logoBorderRadius,
    logoFile,
  } = state;

  const logoSrc = getLogoSrc(logoFile);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(logoSrc);
    };
  }, []);

  useEffect(() => {
    const qrSettingsFromApi = shareSettings?.data;
    if (qrSettingsFromApi) {
      setState(qrSettingsFromApi);
    }
  }, [shareSettings.data]);

  const updateState = useCallback(
    (stateObjectProperty: statePropertiesEnum) => {
      return (value) => setState({ ...state, [stateObjectProperty]: value });
    },
    [state],
  );

  const handleSaveOfSurveyShareSettings = useCallback(async () => {
    const formData = new FormData();
    for (const property in state) {
      let value = state[property];
      formData.append(property, value);
    }

    await shareSettingsMutation.mutateAsync({
      params: {
        resourceName,
        id,
      },
      body: formData,
    });
  }, [state]);

  const handleSelectLogoFileInputChange = (value) => {
    if (value) {
      updateState(statePropertiesEnum.LogoFile)(value);
    } else {
      const logoLink = shareSettings.data?.logoFile;
      if (logoLink) {
        updateState(statePropertiesEnum.LogoFile)(logoLink);
      } else {
        updateState(statePropertiesEnum.LogoFile)(`/images/rateup-star.svg`);
      }
    }
  };

  return (
    <PaperLayout shadow="sm" p="xl" style={{ ...sx }}>
      <>
        <Title order={1} mb="sm" pb="md" className={styles["heading"]}>
          Generate & Share QR Code
        </Title>

        <Group className={styles["options-preview-container"]}>
          <LogoTabpanel
            logoFillType={logoFillType}
            qrBgColor={qrBgColor}
            qrColor={qrColor}
            logoSize={logoSize}
            logoBorderRadius={logoBorderRadius}
            updateStateFunc={updateState}
            selectLogoFileInputValue={getLogoFileValueForFileInput(logoFile)}
            onSelectLogoFileInputChange={handleSelectLogoFileInputChange}
          />

          {/*..... QR Editor - Preview ........ */}

          {url && (
            <Stack align="center">
              <Preview
                url={url}
                qrBgImgLogo={logoSrc}
                qrBgImgFillType={logoFillType}
                qrBgColor={qrBgColor}
                qrColor={qrColor}
                surveyTitle={title}
                isSurveyPublished={isPublished}
                logoSize={logoSize}
                logoBorderRadius={logoBorderRadius}
              />
              <RateupButtonBlue
                loading={shareSettingsMutation.isPending}
                title="Save Settings"
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
