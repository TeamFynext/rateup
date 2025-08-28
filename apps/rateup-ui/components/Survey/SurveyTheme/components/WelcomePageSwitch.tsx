"use client";

import { Box, Switch } from "@mantine/core";

import { useEditSurveyMutation } from "../../../../backend/surveys/surveys.query";
import { ThemeTabEnum } from "../SurveyTheme.enums";
import styles from "../SurveyTheme.module.css";
import { useSelectedPageTab } from "../SurveyThemeContext";

function WelcomePageSwitch({ survey }) {
  const selectedPageTab = useSelectedPageTab();

  const isWelcomePageEnabled = survey?.welcomePageEnabled;

  const editSurvey = useEditSurveyMutation(survey?.id);
  const handleWelcomePageSwitchChange = (e) => {
    editSurvey.mutate({ welcomePageEnabled: e.currentTarget.checked });
  };

  return (
    selectedPageTab === ThemeTabEnum.WELCOME && (
      <Box className={styles["welcome-page-switch-container"]}>
        <Switch
          className={styles["welcome-page-switch"]}
          classNames={{
            track: `${
              isWelcomePageEnabled
                ? styles["switched-on-track"]
                : styles["switched-off-track"]
            }`,
            body: styles["switch-body"],
          }}
          size="md"
          label={`${isWelcomePageEnabled ? "Enabled " : "Disabled "}`}
          checked={isWelcomePageEnabled}
          onChange={handleWelcomePageSwitchChange}
          labelPosition="left"
        />
      </Box>
    )
  );
}

export default WelcomePageSwitch;
