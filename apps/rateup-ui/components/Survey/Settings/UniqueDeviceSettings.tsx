import React, { useState } from "react";

import { Box, Group, Switch, Title, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import RateupSwitch from "@/components/Switch/RateupSwitch";

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
    <Group justify="space-between">
      <Group>
        <RateupSwitch
          offMessage={translations(
            "Click here to allow only Single user entry from a device",
          )}
          onMessage={translations(
            "Click here to allow multiple user entry from a device",
          )}
          checked={enableUniqueDevice}
          onChange={() => updateUniqueDevice(setEnableUniqueDevice, editSurvey)}
        />
        <Box className={"switch-heading-and-desc-container"}>
          <h3>{translations("Unique Device Entry")}</h3>
          <p>{translations("Allow only Single user entry from a device")}</p>
        </Box>
      </Group>
    </Group>
  );
};

export default UniqueDeviceSettings;
