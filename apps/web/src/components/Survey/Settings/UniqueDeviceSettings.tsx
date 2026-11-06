import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useEditSurveyMutation } from "@/backend/surveys/surveys.query";
import { FieldLabel } from "@/components/ui/field.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";

import { updateUniqueDevice } from "./updateSettings.ts";

const UniqueDeviceSettings = ({ survey, surveyId }: { survey: Survey; surveyId: string }) => {
  const [enableUniqueDevice, setEnableUniqueDevice] = useState(survey?.uniqueDeviceResponse);
  const editSurvey = useEditSurveyMutation(surveyId);
  const { t: translations } = useTranslation();

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0.5 py-2.75">
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex shrink-0" />}>
          <Switch
            id="unique-device"
            checked={!!enableUniqueDevice}
            onCheckedChange={() => updateUniqueDevice(setEnableUniqueDevice, editSurvey)}
          />
        </TooltipTrigger>
        <TooltipContent>
          {enableUniqueDevice
            ? translations("Click here to allow multiple user entry from a device")
            : translations("Click here to allow only Single user entry from a device")}
        </TooltipContent>
      </Tooltip>
      <FieldLabel htmlFor="unique-device" className="cursor-pointer text-[13px] font-semibold">
        {translations("Unique Device Entry")}
      </FieldLabel>
      <div />
      <p className="text-xs text-muted-foreground">
        {translations("Allow only Single user entry from a device")}
      </p>
    </div>
  );
};

export default UniqueDeviceSettings;
