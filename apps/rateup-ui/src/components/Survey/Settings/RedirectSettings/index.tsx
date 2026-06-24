import { Box, Group, SimpleGrid, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

import RateupSwitch from "@/components/Switch/RateupSwitch.tsx";

import { RateupButtonBlue } from "../../../Button/RateupButtons.tsx";
import {
  ContainedNumberInput,
  ContainedTextField,
} from "../../../input/ContainedInput/ContainedInput.tsx";
import PaperLayout from "../../../styled/Layouts/PaperLayout.tsx";
import { updateRedirect } from "../updateSettings.ts";

function RedirectSettings({
  enabledModules,
  redirect,
  setRedirect,
  editSurvey,
  kioskMode,
  survey,
  redirectError,
  setRedirectError,
  debounced,
}) {
  const { t: translations } = useTranslation();
  function validateUrl(url: string) {
    try {
      if (url === "/") return false;
      new URL(url);
      return false;
    } catch {
      return true;
    }
  }
  const areInputsEnabled = !survey?.kioskMode && (redirect?.enable ?? false);

  if (enabledModules.includes("redirect")) {
    return (
      <PaperLayout className={`section-div`}>
        <Group>
          <RateupSwitch
            offMessage={translations("Click here to enable Redirect option")}
            onMessage={translations("Click here to disable Redirect option")}
            checked={redirect?.enable ?? false}
            onChange={() => updateRedirect(setRedirect, editSurvey)}
            disabled={kioskMode}
          />
          <Box className={"switch-heading-and-desc-container"}>
            <h3>{translations("Redirect")}</h3>
            <p>
              {kioskMode
                ? translations("Not available since KioskMode is Enabled")
                : translations("Redirect to a specific url after the user completes the survey")}
            </p>
          </Box>
        </Group>
        <Stack>
          <SimpleGrid cols={2}>
            <ContainedTextField
              disabled={!areInputsEnabled}
              withAsterisk
              placeholder={translations("Target URL for redirection")}
              required
              label={translations("Redirect Url")}
              defaultValue={redirect?.url}
              onChange={(e) => {
                if (e.target.value?.trim()?.length === 0) {
                  return setRedirectError((prev) => ({
                    ...prev,
                    url: translations("Url should not be empty"),
                  }));
                } else if (validateUrl(e.target.value.trim())) {
                  return setRedirectError((prev) => ({
                    ...prev,
                    url: translations("Enter the Url in Correct format or / for RateUp homepage"),
                  }));
                }
                setRedirectError((prev) => ({
                  ...prev,
                  url: "",
                }));
                const data = {
                  ...redirect,
                  url: e.target.value,
                };
                setRedirect(data);
              }}
              error={redirectError.url}
            />
            <ContainedNumberInput
              disabled={!areInputsEnabled}
              withAsterisk
              placeholder={translations("time in seconds")}
              required
              label={translations("Redirect After (in seconds)")}
              defaultValue={redirect?.time}
              onChange={(e: number) => {
                if (e < 2 || e > 60) {
                  return setRedirectError((prev) => ({
                    ...prev,
                    time: translations("Time must be between 2-60"),
                  }));
                }
                setRedirectError((prev) => ({
                  ...prev,
                  time: "",
                }));
                const data = {
                  ...redirect,
                  time: e,
                };
                updateRedirect(setRedirect, editSurvey, data);
              }}
              error={redirectError.time}
            />
          </SimpleGrid>
          <Group justify="center" mt={"md"}>
            <RateupButtonBlue
              title={
                survey?.notificationEmail?.length
                  ? translations("Edit Redirect")
                  : translations("Save Redirect")
              }
              radius={"xl"}
              disabled={
                redirectError?.time?.length !== 0 ||
                redirectError?.url?.length !== 0 ||
                !areInputsEnabled
              }
              onClick={() => {
                if (debounced && !kioskMode && redirect?.enable) {
                  const data = {
                    ...redirect,
                    url: debounced,
                  };
                  updateRedirect(setRedirect, editSurvey, data);
                }
              }}
            />
          </Group>
        </Stack>
      </PaperLayout>
    );
  }
}

export default RedirectSettings;
