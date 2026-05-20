"use client";

import React, { useState } from "react";

import { useTranslation } from "react-i18next";

import { useEditSurveyMutation } from "@/backend/surveys/surveys.query";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

import { updateUniqueDevice } from "./updateSettings.ts";

const UniqueDeviceSettings = ({ survey, surveyId }) => {
  const [enableUniqueDevice, setEnableUniqueDevice] = useState(
    survey?.uniqueDeviceResponse,
  );
  const editSurvey = useEditSurveyMutation(surveyId);
  const { t: translations } = useTranslation();
  return (
    <div className="flex items-center space-x-4">
      <Tooltip>
        <TooltipTrigger>
          <Switch
            id="unique-device"
            checked={enableUniqueDevice}
            onCheckedChange={() =>
              updateUniqueDevice(setEnableUniqueDevice, editSurvey)
            }
          />
        </TooltipTrigger>
        <TooltipContent>
          <span>
            {enableUniqueDevice
              ? translations(
                  "Click here to allow multiple user entry from a device",
                )
              : translations(
                  "Click here to allow only Single user entry from a device",
                )}
          </span>
        </TooltipContent>
      </Tooltip>
      <Label htmlFor="unique-device">
        <div className={"switch-heading-and-desc-container"}>
          <h3>{translations("Unique Device Entry")}</h3>
          <p className="text-muted-foreground font-light text-xs">
            {translations("Allow only Single user entry from a device")}
          </p>
        </div>
      </Label>
    </div>
  );
};

export default UniqueDeviceSettings;
