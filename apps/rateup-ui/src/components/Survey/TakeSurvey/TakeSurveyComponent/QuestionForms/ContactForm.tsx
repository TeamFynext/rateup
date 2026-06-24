import { Stack, Text, TextInput, useMantineTheme } from "@mantine/core";
import { IconMail } from "@tabler/icons-react";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import PhoneInputWithCountrySelect from "react-phone-number-input";

import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";

import { handleInputScrollIntoView } from "../util.tsx";
import FormPaperLayout from "./layout/FormPaperLayout.tsx";

import classes from "../TakeSurvey.module.css";

const ContactForm = ({ features }) => {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const selectedLanguage = useContext(SelectedLanguageContext).selectedLanguage;
  const selectedFeature = features?.[selectedLanguage];
  const theme = useMantineTheme();
  const { t: translations } = useTranslation();
  return (
    <Stack w={"100%"} gap={"lg"}>
      {selectedFeature?.name.isEnabled && (
        <Stack gap={"xs"}>
          <Text c={`var(--mantine-color-${theme.primaryColor}-outline)`}>
            {selectedFeature.name.headText}
          </Text>
          <FormPaperLayout>
            <TextInput
              placeholder={translations("Enter name")}
              value={response?.name || ""}
              onChange={(e) => updateResponse({ ...response, name: e.currentTarget.value })}
              variant="unstyled"
              classNames={{
                input: classes.input,
                root: classes.textRoot,
              }}
              onClick={handleInputScrollIntoView}
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
              defaultCountry={selectedFeature?.phone?.defaultCountryCode || "IN"}
              international
              countryCallingCodeEditable={false}
              placeholder={translations("Enter phone number")}
              value={response?.phone || null}
              onChange={(value) => updateResponse({ ...response, phone: value })}
              className={`${classes.inputPhone} not-prose`}
              onClick={handleInputScrollIntoView}
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
              placeholder={translations("Enter email")}
              value={response?.email || ""}
              onChange={(e) => updateResponse({ ...response, email: e.currentTarget.value })}
              variant="unstyled"
              classNames={{
                input: classes.input,
                root: classes.textRoot,
              }}
              leftSection={<IconMail size="1.2rem" />}
              styles={{
                section: {
                  zIndex: 0,
                },
              }}
              onClick={handleInputScrollIntoView}
            />
          </FormPaperLayout>
        </Stack>
      )}
    </Stack>
  );
};

export default ContactForm;
