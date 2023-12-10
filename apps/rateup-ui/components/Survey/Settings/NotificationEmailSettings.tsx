import { Stack, Group, Title, Switch, Text } from "@mantine/core";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { updateEmailSurvey } from "./updateSettings";
import { useEffect, useState } from "react";
import { useEditSurveyMutation } from "../../../backend/surveys/surveys.query";

const NotificationEmailSettings = ({ survey, surveyId }) => {
  const [enableNotificationEmail, setEnabledNotificationEmail] = useState(
    survey?.enableNotificationEmail,
  );
  const [notificationEmail, setNotificationEmail] = useState(
    survey?.notificationEmail,
  );
  const [error, setError] = useState("");
  const editSurvey = useEditSurveyMutation(surveyId);
  useEffect(() => {
    if (!/^\S+@\S+$/.test(notificationEmail)) setError("Invalid Email");
    else setError("");
  }, [notificationEmail]);
  return (
    <PaperLayout shadow="xl" p={"xl"}>
      <Stack gap={"md"}>
        <Group justify="space-between">
          <Title order={4}>Enable Email Notification</Title>
          <Switch
            label={enableNotificationEmail ? "Disable" : "Enable"}
            size="md"
            checked={enableNotificationEmail}
            onChange={() =>
              updateEmailSurvey(setEnabledNotificationEmail, editSurvey)
            }
          />
        </Group>
        {enableNotificationEmail && (
          <>
            <ContainedTextField
              withAsterisk
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="Enter email ID"
              error={error}
            />
            {!survey?.notificationEmail?.length && (
              <Text c="var(--tertiary-color)" fz={15}>
                Please Enter Email ID and Save to complete the process.
              </Text>
            )}
            <Group justify="center">
              <RateupButtonBlue
                title={
                  survey?.notificationEmail?.length
                    ? "Edit Email ID"
                    : "Save Email ID"
                }
                radius={"xl"}
                disabled={error.length != 0}
                onClick={() => {
                  editSurvey.mutate({
                    enableNotificationEmail: enableNotificationEmail,
                    notificationEmail: notificationEmail,
                  });
                }}
              />
            </Group>
          </>
        )}
      </Stack>
    </PaperLayout>
  );
};

export default NotificationEmailSettings;
