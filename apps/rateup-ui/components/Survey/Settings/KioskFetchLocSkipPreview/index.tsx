import React from "react";

import { Box, Group, Switch } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import RateupSwitch from "@/components/Switch/RateupSwitch";

import PaperLayout from "../../../styled/Layouts/PaperLayout";
import UniqueDeviceSettings from "../UniqueDeviceSettings";
import {
  updateGetLocation,
  updateKioskMode,
  updateSkipPreview,
  updatewebSurveyAutoTransitionToNextQues,
} from "../updateSettings";

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
  const translations = useTranslations();
  return (
    <>
      {enabledModules.some((data) =>
        ["kiosk", "location", "preview", "uniqueDeviceResponse"].includes(data),
      ) && (
        <PaperLayout className={`section-div`}>
          {enabledModules.includes("kiosk") && (
            <Group>
              <RateupSwitch
                offMessage={translations("Click to enable Kiosk Mode")}
                onMessage={translations("Click to disable Kiosk Mode")}
                onChange={() => updateKioskMode(setKioskMode, editSurvey)}
                checked={kioskMode}
              />

              <Box className={"switch-heading-and-desc-container"}>
                <h3>{translations("Kiosk Mode")}</h3>
                <p>
                  {hasGoogleReview
                    ? translations(
                        "Not available since Google Review Questions present",
                      )
                    : translations("Enables survey to restart on completion")}
                </p>
              </Box>
            </Group>
          )}

          {enabledModules.includes("location") && (
            <Group>
              <RateupSwitch
                offMessage={translations("Click to enable Fetch location")}
                onMessage={translations("Click to disable Fetch location")}
                onChange={(event) => updateGetLocation(setLocation, editSurvey)}
                checked={location}
              />
              <Box className={"switch-heading-and-desc-container"}>
                <h3>{translations("Fetch Location")}</h3>
                <p>
                  {translations("Retrieves the location of survey participant")}
                </p>
              </Box>
            </Group>
          )}

          {enabledModules.includes("preview") && (
            <Group>
              <RateupSwitch
                offMessage={translations("Click here to skip preview screen")}
                onMessage={translations("Click here to see preview screen")}
                checked={preview}
                onChange={() => updateSkipPreview(setPreview, editSurvey)}
              />
              <Box className={"switch-heading-and-desc-container"}>
                <h3>{translations("Skip Preview Screen")}</h3>
                <p>
                  {translations(
                    "Skips Responses preview screen on survey completion",
                  )}
                </p>
              </Box>
            </Group>
          )}

          {enabledModules.includes("uniqueDeviceResponse") && (
            <UniqueDeviceSettings surveyId={surveyId} survey={survey} />
          )}

          <Group>
            <RateupSwitch
              offMessage={translations(
                "Click here to enable automatic transition",
              )}
              onMessage={translations(
                "Click here to disable automatic transition",
              )}
              checked={webSurveyAutoTransitionToNextQues}
              onChange={() =>
                updatewebSurveyAutoTransitionToNextQues(
                  setwebSurveyAutoTransitionToNextQues,
                  editSurvey,
                )
              }
            />
            <Box className={"switch-heading-and-desc-container"}>
              <h3>{translations("Automatic Transition")}</h3>
              <p>
                {translations(
                  "Proceed to the next question automatically after making a selection",
                )}
              </p>
            </Box>
          </Group>
        </PaperLayout>
      )}
    </>
  );
}

export default KioskFetchLocSkipPreview;
