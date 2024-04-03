import { Stack, Group, Title, Switch, Text, Box } from "@mantine/core";
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
    <Stack gap={"md"}>
      <Group>
        <Switch
          className={`switch ${enableNotificationEmail ? "on" : "off"}`}
          size="md"
          checked={enableNotificationEmail}
          onChange={() =>
            updateEmailSurvey(setEnabledNotificationEmail, editSurvey)
          }
        />
        <Box className={"switch-heading-and-desc-container"}>
          <h3>Enable Email Notification</h3>
        </Box>
      </Group>
      <Stack>
        <ContainedTextField
          disabled={!enableNotificationEmail}
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
