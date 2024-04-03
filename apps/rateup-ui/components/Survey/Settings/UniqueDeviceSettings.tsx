import React, { useState } from "react";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { Box, Group, Switch, Title, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import { updateUniqueDevice } from "./updateSettings";

const UniqueDeviceSettings = ({ survey, surveyId }) => {
  const [enableUniqueDevice, setEnableUniqueDevice] = useState(
    survey?.uniqueDeviceResponse,
  );
  const editSurvey = useEditSurveyMutation(surveyId);

  return (
    <Group justify="space-between">
      <Group>
        <Switch
          className={`switch ${enableUniqueDevice ? "on" : "off"}`}
          size="md"
          checked={enableUniqueDevice}
          onChange={() => updateUniqueDevice(setEnableUniqueDevice, editSurvey)}
        />
        <Box className={"switch-heading-and-desc-container"}>
          <h3>Unique Device Entry</h3>
          <p>Allow only Single user entry from a device</p>
        </Box>
      </Group>
    </Group>
  );
};

export default UniqueDeviceSettings;
