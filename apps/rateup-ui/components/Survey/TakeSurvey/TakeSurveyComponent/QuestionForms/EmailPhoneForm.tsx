import { useContext, useRef } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Stack, TextInput, useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { IconMail } from "@tabler/icons-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import FormPaperLayout from "./layout/FormPaperLayout";

export function EmailPhoneForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateResponse({ ...response, email: e.currentTarget.value });
  };

  const emailRef = useRef(null);
  const theme = useMantineTheme();
  return (
    <Stack>
      <FormPaperLayout onClick={() => emailRef.current.focus()}>
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
          leftSection={
            <IconMail
              size="1.2rem"
              color={`var(--mantine-color-${theme.primaryColor}-outline)`}
            />
          }
        />
      </FormPaperLayout>
      <FormPaperLayout>
        <PhoneInput
          defaultCountry="IN"
          international
          countryCallingCodeEditable={false}
          placeholder="Enter phone number"
          value={response?.phone || null}
          onChange={(value) => updateResponse({ ...response, phone: value })}
          className={classes.inputPhone}
        />
      </FormPaperLayout>
    </Stack>
  );
}
