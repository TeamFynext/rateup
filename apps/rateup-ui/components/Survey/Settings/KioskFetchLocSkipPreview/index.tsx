import { Box, Group, Switch, Tooltip } from "@mantine/core";
import styles from "./KioskFetchLocSkipPreview.module.css";
import PaperLayout from "../../../styled/Layouts/PaperLayout";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  updateGetLocation,
  updateKioskMode,
  updateSkipPreview,
} from "../updateSettings";
import UniqueDeviceSettings from "../UniqueDeviceSettings";

function KioskFetchLocSkipPreview({
  enabledModules,
  kioskMode,
  setKioskMode,
  editSurvey,
  hasGoogleReview,
  location,
  setLocation,
  preview,
  setPreview,
  survey,
  surveyId,
}) {
  return (
    <>
      {enabledModules.some((data) =>
        ["kiosk", "location", "preview" || "uniqueDeviceResponse"].includes(
          data,
        ),
      ) && (
        <PaperLayout className={`section-div`}>
          {enabledModules.includes("kiosk") && (
            <Group>
              <Switch
                className={`switch ${kioskMode ? "on" : "off"}`}
                size="md"
                checked={kioskMode}
                onChange={() => updateKioskMode(setKioskMode, editSurvey)}
                disabled={hasGoogleReview}
              />

              <Box className={"switch-heading-and-desc-container"}>
                <h3>Kiosk Mode</h3>
                <p>
                  {hasGoogleReview
                    ? "Not available since Google Review Questions present"
                    : "Enables survey to restart on completion"}
                </p>
              </Box>
            </Group>
          )}

          {enabledModules.includes("location") && (
            <Group>
              <Switch
                className={`switch ${location ? "on" : "off"}`}
                size="md"
                checked={location}
                onChange={(event) => updateGetLocation(setLocation, editSurvey)}
              />
              <Box className={"switch-heading-and-desc-container"}>
                <h3>Fetch Location</h3>
                <p>Retrieves the location of survey participant</p>
              </Box>
            </Group>
          )}

          {enabledModules.includes("preview") && (
            <Group>
              <Switch
                className={`switch ${preview ? "on" : "off"}`}
                size="md"
                checked={preview}
                onChange={() => updateSkipPreview(setPreview, editSurvey)}
              />
              <Box className={"switch-heading-and-desc-container"}>
                <h3>Skip Preview Screen</h3>
                <p>Skips Responses preview screen on survey completion</p>
              </Box>
            </Group>
          )}

          {enabledModules.includes("uniqueDeviceResponse") && (
            <UniqueDeviceSettings surveyId={surveyId} survey={survey} />
          )}
        </PaperLayout>
      )}
    </>
  );
}

export default KioskFetchLocSkipPreview;
