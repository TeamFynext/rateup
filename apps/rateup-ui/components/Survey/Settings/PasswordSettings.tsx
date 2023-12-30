import { Stack, Group, Title, Switch, Text } from "@mantine/core";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import { ContainedPasswordInput } from "../../input/ContainedInput/ContainedInput";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { updatePwdSurvey } from "./updateSettings";
import { useEffect, useState } from "react";
import { useUpdateSurveyPwdMutation } from "../../../backend/surveys/surveys.query";

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
      const password = survey.password.slice(0, 8);
      setPassword(password);
    }
  }, [survey]);
  return (
    <PaperLayout shadow="xl" p={"xl"}>
      <Stack gap={"md"}>
        <Group justify="space-between">
          <Title order={4}>Password Protection</Title>
          <Switch
            label={passwordProtection ? "Disable" : "Enable"}
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
        </Group>
        {passwordProtection && (
          <>
            <ContainedPasswordInput
              withAsterisk
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              error={isPasswordInputInvalid}
            />
            {!survey?.password?.length && (
              <Text c="var(--tertiary-color)" fz={15}>
                Please Enter password and Save to complete the process.
              </Text>
            )}
            <Group justify="center">
              <RateupButtonBlue
                title={
                  survey?.password?.length ? "Edit Password" : "Save Password"
                }
                radius={"xl"}
                onClick={() => {
                  if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
                    setIsPasswordInputInvalid(
                      "Password should contain at least one letter and one number",
                    );
                  } else if (survey?.password?.slice(0, 8) === password) {
                    setIsPasswordInputInvalid("Please enter a new password");
                  } else {
                    setIsPasswordInputInvalid(false);
                    updateSurveyPassword.mutate({ surveyId, password });
                  }
                }}
              />
            </Group>
          </>
        )}
      </Stack>
    </PaperLayout>
  );
};

export default PasswordSettings;
