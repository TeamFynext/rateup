import {
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconInfoCircle } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import {
  ContainedNumberInput,
  ContainedTextField,
} from "../../input/ContainedInput/ContainedInput";
import Heading from "../../styled/Heading/Heading";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import ETESettings from "./ETESettings";
import GeneralSettings from "./GeneralSettings";
import NotificationEmailSettings from "./NotificationEmailSettings";
import OtherSettings from "./OtherSettings";
import PasswordSettings from "./PasswordSettings";
import {
  updateGetLocation,
  updateKioskMode,
  updateRedirect,
  updateSkipPreview,
} from "./updateSettings";
import { RateupButtonBlue } from "../../Button/RateupButtons";

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
  "endtoendencryption",
  "redirect",
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
  const [redirect, setRedirect] = useState(survey?.redirect);
  const [redirectError, setRedirectError] = useState({ url: "", time: "" });
  const editSurvey = useEditSurveyMutation(surveyId);
  const [debounced] = useDebouncedValue(redirect?.url, 200);

  useEffect(() => {
    setHasGoogleReview(
      survey?.questions?.some(
        (item) => item.googleReview !== null && item.googleReview !== undefined,
      ),
    );
  }, [survey]);
  function validateUrl(url: string) {
    try {
      if (url === "/") return false;
      new URL(url);
      return false;
    } catch (err) {
      return true;
    }
  }
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
                    : "When enabled allows survey to restart on completion"
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
                label={"Skip Preview"}
                size="md"
                checked={preview}
                onChange={() => updateSkipPreview(setPreview, editSurvey)}
              />
              <Tooltip
                label={
                  "When enabled skips confirmation preview screen on completion"
                }
              >
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
              <Tooltip
                label={"when enabled allows fetch location of survey taker"}
              >
                <IconInfoCircle color="var(--tertiary-color)" />
              </Tooltip>
            </Group>
          </PaperLayout>
        )}
        {enabledModules.includes("endtoendencryption") && (
          <ETESettings {...{ survey }} />
        )}
        {enabledModules.includes("password") && (
          <PasswordSettings survey={survey} surveyId={surveyId} />
        )}
      </SimpleGrid>
      <SimpleGrid cols={2} spacing={"lg"}>
        {enabledModules.includes("redirect") && (
          <PaperLayout shadow="xl" p={"xl"}>
            <Group justify="space-between">
              <Title order={4}>Redirect</Title>
              <Group>
                <Switch
                  label={redirect?.enable ?? false ? "Disable" : "Enable"}
                  size="md"
                  checked={redirect?.enable ?? false}
                  onChange={() => updateRedirect(setRedirect, editSurvey)}
                  disabled={kioskMode}
                />

                <Tooltip
                  label={
                    kioskMode
                      ? "Not available since KioskMode is Enabled."
                      : "Redirect the page to a specific url after the user complete the survey"
                  }
                >
                  <IconInfoCircle color="var(--tertiary-color)" />
                </Tooltip>
              </Group>
            </Group>
            {!survey?.kioskMode && (redirect?.enable ?? false) && (
              <>
                <SimpleGrid cols={2}>
                  <ContainedTextField
                    withAsterisk
                    placeholder="Target URL for redirection"
                    required
                    label={"Redirect Url :"}
                    defaultValue={redirect?.url}
                    onChange={(e) => {
                      if (e.target.value?.trim()?.length === 0) {
                        return setRedirectError((prev) => ({
                          ...prev,
                          ...{ url: "Url should not be empty" },
                        }));
                      } else if (validateUrl(e.target.value.trim())) {
                        return setRedirectError((prev) => ({
                          ...prev,
                          ...{
                            url: "Enter the Url in Correct format or / for RateUp homepage",
                          },
                        }));
                      }
                      setRedirectError((prev) => ({
                        ...prev,
                        ...{ url: "" },
                      }));
                      let data = { ...redirect, ...{ url: e.target.value } };
                      setRedirect(data);
                    }}
                    error={redirectError.url}
                  />
                  <ContainedNumberInput
                    withAsterisk
                    placeholder="time in seconds"
                    required
                    label={"Redirect After (in seconds):"}
                    defaultValue={redirect?.time}
                    onChange={(e: number) => {
                      if (e < 2 || e > 60) {
                        return setRedirectError((prev) => ({
                          ...prev,
                          ...{ time: "Time must be between 2-60" },
                        }));
                      }
                      setRedirectError((prev) => ({
                        ...prev,
                        ...{ time: "" },
                      }));
                      let data = { ...redirect, ...{ time: e } };
                      updateRedirect(setRedirect, editSurvey, data);
                    }}
                    error={redirectError.time}
                  />
                </SimpleGrid>
                <Group justify="center" mt={"md"}>
                  <RateupButtonBlue
                    title={
                      survey?.notificationEmail?.length
                        ? "Edit Redirect"
                        : "Save Redirect"
                    }
                    radius={"xl"}
                    disabled={
                      redirectError?.time?.length !== 0 ||
                      redirectError?.url?.length !== 0
                    }
                    onClick={() => {
                      if (debounced && !kioskMode && redirect?.enable) {
                        let data = { ...redirect, ...{ url: debounced } };
                        updateRedirect(setRedirect, editSurvey, data);
                      }
                    }}
                  />
                </Group>
              </>
            )}
          </PaperLayout>
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
