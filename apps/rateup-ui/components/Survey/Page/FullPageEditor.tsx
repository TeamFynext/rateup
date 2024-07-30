import React from "react";

import { Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconWindowMaximize } from "@tabler/icons-react";
import { RateupButtonPrimary } from "components/Button/RateupButtons";
import commonModalStyles from "styles/commonCssModules/modal.module.css";
import { PageTitle } from "types/enums";

import SurveyTheme from "../SurveyTheme";
import { ThemeTabEnum } from "../SurveyTheme/SurveyTheme.enums";
import styles from "./FullPageEditor.module.css";

const FullPageEditor = ({ page, survey }) => {
  const [opened, { close, open }] = useDisclosure(false);

  let surveyThemeInitialSelectedTabValue = ThemeTabEnum.WELCOME;
  if (PageTitle[page] === "ThankYou Page") {
    surveyThemeInitialSelectedTabValue = ThemeTabEnum.THANKYOU;
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        size="100%"
        title={PageTitle[page]}
        classNames={{
          header: commonModalStyles["modal-header"],
          body: styles["modal-body"],
          content: styles["modal-content"],
        }}
      >
        <SurveyTheme
          survey={survey}
          initialSelectedPageTab={surveyThemeInitialSelectedTabValue}
        />
      </Modal>

      <RateupButtonPrimary
        title="Open Page Editor"
        rightIcon={<IconWindowMaximize />}
        onClick={open}
      />
    </>
  );
};

export default FullPageEditor;
