import { Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconWindowMaximize } from "@tabler/icons-react";
import { RateupButtonPrimary } from "components/Button/RateupButtons";
import React from "react";
import { PageTitle } from "types/enums";
import SurveyTheme from "../SurveyTheme";

const FullPageEditor = ({ page, survey }) => {
  const [opened, { close, open }] = useDisclosure(false);

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        size="100%"
        title={PageTitle[page]}
      >
        Full page editor: {page}
        <SurveyTheme survey={survey} />
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
