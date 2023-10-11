import React, { useEffect, useState } from "react";
import { Text, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useResetResponsesStats } from "../../../backend/surveys/response/response.query";
import { useRouter } from "next/router";
import { useUser } from "../../../context/UserContext";
import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import DangerZone from "../../DangerZone/DangerZone";
import FormModalLayout from "../../Modal/FormModalLayout";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";

const OtherSettings = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const { surveyId } = useRouter().query as { surveyId: string };
  const [verifyEmail, setVerifyEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();

  const resetResponsesStats = useResetResponsesStats(
    surveyId,
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
      <DangerZone
        buttonText={"Reset Responses & Stats"}
        message="Are you sure you want to reset your data"
        onClick={open}
        title="Reset Data"
      />
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
          <Text color="red">Once reset, all response data will be lost.</Text>
        </Stack>
      </FormModalLayout>
    </>
  );
};

export default OtherSettings;
