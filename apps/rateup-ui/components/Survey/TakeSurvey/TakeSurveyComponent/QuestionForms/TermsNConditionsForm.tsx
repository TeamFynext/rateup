import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import {
  Anchor,
  Checkbox,
  Group,
  Modal,
  Text,
  luminance,
  useMantineTheme,
} from "@mantine/core";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import { useDisclosure } from "@mantine/hooks";
import { RateupButtonPrimary } from "../../../../Button/RateupButtons";
import FormPaperLayout from "./layout/FormPaperLayout";

export function TermsNConditionsForm({ tncData }) {
  const [opened, { open, close }] = useDisclosure(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  const primaryColor = theme.colors[theme.primaryColor][8];

  const textColor =
    luminance(primaryColor) > 0.8
      ? `var(--mantine-color-gray-7)`
      : primaryColor;

  const tnc = tncData?.[selectedLanguage] || {
    title: "I agree to",
    urlTitle: "terms and conditions",
    content:
      "Terms & conditions.... \n conditions 1....\n conditions 3.... \n conditions 3....",
  };

  return (
    <>
      <FormPaperLayout>
        <Checkbox
          p="sm"
          labelPosition="right"
          value={response || false}
          onChange={(e) => updateResponse(e.currentTarget.checked)}
          color={textColor}
          label={
            <>
              <Group mt="-2px" p="0" gap={0}>
                <Text c={textColor}>{tnc?.title} </Text>
                <Anchor
                  ml="6px"
                  underline="always"
                  href="#"
                  onClick={open}
                  inherit
                  c={"var(--tertiary-color)"}
                >
                  {tnc?.urlTitle}
                </Anchor>
              </Group>
            </>
          }
        />
      </FormPaperLayout>
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
