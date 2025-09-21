"use client";

import { useContext, useState } from "react";

import {
  Flex,
  Paper,
  SelectProps,
  Stack,
  Switch,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { IconCircleCheckFilled } from "@tabler/icons-react";
import getUnicodeFlagIcon from "country-flag-icons/unicode";
import { useTranslations } from "next-intl";
import { getCountries, getCountryCallingCode } from "react-phone-number-input";
import en from "react-phone-number-input/locale/en";

import { ContainedSelection } from "@/components/input/ContainedInput/ContainedInput";

import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { QuestionType } from "../../../../types/enums";
import classes from "./Style.module.css";

const CountrySelect = ({ ...props }: SelectProps) => {
  const data = getCountries().map((country) => ({
    value: country,
    label: `${getUnicodeFlagIcon(country)}  ${en[country]} (+${getCountryCallingCode(country)})`,
  }));
  return <ContainedSelection data={data} {...props} />;
};

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
      defaultCountryCode: "IN",
    },
    email: {
      isEnabled: [QuestionType.Contact, QuestionType.Email].includes(qtype),
      headText: "",
    },
  };
  const [selectedField, setSelectedField] = useState(null);
  const [text, setText] = useState("");
  function updateFeatures(features) {
    form.setFieldValue("features", {
      ...form.values.features,
      [selectedLanguage]: features,
    });
  }

  if (!form.values?.features?.[selectedLanguage]) updateFeatures(features);
  const questionTitle = form?.values?.title?.[selectedLanguage];
  const translations = useTranslations();
  return (
    <Stack gap={"xl"}>
      <Flex justify={"flex-start"} columnGap={"lg"}>
        <Paper shadow="xl" p={"lg"}>
          <Switch
            label={translations("Name")}
            c={features?.name.isEnabled ? "var(--tertiary-color" : "dimmed"}
            checked={features?.name.isEnabled}
            onChange={(e) => {
              const updatedFeature = {
                ...features,
                name: {
                  ...features.name,
                  isEnabled: e.currentTarget.checked,
                },
              };
              updateFeatures(updatedFeature);
            }}
          />
        </Paper>
        {qtype != QuestionType.Phone && (
          <Paper shadow="xl" p={"lg"}>
            <Switch
              label={translations("Phone")}
              c={features?.phone.isEnabled ? "var(--tertiary-color" : "dimmed"}
              checked={features?.phone.isEnabled}
              onChange={(e) => {
                const updatedFeature = {
                  ...features,
                  phone: {
                    ...features.phone,
                    isEnabled: e.currentTarget.checked,
                  },
                };
                updateFeatures(updatedFeature);
              }}
            />
          </Paper>
        )}
        {qtype != QuestionType.Email && (
          <Paper shadow="xl" p={"lg"}>
            <Switch
              label={translations("Enable Email")}
              checked={features?.email.isEnabled}
              c={features.email.isEnabled ? "var(--tertiary-color" : "dimmed"}
              onChange={(e) => {
                const updatedFeature = {
                  ...features,
                  email: {
                    ...features.email,
                    isEnabled: e.currentTarget.checked,
                  },
                };
                updateFeatures(updatedFeature);
              }}
            />
          </Paper>
        )}
      </Flex>
      <Stack gap={"sm"}>
        {Object.entries(features).map(
          ([key, value]: [
            string,
            {
              isEnabled: boolean;
              headText: string;
              defaultCountryCode?: string;
            },
          ]) => {
            return (
              <Stack key={key}>
                <Tooltip
                  label={translations("Please fill question")}
                  disabled={questionTitle !== "<p></p>"}
                >
                  <Textarea
                    placeholder={`${translations("Enter")} ${key} ${translations("title here")}`}
                    classNames={{ input: classes.inputHeadText }}
                    size="md"
                    disabled={questionTitle == "<p></p>"}
                    onChange={(e) => setText(e.currentTarget.value)}
                    onBlur={() => {
                      if (!questionTitle) return;
                      if (text !== value.headText) {
                        const updatedFeature = {
                          ...features,
                          [key]: {
                            ...features[key],
                            headText: text,
                          },
                        };
                        updateFeatures(updatedFeature);
                      }
                      setSelectedField(null);
                    }}
                    value={selectedField === key ? text : value.headText}
                    onFocus={() => {
                      if (!questionTitle) return;
                      setSelectedField(key);
                      setText(value.headText);
                    }}
                    autosize
                    display={value.isEnabled ? "block" : "none"}
                    rightSection={
                      selectedField === key && questionTitle ? (
                        <Tooltip label={"save"}>
                          <IconCircleCheckFilled
                            onClick={() => {
                              if (text !== value.headText) {
                                const updatedFeature = {
                                  ...features,
                                  [key]: {
                                    ...features[key],
                                    headText: text,
                                  },
                                };
                                updateFeatures(updatedFeature);
                              }
                              setSelectedField(null);
                            }}
                          />
                        </Tooltip>
                      ) : null
                    }
                  />
                </Tooltip>
                {key === "phone" && value.isEnabled && (
                  <CountrySelect
                    disabled={questionTitle == "<p></p>"}
                    onChange={(value) => {
                      const updatedFeature = {
                        ...features,
                        phone: {
                          ...features.name,
                          defaultCountryCode: value,
                        },
                      };
                      updateFeatures(updatedFeature);
                    }}
                    placeholder={"Select Default Country code"}
                    value={value.defaultCountryCode || "IN"}
                    classNames={{ input: classes.inputHeadText }}
                    searchable
                  />
                )}
              </Stack>
            );
          },
        )}
      </Stack>
    </Stack>
  );
};

export default ContactExtraProps;
