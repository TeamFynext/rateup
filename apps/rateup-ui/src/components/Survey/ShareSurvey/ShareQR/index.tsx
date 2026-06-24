import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useImmerReducer } from "use-immer";

import {
  useGetShareSettings,
  useUpdateShareSettingsMutation,
} from "@/backend/surveyShareSettings/surveyShareSettings.query";
import { Button } from "@/components/ui/button.tsx";

import Preview from "../Preview/Preview.tsx";
import LogoTabpanel from "./LogoTabPanel/index.tsx";
import {
  initialLogoTabPanelState,
  logoTabPanelReducer,
} from "./LogoTabPanel/LogoTabPanelReducer.tsx";

interface ShareQRProps {
  url: string;
  sx?: any;
  title: string;
  isPublished: boolean;
  id?: string;
  queryKey?: string;
  resourceName?: string;
}

const ShareQR = ({ url, sx, title, isPublished, id, queryKey, resourceName }: ShareQRProps) => {
  const [logoTabPanelState, logoTabPanelDispatch] = useImmerReducer(
    logoTabPanelReducer,
    initialLogoTabPanelState,
  );

  // currently we are using only two resources(first arg below) survey, menu.
  const shareSettings = useGetShareSettings(queryKey, resourceName, id);
  // useUpdateShareSettingsMutation can return null.
  const shareSettingsMutation = useUpdateShareSettingsMutation(queryKey, resourceName, id);
  const { t: translations } = useTranslation();
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

        if (typeof value === "number") {
          value = value.toString();
        }

        if (typeof value === "boolean") {
          value = value ? "true" : "false";
        }

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
      } catch {
        toast.error(translations("Unable to save settings, Please try again later"));
      }
    }
  }, [logoTabPanelState]);

  return (
    <div className="bg-white dark:bg-[#121212] rounded-lg border dark:border-gray-700 p-6">
      <h2 className="text-base font-semibold mb-6 dark:text-white">QR Code</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LogoTabpanel state={logoTabPanelState} dispatch={logoTabPanelDispatch} />
        <div className="flex flex-col gap-4">
          <div className="border dark:border-gray-700 rounded-lg flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-[#1a1a1a] gap-2">
            <Preview
              logoTabPanelState={logoTabPanelState}
              url={url}
              surveyTitle={title}
              isSurveyPublished={isPublished}
            />
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={handleSaveOfSurveyShareSettings}
              disabled={shareSettingsMutation ? shareSettingsMutation.isPending : false}
            >
              {shareSettingsMutation?.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {translations("Saving...")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {translations("Save")}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareQR;
