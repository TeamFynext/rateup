import { Stack, Group, Switch, Text, Box, Overlay } from "@mantine/core";
import { RateupButtonBlue } from "../../../Button/RateupButtons";
import { ContainedPasswordInput } from "../../../input/ContainedInput/ContainedInput";
import { updatePwdSurvey } from "../updateSettings";
import { useEffect, useState } from "react";
import { useUpdateSurveyPwdMutation } from "../../../../backend/surveys/surveys.query";
import styles from "./SecuritySettings.module.css";

const PasswordSettings = ({ survey, surveyId }) => {
  const [password, setPassword] = useState("");
  const [passwordProtection, setPasswordProtection] = useState(
    survey?.isProtected,
  );
  const [isPasswordInputInvalid, setIsPasswordInputInvalid] = useState<
    boolean | string
  >(false);
  const updateSurveyPassword = useUpdateSurveyPwdMutation(surveyId);

  useEffect(() => {
    if (survey?.password?.length) {
      setPassword(survey.password);
    } else {
      setPassword("");
    }
  }, [survey]);
  return (
    <Stack gap={"1rem"}>
      <Group>
        <Switch
          className={`switch ${passwordProtection ? "on" : "off"}`}
          size="md"
          checked={passwordProtection}
          onChange={() => {
            if (!passwordProtection) {
              setIsPasswordInputInvalid(false);
              setPassword("");
            }
            updatePwdSurvey(
              updateSurveyPassword,
              setPasswordProtection,
              surveyId,
            );
          }}
        />
        <Box className={"switch-heading-and-desc-container"}>
          <h3>Password Protection</h3>
          <p>Participants need to enter the password to start the survey</p>
        </Box>
      </Group>
      <Stack className={styles["password-protection-input-container"]}>
        <ContainedPasswordInput
          disabled={!passwordProtection}
          withAsterisk
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter new password"
          error={isPasswordInputInvalid}
        />
        {/* {!survey?.password?.length && (
            <Text c="var(--tertiary-color)" fz={15}>
              Please Enter password and Save to complete the process.
            </Text>
          )} */}
        <Group justify="center">
          <RateupButtonBlue
            disabled={!passwordProtection}
            title={survey?.password?.length ? "Edit Password" : "Save Password"}
            radius={"xl"}
            onClick={() => {
              if (passwordProtection && password === "") {
                setIsPasswordInputInvalid("Please enter a password");
              } else {
                setIsPasswordInputInvalid(false);
                updateSurveyPassword.mutate({ surveyId, password });
              }
            }}
          />
        </Group>
      </Stack>
    </Stack>
  );
};

export default PasswordSettings;
