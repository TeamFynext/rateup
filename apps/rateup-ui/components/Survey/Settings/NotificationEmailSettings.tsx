"use client";

import { useEffect, useState } from "react";

import { Box, Group, Stack, Switch, Text, Title } from "@mantine/core";
import { useExtracted } from "next-intl";

import RateupSwitch from "@/components/Switch/RateupSwitch";

import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { updateEmailSurvey } from "./updateSettings";

const NotificationEmailSettings = ({ survey, surveyId }) => {
  const [enableNotificationEmail, setEnabledNotificationEmail] = useState(
    survey?.enableNotificationEmail,
  );
  const [notificationEmail, setNotificationEmail] = useState(
    survey?.notificationEmail,
  );
  const translations = useExtracted();
  const [error, setError] = useState("");
  const editSurvey = useEditSurveyMutation(surveyId);
  useEffect(() => {
    if (!/^\S+@\S+$/.test(notificationEmail))
      setError(translations("Invalid Email"));
    else setError("");
  }, [notificationEmail]);
  return (
    <Stack gap={"md"}>
      <Group>
        <RateupSwitch
          offMessage={translations("Click here to enable email notification")}
          onMessage={translations("Click here to disable email notification")}
          checked={enableNotificationEmail}
          onChange={() =>
            updateEmailSurvey(setEnabledNotificationEmail, editSurvey)
          }
        />
        <Box className={"switch-heading-and-desc-container"}>
          <h3>{translations("Enable Email Notification")}</h3>
        </Box>
      </Group>
      <Stack>
        <ContainedTextField
          disabled={!enableNotificationEmail}
          withAsterisk
          value={notificationEmail}
          onChange={(e) => setNotificationEmail(e.target.value)}
          placeholder={translations("Enter email ID")}
          error={error}
        />
        {!survey?.notificationEmail?.length && (
          <Text c="var(--tertiary-color)" fz={15}>
            {translations(
              "Please Enter Email ID and Save to complete the process.",
            )}
          </Text>
        )}
        <Group justify="center">
          <RateupButtonBlue
            title={
              survey?.notificationEmail?.length
                ? translations("Edit Email ID")
                : translations("Save Email ID")
            }
            radius={"xl"}
            disabled={error.length != 0 || !enableNotificationEmail}
            onClick={() => {
              editSurvey.mutate({
                enableNotificationEmail: enableNotificationEmail,
                notificationEmail: notificationEmail,
              });
            }}
          />
        </Group>
      </Stack>
    </Stack>
  );
};

export default NotificationEmailSettings;
