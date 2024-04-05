import React, { useContext, useEffect, useState } from "react";
import { Text, Stack, Group, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useResetResponsesStats } from "../../../backend/surveys/response/response.query";
import { useRouter } from "next/router";
import { useUser } from "../../../context/UserContext";
import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import FormModalLayout from "../../Modal/FormModalLayout";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import SurveyContext from "../../../context/SurveyContext";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { RateupButtonBlue } from "../../Button/RateupButtons";

const OtherSettings = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const { surveyId } = useRouter().query as { surveyId: string };
  const { surveyTeamMapId } = useContext(SurveyContext);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();

  const resetResponsesStats = useResetResponsesStats(
    surveyId,
    surveyTeamMapId,
    close,
    setIsLoading,
  );

  useEffect(() => {
    setVerifyEmail("");
  }, [opened]);

  const confirmReset = () => {
    if (user?.email === verifyEmail) {
      notifications.show({
        id: "load-data",
        loading: true,
        title: "Resetting data.",
        message: `Hold on, data is getting reset...`,
        autoClose: false,
        withCloseButton: false,
      });
      setIsLoading(true);
      resetResponsesStats.mutate();
    } else {
      notifications.show({
        id: "load-data",
        color: "red",
        title: "Error",
        message: "Incorrect email",
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
    }
  };

  return (
    <>
      <PaperLayout shadow="xl" p={"xl"}>
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={4}>DANGER ZONE</Title>
            <Text c="dimmed">Reset data and responses</Text>
          </Stack>
          <RateupButtonBlue
            color="red"
            title="Reset Response data"
            onClick={open}
          />
        </Group>
      </PaperLayout>
      <FormModalLayout
        opened={opened}
        onClose={close}
        centered
        title="Reset Reponses & Stats"
        buttonTitle="Confirm"
        includeCancelButton
        isLoading={isLoading}
        onSubmit={confirmReset}
      >
        <Stack>
          <ContainedTextField
            withAsterisk
            label="Verify email"
            placeholder="Enter your login email"
            required
            value={verifyEmail}
            onChange={(e) => setVerifyEmail(e.target.value)}
          />
          <Text style={{ color: "red" }}>
            Once reset, all response data will be lost.
          </Text>
        </Stack>
      </FormModalLayout>
    </>
  );
};

export default OtherSettings;
