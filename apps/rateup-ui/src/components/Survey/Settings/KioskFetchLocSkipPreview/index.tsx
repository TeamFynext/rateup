import { IconSettings2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { FieldLabel } from "@/components/ui/field.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

import UniqueDeviceSettings from "../UniqueDeviceSettings.tsx";
import {
  updateGetLocation,
  updateKioskMode,
  updateSkipPreview,
  updatewebSurveyAutoTransitionToNextQues,
} from "../updateSettings.ts";

function SwitchRow({
  id,
  checked,
  onCheckedChange,
  disabled,
  tooltip,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: () => void;
  disabled?: boolean;
  tooltip: string;
  label: string;
  description: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5 py-2.75">
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
          <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
      <FieldLabel htmlFor={id} className="cursor-pointer text-[13px] font-semibold">
        {label}
      </FieldLabel>
      <div />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

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

  const hasAnyModule = enabledModules.some((data: string) =>
    ["kiosk", "location", "preview", "uniqueDeviceResponse"].includes(data),
  );

  if (!hasAnyModule) return null;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center gap-2.25">
          <IconSettings2 className="size-4 text-primary" />
          <CardTitle className="font-nunito text-[15px] font-extrabold">
            {translations("Survey Behaviour")}
          </CardTitle>
        </CardHeader>
        {/* Rows carry their own vertical padding; divide-y draws the design's row rules. */}
        <CardContent className="flex flex-col divide-y divide-border">
          {enabledModules.includes("kiosk") && (
            <SwitchRow
              id="kiosk-mode"
              checked={!!kioskMode}
              onCheckedChange={() => {
                if (hasGoogleReview) return;
                updateKioskMode(setKioskMode, editSurvey);
              }}
              disabled={hasGoogleReview}
              tooltip={
                kioskMode
                  ? translations("Click to disable Kiosk Mode")
                  : translations("Click to enable Kiosk Mode")
              }
              label={translations("Kiosk Mode")}
              description={
                hasGoogleReview
                  ? translations("Not available since Google Review Questions present")
                  : translations("Enables survey to restart on completion")
              }
            />
          )}

          {enabledModules.includes("location") && (
            <SwitchRow
              id="location"
              checked={!!location}
              onCheckedChange={() => updateGetLocation(setLocation, editSurvey)}
              tooltip={
                location
                  ? translations("Click to disable Fetch location")
                  : translations("Click to enable Fetch location")
              }
              label={translations("Fetch Location")}
              description={translations("Retrieves the location of survey participant")}
            />
          )}

          {enabledModules.includes("preview") && (
            <SwitchRow
              id="preview"
              checked={!!preview}
              onCheckedChange={() => updateSkipPreview(setPreview, editSurvey)}
              tooltip={
                preview
                  ? translations("Click here to see preview screen")
                  : translations("Click here to skip preview screen")
              }
              label={translations("Skip Preview Screen")}
              description={translations("Skips Responses preview screen on survey completion")}
            />
          )}

          {enabledModules.includes("uniqueDeviceResponse") && (
            <UniqueDeviceSettings surveyId={surveyId} survey={survey} />
          )}

          <SwitchRow
            id="webSurveyAutoTransitionToNextQues"
            checked={!!webSurveyAutoTransitionToNextQues}
            onCheckedChange={() =>
              updatewebSurveyAutoTransitionToNextQues(
                setwebSurveyAutoTransitionToNextQues,
                editSurvey,
              )
            }
            tooltip={
              webSurveyAutoTransitionToNextQues
                ? translations("Click here to disable automatic transition")
                : translations("Click here to enable automatic transition")
            }
            label={translations("Automatic Transition")}
            description={translations(
              "Proceed to the next question automatically after making a selection",
            )}
          />
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default KioskFetchLocSkipPreview;
