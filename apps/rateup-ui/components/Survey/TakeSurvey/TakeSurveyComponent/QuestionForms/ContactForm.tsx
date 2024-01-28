import { Stack, Paper, Group, TextInput, Textarea } from "@mantine/core";
import { IconAddressBook, IconMail } from "@tabler/icons-react";
import { useContext, useRef } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import PhoneInputWithCountrySelect from "react-phone-number-input";
import classes from "../TakeSurvey.module.css";
import "react-phone-number-input/style.css";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";

const ContactForm = ({ features }) => {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;

  return (
    <Stack w={"100%"}>
      <Paper w="100%" shadow="sm" className={classes.inputBox}>
        <Group>
          <TextInput
            placeholder="Enter your name"
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
        </Group>
      </Paper>
      {features?.[selectedLanguage]?.hasPhone && (
        <Paper mt="xs" shadow="sm" className={classes.inputBox} w={"100%"}>
          <PhoneInputWithCountrySelect
            defaultCountry="IN"
            international
            countryCallingCodeEditable={false}
            placeholder="Enter phone number"
            value={response?.phone || null}
            onChange={(value) => updateResponse({ ...response, phone: value })}
            className={classes.inputPhone}
          />
        </Paper>
      )}
      {features?.[selectedLanguage]?.hasEmail && (
        <Paper w="100%" shadow="sm" className={classes.inputBox}>
          <Group>
            <TextInput
              placeholder="Enter your email"
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
          </Group>
        </Paper>
      )}

      {features?.[selectedLanguage]?.hasAddress && (
        <Paper w="100%" shadow="sm" className={classes.inputBox}>
          <Group>
            <Textarea
              placeholder="Enter your address"
              value={response?.address || ""}
              onChange={(e) =>
                updateResponse({ ...response, address: e.currentTarget.value })
              }
              variant="unstyled"
              classNames={{
                input: classes.input,
                root: classes.textRoot,
              }}
            />
          </Group>
        </Paper>
      )}
    </Stack>
  );
};

export default ContactForm;
