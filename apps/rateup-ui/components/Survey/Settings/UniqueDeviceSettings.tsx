import React, { useState } from "react";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { Group, Switch, Title, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import { updateUniqueDevice } from "./updateSettings";

const UniqueDeviceSettings = ({ survey, surveyId }) => {
  const [enableUniqueDevice, setEnableUniqueDevice] = useState(
    survey?.uniqueDeviceResponse,
  );
  const editSurvey = useEditSurveyMutation(surveyId);

  return (
    <PaperLayout shadow="xl" p={"xl"}>
      <Group justify="space-between">
        <Title order={4}>Unique Device Entry</Title>
        <Group>
          <Switch
            label={enableUniqueDevice ? "Enabled" : "Enable"}
            size="md"
            checked={enableUniqueDevice}
            onChange={() =>
              updateUniqueDevice(setEnableUniqueDevice, editSurvey)
            }
          />
        </Group>

        <Tooltip label={"Allow only Single user entry from a device"}>
          <IconInfoCircle color="var(--tertiary-color)" />
        </Tooltip>
      </Group>
    </PaperLayout>
  );
};

export default UniqueDeviceSettings;
