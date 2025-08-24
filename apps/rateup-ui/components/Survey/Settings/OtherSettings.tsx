import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useResetResponsesStats } from "../../../backend/surveys/response/response.query";
import { useDeleteSurveyMutation } from "../../../backend/surveys/surveys.query";
import SurveyContext from "../../../context/SurveyContext";
import { useUser } from "../../../context/UserContext";
import { RateupButtonBlue } from "../../Button/RateupButtons";
import { ContainedTextField } from "../../input/ContainedInput/ContainedInput";
import FormModalLayout from "../../Modal/FormModalLayout";
import PaperLayout from "../../styled/Layouts/PaperLayout";

const OtherSettings = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const { surveyId } = useRouter().query as { surveyId: string };
  const { surveyTeamMapId } = useContext(SurveyContext);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const router = useRouter();
  const translations = useTranslations();
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
        title: translations("Resetting data."),
        message: translations("Hold on, data is getting reset..."),
        autoClose: false,
        withCloseButton: false,
      });
      setIsLoading(true);
      resetResponsesStats.mutate();
    } else {
      notifications.show({
        id: "load-data",
        color: "red",
        title: translations("Error"),
        message: translations("Incorrect email"),
        icon: <IconX size="1rem" />,
        autoClose: 3000,
      });
    }
  };

  const deleteSurveyMutation = useDeleteSurveyMutation();

  const confirmDeleteSurvey = () => {
    notifications.show({
      id: "delete-survey",
      loading: true,
      title: translations("Deleting survey.."),
      message: translations("Hold on, survey is getting deleted..."),
      autoClose: true,
      withCloseButton: false,
    });
    setIsLoading(true);
    deleteSurveyMutation.mutate(surveyId);
    router.push(`/dashboard/surveys`);
  };

  return (
    <>
      <PaperLayout shadow="xl" p={"xl"}>
        <Group justify="space-between">
          <Stack gap={0}>
            <Title order={4}>{translations("DANGER ZONE")}</Title>
            <Text c="dimmed">{translations("Reset data and responses")}</Text>
          </Stack>
          <Stack>
            <RateupButtonBlue
              color="red"
              title={translations("Reset Response data")}
              onClick={open}
            />
            <RateupButtonBlue
              color="red"
              title={translations("Delete Survey")}
              onClick={openDeleteModal}
            />
          </Stack>
        </Group>
      </PaperLayout>
      <FormModalLayout
        opened={opened}
        onClose={close}
        centered
        title={translations("Reset Reponses & Stats")}
        buttonTitle={translations("Confirm")}
        includeCancelButton
        isLoading={isLoading}
        onSubmit={confirmReset}
      >
        <Stack>
          <ContainedTextField
            withAsterisk
            label={translations("Verify email")}
            placeholder={translations("Enter your login email")}
            required
            value={verifyEmail}
            onChange={(e) => setVerifyEmail(e.target.value)}
          />
          <Text style={{ color: "red" }}>
            {translations("Once reset, all response data will be lost.")}
          </Text>
        </Stack>
      </FormModalLayout>
      <FormModalLayout
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        centered
        title={translations("Confirm Delete Survey")}
        buttonTitle={translations("Confirm")}
        includeCancelButton
        isLoading={isLoading}
        onSubmit={confirmDeleteSurvey}
      >
        <Text style={{ color: "red" }}>
          {translations("Are you sure you want to delete this survey?")} <br />
          {translations("This action cannot be undone..!!")}
        </Text>
      </FormModalLayout>
    </>
  );
};

export default OtherSettings;
