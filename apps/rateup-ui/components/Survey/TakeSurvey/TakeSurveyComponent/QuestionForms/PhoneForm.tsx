"use client";

import { useContext } from "react";

import { useMantineTheme } from "@mantine/core";
import { useExtracted } from "next-intl";
import PhoneInput from "react-phone-number-input";

import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import classes from "../TakeSurvey.module.css";
import FormPaperLayout from "./layout/FormPaperLayout";

export function PhoneForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  const translations = useExtracted();
  return (
    <FormPaperLayout>
      <PhoneInput
        defaultCountry="IN"
        international
        countryCallingCodeEditable={false}
        placeholder={translations("Enter phone number")}
        value={response?.length > 0 ? response : ""}
        onChange={updateResponse}
        className={classes.inputPhone}
      />
    </FormPaperLayout>
  );
}
