import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import FormPaperLayout from "./layout/FormPaperLayout";

export function PhoneForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();
  return (
    <FormPaperLayout>
      <PhoneInput
        defaultCountry="IN"
        international
        countryCallingCodeEditable={false}
        placeholder="Enter phone number"
        value={response?.length > 0 ? response : ""}
        onChange={updateResponse}
        className={classes.inputPhone}
      />
    </FormPaperLayout>
  );
}
