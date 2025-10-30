"use client";

import React, { useEffect } from "react";

import { Box, Group } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { DivideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import RateupSwitch from "@/components/Switch/RateupSwitch";
import CustomTooltip from "@/components/ui/custom/CustomTooltip";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import PaperLayout from "../../../styled/Layouts/PaperLayout";
import UniqueDeviceSettings from "../UniqueDeviceSettings";
import {
  updateGetLocation,
  updateKioskMode,
  updateSkipPreview,
  updatewebSurveyAutoTransitionToNextQues,
} from "../updateSettings";

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
  const translations = useTranslations();
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
              <CustomTooltip
                trigger={
                  <Switch
                    id="kiosk-mode"
                    className="data-[state=checked]:bg-[#1c518e]"
                    onCheckedChange={(event) => {
                      if (hasGoogleReview) return false;
                      updateKioskMode(setKioskMode, editSurvey);
                    }}
                    checked={kioskMode}
                  />
                }
                content={
                  <span>
                    {kioskMode
                      ? translations("Click to disable Kiosk Mode")
                      : translations("Click to enable Kiosk Mode")}
                  </span>
                }
              />

              <Label htmlFor="kiosk-mode">
                <div className={"switch-heading-and-desc-container"}>
                  <h3>{translations("Kiosk Mode")}</h3>
                  <p className="text-muted-foreground font-light text-xs">
                    {hasGoogleReview
                      ? translations(
                          "Not available since Google Review Questions present",
                        )
                      : translations("Enables survey to restart on completion")}
                  </p>
                </div>
              </Label>
            </div>
          )}

          {enabledModules.includes("location") && (
            <div className="flex items-center space-x-4">
              <CustomTooltip
                trigger={
                  <Switch
                    id="location"
                    className="data-[state=checked]:bg-[#1c518e]"
                    onCheckedChange={(event) =>
                      updateGetLocation(setLocation, editSurvey)
                    }
                    checked={location}
                  />
                }
                content={
                  <span>
                    {location
                      ? translations("Click to disable Fetch location")
                      : translations("Click to enable Fetch location")}
                  </span>
                }
              />

              <Label htmlFor="location">
                <div className={"switch-heading-and-desc-container"}>
                  <h3>{translations("Fetch Location")}</h3>
                  <p className="text-muted-foreground font-light text-xs">
                    {translations(
                      "Retrieves the location of survey participant",
                    )}
                  </p>
                </div>
              </Label>
            </div>
          )}

          {enabledModules.includes("preview") && (
            <div className="flex items-center space-x-4">
              <CustomTooltip
                trigger={
                  <Switch
                    id="preview"
                    className="data-[state=checked]:bg-[#1c518e]"
                    onChange={() => updateSkipPreview(setPreview, editSurvey)}
                    checked={preview}
                  />
                }
                content={
                  preview
                    ? translations("Click here to see preview screen")
                    : translations("Click here to skip preview screen")
                }
              />
              <Label htmlFor="preview">
                <div className={"switch-heading-and-desc-container"}>
                  <h3>{translations("Skip Preview Screen")}</h3>
                  <p className="text-muted-foreground font-light text-xs">
                    {translations(
                      "Skips Responses preview screen on survey completion",
                    )}
                  </p>
                </div>
              </Label>
            </div>
          )}

          {enabledModules.includes("uniqueDeviceResponse") && (
            <UniqueDeviceSettings surveyId={surveyId} survey={survey} />
          )}

          <div className="flex items-center space-x-4">
            <CustomTooltip
              trigger={
                <Switch
                  id="webSurveyAutoTransitionToNextQues"
                  className="data-[state=checked]:bg-[#1c518e]"
                  checked={webSurveyAutoTransitionToNextQues}
                  onChange={() =>
                    updatewebSurveyAutoTransitionToNextQues(
                      setwebSurveyAutoTransitionToNextQues,
                      editSurvey,
                    )
                  }
                />
              }
              content={
                <span>
                  {webSurveyAutoTransitionToNextQues
                    ? translations("Click here to disable automatic transition")
                    : translations("Click here to enable automatic transition")}
                </span>
              }
            />
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
