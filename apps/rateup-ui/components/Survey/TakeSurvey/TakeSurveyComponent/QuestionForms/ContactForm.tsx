import { Stack, TextInput, Text, useMantineTheme } from "@mantine/core";
import { IconMail } from "@tabler/icons-react";
import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import PhoneInputWithCountrySelect from "react-phone-number-input";
import classes from "../TakeSurvey.module.css";
import "react-phone-number-input/style.css";
import SelectedLanguageContext from "../../../../../context/SelectedLanguage";
import FormPaperLayout from "./layout/FormPaperLayout";

const ContactForm = ({ features }) => {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const selectedFeature = features?.[selectedLanguage];
  const theme = useMantineTheme();
  return (
    <Stack w={"100%"} gap={"lg"}>
      {selectedFeature?.name.isEnabled && (
        <Stack gap={"xs"}>
          <Text c={`var(--mantine-color-${theme.primaryColor}-outline)`}>
            {selectedFeature.name.headText}
          </Text>
          <FormPaperLayout>
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
          </FormPaperLayout>
        </Stack>
      )}
      {selectedFeature?.phone.isEnabled && (
        <Stack gap={"xs"}>
          <Text c={`var(--mantine-color-${theme.primaryColor}-outline)`}>
            {selectedFeature.phone.headText}
          </Text>
          <FormPaperLayout>
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
          </FormPaperLayout>
        </Stack>
      )}
      {selectedFeature?.email.isEnabled && (
        <Stack gap={"xs"}>
          <Text c={`var(--mantine-color-${theme.primaryColor}-outline)`}>
            {selectedFeature.email.headText}
          </Text>
          <FormPaperLayout>
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
              leftSection={
                <IconMail
                  size="1.2rem"
                  color={`var(--mantine-color-${theme.primaryColor}-outline)`}
                />
              }
              styles={{
                section: {
                  zIndex: 0,
                },
              }}
            />
          </FormPaperLayout>
        </Stack>
      )}
    </Stack>
  );
};

export default ContactForm;
