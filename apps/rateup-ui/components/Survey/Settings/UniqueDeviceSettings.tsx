"use client";

import React, { useState } from "react";

import { Box, Group, Title, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import RateupSwitch from "@/components/Switch/RateupSwitch";
import CustomTooltip from "@/components/ui/custom/CustomTooltip";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { updateUniqueDevice } from "./updateSettings";

const UniqueDeviceSettings = ({ survey, surveyId }) => {
  const [enableUniqueDevice, setEnableUniqueDevice] = useState(
    survey?.uniqueDeviceResponse,
  );
  const editSurvey = useEditSurveyMutation(surveyId);
  const translations = useTranslations();
  return (
    <div className="flex items-center space-x-4">
      <CustomTooltip
        trigger={
          <Switch
            id="unique-device"
            className="data-[state=checked]:bg-[#1c518e]"
            checked={enableUniqueDevice}
            onChange={() =>
              updateUniqueDevice(setEnableUniqueDevice, editSurvey)
            }
          />
        }
        content={
          <span>
            {enableUniqueDevice
              ? translations(
                  "Click here to allow multiple user entry from a device",
                )
              : translations(
                  "Click here to allow only Single user entry from a device",
                )}
          </span>
        }
      />
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
