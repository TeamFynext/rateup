import { Flex, Paper, Stack, Switch } from "@mantine/core";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { useContext, useEffect } from "react";
import { ContainedTextArea } from "../../input/ContainedInput/ContainedInput";
import { QuestionType } from "../../../types/enums";

const ContactExtraProps = ({ form }) => {
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const qtype = form.values.type;
  const features = form.values.features?.[selectedLanguage] || {
    name: {
      isEnabled: [QuestionType.Contact].includes(qtype),
      headText: "",
    },
    phone: {
      isEnabled: [QuestionType.Contact, QuestionType.Phone].includes(qtype),
      headText: "",
    },
    email: {
      isEnabled: [QuestionType.Contact, QuestionType.Email].includes(qtype),
      headText: "",
    },
  };
  const style = {
    input: {
      border: "none",
      borderBottom: "1px solid var(--mantine-color-gray-3",
      borderRadius: 0,
    },
  };
  function updateFeatures(features) {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: features,
    });
  }
  useEffect(() => {
    updateFeatures(features);
  }, [features]);
  return (
    <Stack gap={"xl"}>
      <Flex justify={"flex-start"} columnGap={"lg"}>
        <Paper shadow="xl" p={"lg"}>
          <Switch
            label={"Name"}
            c={features?.name.isEnabled ? "var(--tertiary-color" : "dimmed"}
            checked={features?.name.isEnabled}
            onChange={(e) => {
              features.name.isEnabled = e.currentTarget.checked;
              updateFeatures(features);
            }}
          />
        </Paper>
        {qtype != QuestionType.Phone && (
          <Paper shadow="xl" p={"lg"}>
            <Switch
              label={"Phone"}
              c={features?.phone.isEnabled ? "var(--tertiary-color" : "dimmed"}
              checked={features?.phone.isEnabled}
              onChange={(e) => {
                features.phone.isEnabled = e.currentTarget.checked;
                updateFeatures(features);
              }}
            />
          </Paper>
        )}
        {qtype != QuestionType.Email && (
          <Paper shadow="xl" p={"lg"}>
            <Switch
              label={"Enable Email"}
              checked={features?.email.isEnabled}
              c={features.email.isEnabled ? "var(--tertiary-color" : "dimmed"}
              onChange={(e) => {
                features.email.isEnabled = e.currentTarget.checked;
                updateFeatures(features);
              }}
            />
          </Paper>
        )}
      </Flex>
      <Stack gap={"sm"}>
        {features.name.isEnabled && (
          <ContainedTextArea
            placeholder="Enter name heading here"
            styles={style}
            size="md"
            onChange={(e) => {
              features.name.headText = e.currentTarget.value;
              updateFeatures(features);
            }}
            value={features?.name.headText}
          />
        )}
        {features.phone.isEnabled && (
          <ContainedTextArea
            placeholder="Enter phone heading here"
            styles={style}
            size="md"
            onChange={(e) => {
              features.phone.headText = e.currentTarget.value;
              updateFeatures(features);
            }}
            value={features?.phone.headText}
          />
        )}
        {features.email.isEnabled && (
          <ContainedTextArea
            placeholder="Enter email heading"
            styles={style}
            size="md"
            onChange={(e) => {
              features.email.headText = e.currentTarget.value;
              updateFeatures(features);
            }}
            value={features?.email.headText}
          />
        )}
      </Stack>
    </Stack>
  );
};

export default ContactExtraProps;
