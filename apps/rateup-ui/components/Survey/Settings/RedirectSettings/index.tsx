import {
  Box,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Title,
  Tooltip,
} from "@mantine/core";
import { updateRedirect } from "../updateSettings";
import {
  ContainedNumberInput,
  ContainedTextField,
} from "../../../input/ContainedInput/ContainedInput";
import { RateupButtonBlue } from "../../../Button/RateupButtons";
import PaperLayout from "../../../styled/Layouts/PaperLayout";

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
  function validateUrl(url: string) {
    try {
      if (url === "/") return false;
      new URL(url);
      return false;
    } catch (err) {
      return true;
    }
  }
  const areInputsEnabled = !survey?.kioskMode && (redirect?.enable ?? false);

  if (enabledModules.includes("redirect")) {
    return (
      <PaperLayout className={`section-div`}>
        <Group>
          <Switch
            className={`switch ${redirect?.enable ?? false ? "on" : "off"}`}
            size="md"
            checked={redirect?.enable ?? false}
            onChange={() => updateRedirect(setRedirect, editSurvey)}
            disabled={kioskMode}
          />
          <Box className={"switch-heading-and-desc-container"}>
            <h3>Redirect</h3>
            <p>
              {kioskMode
                ? "Not available since KioskMode is Enabled"
                : "Redirect to a specific url after the user completes the survey"}
            </p>
          </Box>
        </Group>
        <Stack>
          <SimpleGrid cols={2}>
            <ContainedTextField
              disabled={!areInputsEnabled}
              withAsterisk
              placeholder="Target URL for redirection"
              required
              label={"Redirect Url"}
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
              disabled={!areInputsEnabled}
              withAsterisk
              placeholder="time in seconds"
              required
              label={"Redirect After (in seconds)"}
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
                redirectError?.url?.length !== 0 ||
                !areInputsEnabled
              }
              onClick={() => {
                if (debounced && !kioskMode && redirect?.enable) {
                  let data = { ...redirect, ...{ url: debounced } };
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
