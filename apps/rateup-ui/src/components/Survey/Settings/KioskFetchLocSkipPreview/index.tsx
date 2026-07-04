import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

import PaperLayout from "../../../styled/Layouts/PaperLayout.tsx";
import UniqueDeviceSettings from "../UniqueDeviceSettings.tsx";
import {
  updateGetLocation,
  updateKioskMode,
  updateSkipPreview,
  updatewebSurveyAutoTransitionToNextQues,
} from "../updateSettings.ts";

function KioskFetchLocSkipPreview({
  enabledModules,
  kioskMode,
  setKioskMode,
  editSurvey,
  hasGoogleReview,
  location,
  setLocation,
  preview,
  setPreview,
  survey,
  surveyId,
  webSurveyAutoTransitionToNextQues,
  setwebSurveyAutoTransitionToNextQues,
}) {
  const { t: translations } = useTranslation();
  useEffect(() => {
    if (hasGoogleReview && kioskMode) updateKioskMode(setKioskMode, editSurvey);
  }, [hasGoogleReview, kioskMode]);
  return (
    <>
      {enabledModules.some((data) =>
        ["kiosk", "location", "preview", "uniqueDeviceResponse"].includes(data),
      ) && (
        <PaperLayout className={`section-div`}>
          {enabledModules.includes("kiosk") && (
            <div className="flex items-center space-x-4">
              <Tooltip>
                <TooltipTrigger>
                  <Switch
                    id="kiosk-mode"
                    onCheckedChange={() => {
                      if (hasGoogleReview) return;
                      updateKioskMode(setKioskMode, editSurvey);
                    }}
                    checked={kioskMode}
                    disabled={hasGoogleReview}
                  />
                </TooltipTrigger>

                <TooltipContent side="top">
                  <span>
                    {kioskMode
                      ? translations("Click to disable Kiosk Mode")
                      : translations("Click to enable Kiosk Mode")}
                  </span>
                </TooltipContent>
              </Tooltip>

              <Label htmlFor="kiosk-mode">
                <div className="switch-heading-and-desc-container">
                  <h3>{translations("Kiosk Mode")}</h3>
                  <p className="text-muted-foreground font-light text-xs">
                    {hasGoogleReview
                      ? translations("Not available since Google Review Questions present")
                      : translations("Enables survey to restart on completion")}
                  </p>
                </div>
              </Label>
            </div>
          )}

          {enabledModules.includes("location") && (
            <div className="flex items-center space-x-4">
              <Tooltip>
                <TooltipTrigger>
                  <Switch
                    id="location"
                    onCheckedChange={(_event) => updateGetLocation(setLocation, editSurvey)}
                    checked={location}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <span>
                    {location
                      ? translations("Click to disable Fetch location")
                      : translations("Click to enable Fetch location")}
                  </span>
                </TooltipContent>
              </Tooltip>

              <Label htmlFor="location">
                <div className={"switch-heading-and-desc-container"}>
                  <h3>{translations("Fetch Location")}</h3>
                  <p className="text-muted-foreground font-light text-xs">
                    {translations("Retrieves the location of survey participant")}
                  </p>
                </div>
              </Label>
            </div>
          )}

          {enabledModules.includes("preview") && (
            <div className="flex items-center space-x-4">
              <Tooltip>
                <TooltipTrigger>
                  <Switch
                    id="preview"
                    onCheckedChange={() => updateSkipPreview(setPreview, editSurvey)}
                    checked={preview}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <span>
                    {preview
                      ? translations("Click here to see preview screen")
                      : translations("Click here to skip preview screen")}
                  </span>
                </TooltipContent>
              </Tooltip>
              <Label htmlFor="preview">
                <div className={"switch-heading-and-desc-container"}>
                  <h3>{translations("Skip Preview Screen")}</h3>
                  <p className="text-muted-foreground font-light text-xs">
                    {translations("Skips Responses preview screen on survey completion")}
                  </p>
                </div>
              </Label>
            </div>
          )}

          {enabledModules.includes("uniqueDeviceResponse") && (
            <UniqueDeviceSettings surveyId={surveyId} survey={survey} />
          )}

          <div className="flex items-center space-x-4">
            <Tooltip>
              <TooltipTrigger>
                <Switch
                  id="webSurveyAutoTransitionToNextQues"
                  checked={webSurveyAutoTransitionToNextQues}
                  onCheckedChange={() =>
                    updatewebSurveyAutoTransitionToNextQues(
                      setwebSurveyAutoTransitionToNextQues,
                      editSurvey,
                    )
                  }
                />
              </TooltipTrigger>
              <TooltipContent>
                <span>
                  {webSurveyAutoTransitionToNextQues
                    ? translations("Click here to disable automatic transition")
                    : translations("Click here to enable automatic transition")}
                </span>
              </TooltipContent>
            </Tooltip>
            <Label htmlFor="webSurveyAutoTransitionToNextQues">
              <div className={"switch-heading-and-desc-container"}>
                <h3>{translations("Automatic Transition")}</h3>
                <p className="text-muted-foreground font-light text-xs mt-2">
                  {translations(
                    "Proceed to the next question automatically after making a selection",
                  )}
                </p>
              </div>
            </Label>
          </div>
        </PaperLayout>
      )}
    </>
  );
}

export default KioskFetchLocSkipPreview;
