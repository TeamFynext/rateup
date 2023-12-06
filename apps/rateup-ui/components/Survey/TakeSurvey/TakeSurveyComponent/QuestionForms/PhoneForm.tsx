import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Paper, Stack } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

export function PhoneForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Stack>
      <Paper mt="xs" shadow="sm" className={classes.inputBox}>
        <PhoneInput
          defaultCountry="IN"
          international
          countryCallingCodeEditable={false}
          placeholder="Enter phone number"
          value={response?.length > 0 ? response : ""}
          onChange={updateResponse}
          className={classes.inputPhone}
        />
      </Paper>
    </Stack>
  );
}
