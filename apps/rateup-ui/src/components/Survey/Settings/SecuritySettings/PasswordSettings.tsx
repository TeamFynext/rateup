"use client";

import { useEffect, useState } from "react";

import { Box, Group, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";

import { useUpdateSurveyPwdMutation } from "@/backend/surveys/surveys.query";
import RateupSwitch from "@/components/Switch/RateupSwitch.tsx";

import { RateupButtonBlue } from "../../../Button/RateupButtons.tsx";
import { ContainedPasswordInput } from "../../../input/ContainedInput/ContainedInput.tsx";
import { updatePwdSurvey } from "../updateSettings.ts";
import styles from "./SecuritySettings.module.css";

const PasswordSettings = ({ survey, surveyId }) => {
  const [password, setPassword] = useState("");
  const [passwordProtection, setPasswordProtection] = useState(
    survey?.isProtected,
  );
  const { t: translations } = useTranslation();
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
        <RateupSwitch
          offMessage={translations("Click here to enable password protection")}
          onMessage={translations("Click here to disable password protection")}
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
          <h3>{translations("Password Protection")}</h3>
          <p>
            {translations(
              "Participants need to enter the password to start the survey",
            )}
          </p>
        </Box>
      </Group>
      <Stack className={styles["password-protection-input-container"]}>
        <ContainedPasswordInput
          disabled={!passwordProtection}
          withAsterisk
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={translations("Enter new password")}
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
            title={
              survey?.password?.length
                ? translations("Edit Password")
                : translations("Save Password")
            }
            radius={"xl"}
            onClick={() => {
              if (passwordProtection && password === "") {
                setIsPasswordInputInvalid(
                  translations("Please enter a password"),
                );
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
