import { Box, Text } from "@mantine/core";
import React from "react";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../Button/RateupButtons";
import styles from "./AuthForm.module.css";
import PhoneInputWithCountrySelect from "react-phone-number-input";
import "react-phone-number-input/style.css";

const PhoneNumberForm = ({ form, setSignUpTypeValue, isLoading, title }) => {
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
            placeholder="Enter phone number"
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
        title="Go Back"
        onClick={() => setSignUpTypeValue("")}
        className={styles["login-signup-form-submit-btn"]}
      />
    </>
  );
};

export default PhoneNumberForm;
