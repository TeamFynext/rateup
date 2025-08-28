"use client";

import React from "react";

import { Box, Text } from "@mantine/core";
import PhoneInputWithCountrySelect from "react-phone-number-input";

import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import styles from "./AuthForm.module.css";

import "react-phone-number-input/style.css";

import { IconChevronLeft } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

const PhoneNumberForm = ({ form, setSignUpTypeValue, isLoading, title }) => {
  const translations = useTranslations();
  return (
    <>
      <Box mb={"md"}>
        <Box
          py={"xs"}
          className={styles.inputBox}
          style={{
            borderColor: form?.errors?.phoneNumber && "red",
          }}
        >
          <PhoneInputWithCountrySelect
            defaultCountry="IN"
            international
            countryCallingCodeEditable={false}
            placeholder={translations("Enter phone number")}
            value={form?.values?.phone || null}
            {...form?.getInputProps("phoneNumber")}
            className={styles.inputPhone}
          />
        </Box>
        <Text size="sm" c={"red"}>
          {form?.errors?.phoneNumber}
        </Text>
      </Box>
      <RateupButtonBlue
        type="submit"
        title={title}
        loading={isLoading}
        className={styles["login-signup-form-submit-btn"]}
      />
      <RateupButtonSecondary
        type="button"
        title={translations("Go Back")}
        onClick={() => setSignUpTypeValue("")}
        className={styles["login-signup-form-submit-btn"]}
        leftIcon={<IconChevronLeft size={18} />}
      />
    </>
  );
};

export default PhoneNumberForm;
