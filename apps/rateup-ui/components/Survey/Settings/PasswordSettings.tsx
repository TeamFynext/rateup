import React, { useEffect, useState } from "react";
import { Stack, Switch } from "@mantine/core";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import { useUpdateSurveyPwdMutation } from "../../../backend/surveys/surveys.query";
import { IconInfoCircle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";

export const PasswordProtection = ({ surveyId, isProtected }) => {
  const [passwordProtect, setPasswordProtect] = useState(isProtected);
  const [password, setPassword] = useState("");

  function updatePassword() {
    updateSurveyPassword.mutate();
  }

  function handleSwitch(event: any) {
    setPasswordProtect(event.currentTarget.checked);
    if (event.currentTarget.checked) {
      notifications.show({
        id: "load-data",
        color: "blue",
        title: "Set Password",
        message: "Enter Password and Save to complete the process.",
        icon: <IconInfoCircle size="1rem" />,
        autoClose: 5000,
      });
    } else {
      setPassword("");
      updateSurveyPassword.mutate();
    }
  }

  const updateSurveyPassword = useUpdateSurveyPwdMutation(
    surveyId,
    passwordProtect,
    password,
  );

  return (
    <PaperLayout>
      <>
        <Switch
          checked={passwordProtect}
          onChange={(event) => handleSwitch(event)}
          label="Enable"
        />
        {passwordProtect && (
          <Stack px={30} py={20} style={{ maxWidth: "400px" }}>
            <ContainedTextField
              label="Password"
              type="text"
              placeholder="Enter new password"
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
            <RateupButtonBlue
              title={"Save Password"}
              onClick={updatePassword}
            />
          </Stack>
        )}
      </>
    </PaperLayout>
  );
};
