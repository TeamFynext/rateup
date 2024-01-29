import { Stack, Paper, Group, TextInput, Textarea, Text } from "@mantine/core";
import { IconMail } from "@tabler/icons-react";
import { useContext, useRef } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import PhoneInputWithCountrySelect from "react-phone-number-input";
import classes from "../TakeSurvey.module.css";
import "react-phone-number-input/style.css";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";

const ContactForm = ({ features }) => {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const selectedFeature = features?.[selectedLanguage];
  return (
    <Stack w={"100%"} gap={"lg"}>
      {selectedFeature?.name.isEnabled && (
        <Stack gap={"xs"}>
          <Text>{selectedFeature.name.headText}</Text>
          <Paper w="100%" shadow="sm" className={classes.inputBox}>
            <TextInput
              placeholder="Enter name"
              value={response?.name || ""}
              onChange={(e) =>
                updateResponse({ ...response, name: e.currentTarget.value })
              }
              variant="unstyled"
              classNames={{
                input: classes.input,
                root: classes.textRoot,
              }}
            />
          </Paper>
        </Stack>
      )}
      {selectedFeature?.phone.isEnabled && (
        <Stack gap={"xs"}>
          <Text>{selectedFeature.phone.headText}</Text>
          <Paper shadow="sm" className={classes.inputBox} w={"100%"}>
            <PhoneInputWithCountrySelect
              defaultCountry="IN"
              international
              countryCallingCodeEditable={false}
              placeholder="Enter phone number"
              value={response?.phone || null}
              onChange={(value) =>
                updateResponse({ ...response, phone: value })
              }
              className={classes.inputPhone}
            />
          </Paper>
        </Stack>
      )}
      {selectedFeature?.email.isEnabled && (
        <Stack gap={"xs"}>
          <Text>{selectedFeature.email.headText}</Text>
          <Paper w="100%" shadow="sm" className={classes.inputBox}>
            <TextInput
              placeholder="Enter email"
              value={response?.email || ""}
              onChange={(e) =>
                updateResponse({ ...response, email: e.currentTarget.value })
              }
              variant="unstyled"
              classNames={{
                input: classes.input,
                root: classes.textRoot,
              }}
              leftSection={<IconMail size="1.2rem" color="gray" />}
            />
          </Paper>
        </Stack>
      )}
    </Stack>
  );
};

export default ContactForm;
