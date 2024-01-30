import { useContext, useEffect } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Anchor, Checkbox, Group, Modal, Paper, Text } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { SelectedQContext } from "../../../../../context/SelectedQ";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { useDisclosure } from "@mantine/hooks";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";

export function TermsNConditionsForm({ tncData }) {
  const [opened, { open, close }] = useDisclosure(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const tnc = tncData?.[selectedLanguage] || {
    title: "I agree to",
    urlTitle: "terms and conditions",
    content:
      "Terms & conditions.... \n conditions 1....\n conditions 3.... \n conditions 3....",
  };

  return (
    <>
      <Paper shadow="sm" className={classes.inputBox}>
        <Checkbox
          p="sm"
          labelPosition="right"
          value={response || false}
          onChange={(e) => updateResponse(e.currentTarget.checked)}
          label={
            <>
              {tnc?.title}&nbsp;
              <Anchor underline="always" href="#" onClick={open} inherit>
                {tnc?.urlTitle}
              </Anchor>
            </>
          }
        />
      </Paper>

      <Modal
        opened={opened}
        onClose={close}
        title="Terms & Conditions"
        centered
      >
        <Text pb="50px">{tnc?.content}</Text>

        <Group justify="flex-end">
          <RateupButtonPrimary
            title="Accept"
            onClick={() => {
              updateResponse(true);
              close();
            }}
          />
        </Group>
      </Modal>
    </>
  );
}
