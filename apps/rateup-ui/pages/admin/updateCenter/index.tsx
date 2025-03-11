import { Button, Stack, Text, Title } from "@mantine/core";

import {
  useUpdateContactLastRecievedTime,
  useUpdateGoogleReviewQuestions,
  useUpdateInboxStatus,
  useUpdateSubscription,
  useUpdateThemeTitleSt,
  useUpdateUsageStatsResetDate,
} from "@/backend/updations/update.query";
import useTranslations from "@/dictionaries/useTranslation";

function UpdateAllThemes() {
  const updateGoogleReviewQuestionsMutation = useUpdateGoogleReviewQuestions();
  const updateThemest = useUpdateThemeTitleSt();

  const updateUsageStats = useUpdateUsageStatsResetDate();

  const updateContactTime = useUpdateContactLastRecievedTime();
  const updateContactStatus = useUpdateInboxStatus();
  const { translations } = useTranslations();
  const isDev =
    process.env.NEXT_PUBLIC_FRONTEND_URL === "https://dev.rateup.app";

  return (
    <Stack>
      <Stack mt="xl">
        <Title order={2}>{translations["Update WebSurveyPagesTheme"]}</Title>
        <Text>
          {
            translations[
              "Updates webSurveyPagesTheme column of survey table, which is used in survey editor page."
            ]
          }
        </Text>
        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateGoogleReviewQuestionsMutation.mutate();
          }}
          loading={updateGoogleReviewQuestionsMutation.isPending}
        >
          {translations["Update WebSurveyPagesTheme"]}
        </Button>
      </Stack>

      <Stack mt="xl">
        <Title order={2}>Update Web survey Theme title structure</Title>

        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateThemest.mutate();
          }}
          loading={updateThemest.isPending}
        >
          {translations["Update"]}
        </Button>
      </Stack>

      <Stack mt="xl">
        <Title order={2}>Update Contact last received message time</Title>

        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateContactTime.mutate();
          }}
          loading={updateContactTime.isPending}
        >
          {translations["Update"]}
        </Button>
      </Stack>

      <Stack mt="xl">
        <Title order={2}>Update Contact unassined status</Title>

        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateContactStatus.mutate();
          }}
          loading={updateContactStatus.isPending}
        >
          {translations["Update"]}
        </Button>
      </Stack>
    </Stack>
  );
}

export default UpdateAllThemes;
