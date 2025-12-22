"use client";

import { useCallback, useEffect } from "react";

import { Palette, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useImmerReducer } from "use-immer";

import { Button } from "@/components/ui/button";

import {
  useGetShareSettings,
  useUpdateShareSettingsMutation,
} from "../../../../backend/surveyShareSettings/surveyShareSettings.query";
import { showErrorToast } from "../../../../utils/notifications";
import Preview from "../Preview/Preview";
import LogoTabpanel from "./LogoTabPanel";
import {
  initialLogoTabPanelState,
  logoTabPanelReducer,
} from "./LogoTabPanel/LogoTabPanelReducer";

interface ShareQRProps {
  url: string;
  sx?: any;
  title: string;
  isPublished: boolean;
  id?: string;
  queryKey?: string;
  resourceName?: string;
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
    <div>
      <div className="flex items-center gap-1.5 py-1.5 mb-2">
        <Palette className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">
          {translations("Customize & Generate QR Code")}
        </h2>
      </div>
      <div className="flex gap-4">
        <LogoTabpanel
          state={logoTabPanelState}
          dispatch={logoTabPanelDispatch}
        />
        <div className="p-2">
          <div className="border p-3 rounded-lg flex flex-col gap-2 w-full">
            <Preview
              logoTabPanelState={logoTabPanelState}
              url={url}
              surveyTitle={title}
              isSurveyPublished={isPublished}
            />
            <Button
              onClick={handleSaveOfSurveyShareSettings}
              className="disabled:opacity-50"
              disabled={shareSettingsMutation?.isPending}
            >
              <Save />
              {translations("Save Settings")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareQR;
