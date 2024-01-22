import { useContext, useRef } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Group, Paper, Stack, TextInput } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { IconMail } from "@tabler/icons-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

export function EmailPhoneForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateResponse({ ...response, email: e.currentTarget.value });
  };

  const emailRef = useRef(null);

  return (
    <Stack w={"100%"}>
      <Paper
        w="100%"
        shadow="sm"
        className={classes.inputBox}
        onClick={() => emailRef.current.focus()}
      >
        <Group>
          <TextInput
            placeholder="Enter your email"
            ref={emailRef}
            value={response?.email}
            onChange={handleEmailChange}
            variant="unstyled"
            classNames={{
              input: classes.input,
              root: classes.textRoot,
            }}
            leftSection={<IconMail size="1.2rem" color="gray" />}
          />
        </Group>
      </Paper>

      <Paper mt="xs" shadow="sm" className={classes.inputBox} w={"100%"}>
        <PhoneInput
          defaultCountry="IN"
          international
          countryCallingCodeEditable={false}
          placeholder="Enter phone number"
          value={response?.phone || null}
          onChange={(value) => updateResponse({ ...response, phone: value })}
          className={classes.inputPhone}
        />
      </Paper>
    </Stack>
  );
}
