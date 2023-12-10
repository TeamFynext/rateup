import React, { useEffect, useState } from "react";
import { Group, SimpleGrid, Stack, Switch, Tooltip } from "@mantine/core";
import PasswordSettings from "./PasswordSettings";
import OtherSettings from "./OtherSettings";
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { IconInfoCircle } from "@tabler/icons-react";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import {
  updateGetLocation,
  updateKioskMode,
  updateSkipPreview,
} from "./updateSettings";
import NotificationEmailSettings from "./NotificationEmailSettings";
import GeneralSettings from "./GeneralSettings";

const defaultEnabledModules = [
  "name",
  "password",
  "language",
  "kiosk",
  "teams",
  "preview",
  "location",
  "enableNotificationEmail",
  "notificationEmail",
];
const SurveySettings = ({
  surveyId,
  survey,
  enabledModules = defaultEnabledModules,
}) => {
  const [kioskMode, setKioskMode] = useState(survey?.kioskMode);
  const [preview, setPreview] = useState(survey?.skipPreview);
  const [location, setLocation] = useState(survey?.getLocation);

  const [hasGoogleReview, setHasGoogleReview] = useState(false);

  const editSurvey = useEditSurveyMutation(surveyId);

  useEffect(() => {
    setHasGoogleReview(
      survey?.questions?.some(
        (item) => item.googleReview !== null && item.googleReview !== undefined,
      ),
    );
  }, [survey]);

  return (
    <Stack px={"xl"} py={"lg"} gap={survey?.type == "web" ? "lg" : "xs"}>
      <Heading subtitle="General settings" label="Edit your survey info" />
      <GeneralSettings enabledModules={enabledModules} survey={survey} />
      <SimpleGrid cols={3}>
        {enabledModules.includes("kiosk") && (
          <PaperLayout shadow="xl" p={"xl"}>
            <Group justify="space-between">
              <Switch
                label={"Kiosk Mode"}
                size="md"
                checked={kioskMode}
                onChange={() => updateKioskMode(setKioskMode, editSurvey)}
                disabled={hasGoogleReview}
              />
              <Tooltip
                label={
                  hasGoogleReview
                    ? "Not available since Google Review Questions present."
                    : "enable kiosk mode"
                }
              >
                <IconInfoCircle color="var(--tertiary-color)" />
              </Tooltip>
            </Group>
          </PaperLayout>
        )}
        {enabledModules.includes("preview") && (
          <PaperLayout shadow="xl" p={"xl"}>
            <Group justify="space-between">
              <Switch
                label={"Preview Screen"}
                size="md"
                checked={preview}
                onChange={() => updateSkipPreview(setPreview, editSurvey)}
              />
              <Tooltip label={"enable preview screen"}>
                <IconInfoCircle color="var(--tertiary-color)" />
              </Tooltip>
            </Group>
          </PaperLayout>
        )}
        {enabledModules.includes("location") && (
          <PaperLayout shadow="xl" p={"xl"}>
            <Group justify="space-between">
              <Switch
                label={"Fetch Location"}
                size="md"
                checked={location}
                onChange={(event) => updateGetLocation(setLocation, editSurvey)}
              />
              <Tooltip label={"enable location fetch"}>
                <IconInfoCircle color="var(--tertiary-color)" />
              </Tooltip>
            </Group>
          </PaperLayout>
        )}
      </SimpleGrid>
      <SimpleGrid cols={2} spacing={"lg"}>
        {enabledModules.includes("password") && (
          <PasswordSettings survey={survey} surveyId={surveyId} />
        )}
        {enabledModules.includes("enableNotificationEmail") && (
          <NotificationEmailSettings surveyId={surveyId} survey={survey} />
        )}
      </SimpleGrid>
      <OtherSettings />
    </Stack>
  );
};

export default SurveySettings;
