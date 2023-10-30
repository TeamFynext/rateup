import { Stack, Paper, Group, Switch, Text } from "@mantine/core";
import React, { useState } from "react";
import ShareQR from "../../Survey/ShareSurvey/ShareQR";
import { StatusBadge } from "../../Survey/SurveyCardList";
import PaperLayout from "../../styled/Layouts/PaperLayout";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSurvey } from "../../../backend/surveys/survey.api";
import { showLoadingToast } from "../../../utils/notifications";
import { CopyLinkComponent } from "../../Survey/ShareSurvey/ShareSurvey";
import { ContainedSelection } from "../../input/ContainedInput/ContainedInput";
import { useSurveysByTeam } from "../../../backend/surveys/surveys.query";
import { notifications } from "@mantine/notifications";
import CenteredSpinner from "../../Loaders/CenteredSpinner";

const ShareMenu = ({ menuId, teamId }) => {
  const queryClient = useQueryClient();
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const {
    data: surveys = [],
    isLoading,
    isError,
  } = useSurveysByTeam(teamId, !!teamId);

  const surveyUpdateMutation = useMutation({
    mutationFn: (data: any) => updateSurvey(selectedSurvey, data),
    onSuccess: (data) => {
      if (data?.data?.status === "failed") {
        showLoadingToast(
          data?.data?.error ? data?.data?.error : "Your survey is incomplete",
          "load-data-f",
          false,
          "Failed..!",
          "red",
        );
      } else {
        notifications.hide("load-data");
        showLoadingToast(
          data?.data?.action === "unpublish"
            ? "Survey Un-Published."
            : "Survey Published Successfully!",
          "load-data-s",
          false,
          "Sucess",
        );
        queryClient.invalidateQueries({ queryKey: ["surveys"] });
        queryClient.invalidateQueries({ queryKey: ["survey", selectedSurvey] });
      }
    },
  });
  if (isLoading || surveyUpdateMutation?.isPending) return <CenteredSpinner />;
  if (surveyUpdateMutation?.isError) {
    showErrorToast((surveyUpdateMutation?.error as Error)?.message);
    return null;
  }

  const surveyFormatedData = surveys?.map((survey) => ({
    value: survey.id,
    label: survey.title,
  }));
  const shareLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/public/menu/${menuId}/feedback/${selectedSurvey}`;
  return (
    <Stack>
      <Paper px="md" py="lg" radius="md" shadow="lg">
        <Stack>
          <PaperLayout>
            <Group justify="space-between">
              <ContainedSelection
                withAsterisk
                label="choose a survey to display in the menu pagel"
                placeholder="Select survey"
                required
                data={surveyFormatedData}
                onChange={(value) => setSelectedSurvey(value)}
              />
              <Switch
                size="lg"
                checked={selectedSurvey}
                disabled={selectedSurvey === null}
                onChange={(event) => {
                  showLoadingToast(
                    "Please hold on while publishing your survey",
                    "load-data",
                    true,
                    "Publishing",
                  );
                  surveyUpdateMutation.mutate({
                    isPublished: event.currentTarget.checked,
                  });
                }}
                label="Publish Survey"
              />
              {selectedSurvey !== null && (
                <Group>
                  <Text>Current Status: </Text>
                  {surveys[0].isPublished ? (
                    <StatusBadge active={surveys[0]?.active} />
                  ) : (
                    <Text c="dark.1"> Not published! </Text>
                  )}
                </Group>
              )}
              <CopyLinkComponent
                value={shareLink}
                disabled={selectedSurvey === null}
              />
            </Group>
          </PaperLayout>
          <ShareQR url={shareLink} />
        </Stack>
      </Paper>
    </Stack>
  );
};

export default ShareMenu;
function showErrorToast(message: any) {
  throw new Error("Function not implemented.");
}
