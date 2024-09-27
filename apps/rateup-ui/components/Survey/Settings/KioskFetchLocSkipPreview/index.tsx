import { Box, Group, Switch, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import useTranslations from "@/dictionaries/useTranslation";

import PaperLayout from "../../../styled/Layouts/PaperLayout";
import UniqueDeviceSettings from "../UniqueDeviceSettings";
import {
  updateGetLocation,
  updateKioskMode,
  updateSkipPreview,
  updatewebSurveyAutoTransitionToNextQues,
} from "../updateSettings";
import styles from "./KioskFetchLocSkipPreview.module.css";

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
  webSurveyAutoTransitionToNextQues,
  setwebSurveyAutoTransitionToNextQues,
}) {
  const { translations } = useTranslations();
  return (
    <>
      {enabledModules.some((data) =>
        ["kiosk", "location", "preview", "uniqueDeviceResponse"].includes(data),
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
                <h3>{translations["Kiosk Mode"]}</h3>
                <p>
                  {hasGoogleReview
                    ? translations[
                        "Not available since Google Review Questions present"
                      ]
                    : translations["Enables survey to restart on completion"]}
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
                <h3>{translations["Fetch Location"]}</h3>
                <p>
                  {translations["Retrieves the location of survey participant"]}
                </p>
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
                <h3>{translations["Skip Preview Screen"]}</h3>
                <p>
                  {
                    translations[
                      "Skips Responses preview screen on survey completion"
                    ]
                  }
                </p>
              </Box>
            </Group>
          )}

          {enabledModules.includes("uniqueDeviceResponse") && (
            <UniqueDeviceSettings surveyId={surveyId} survey={survey} />
          )}

          <Group>
            <Switch
              className={`switch ${webSurveyAutoTransitionToNextQues ? "on" : "off"}`}
              size="md"
              checked={webSurveyAutoTransitionToNextQues}
              onChange={() =>
                updatewebSurveyAutoTransitionToNextQues(
                  setwebSurveyAutoTransitionToNextQues,
                  editSurvey,
                )
              }
            />
            <Box className={"switch-heading-and-desc-container"}>
              <h3>{translations["Automatic Transition"]}</h3>
              <p>
                {
                  translations[
                    "Proceed to the next question automatically after making a selection"
                  ]
                }
              </p>
            </Box>
          </Group>
        </PaperLayout>
      )}
    </>
  );
}

export default KioskFetchLocSkipPreview;
