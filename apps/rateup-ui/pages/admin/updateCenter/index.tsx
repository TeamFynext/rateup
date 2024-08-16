import { useCallback, useState } from "react";

import { Button, Loader, Stack, Text, Title } from "@mantine/core";

import {
  useTransferDataToIntegration,
  useUpdateDatabaseMutation,
  useUpdatePageTypeQuestions,
  useUpdateSurveyEditorMutation,
} from "@/backend/updations/update.query";

import { useUpdateAllThemesMutation } from "../../../backend/surveyTheme/surveyTheme.query";

function UpdateAllThemes() {
  const updateAllThemesMutation = useUpdateAllThemesMutation();
  const updateSurveyEditorMutation = useUpdateSurveyEditorMutation();
  const updateDBMutation = useUpdateDatabaseMutation();
  const updateIntegrationMutation = useTransferDataToIntegration();
  const updatePageTypeQuestionsMutations = useUpdatePageTypeQuestions();

  const [isUpdatingThemes, setIsUpdatingThemes] = useState(false);
  const handleUpdateAllThemesBtnClick = useCallback(async () => {
    setIsUpdatingThemes(true);
    try {
      await updateAllThemesMutation.mutateAsync();
    } catch (err) {
      console.log(err);
    }
    setIsUpdatingThemes(false);
  }, []);

  return (
    <Stack>
      <Stack>
        <Title order={2}>Theme Updations</Title>
        <Text>
          When we change the web survey theme json structure, we have to update
          all the themes in the db to new structure, this button can be used to
          update the themes in database.
        </Text>

        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={handleUpdateAllThemesBtnClick}
        >
          Update All Themes
        </Button>

        {isUpdatingThemes && (
          <p
            style={{
              alignSelf: "center",
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            Updating themes, Please wait
            {<Loader type="dots" />}
          </p>
        )}
      </Stack>

      {/* <Stack mt="xl">
        <Title order={2}>Survey Editor Updations</Title>
        <Text>
          Survey JSON changes for supporting new survey editor with Pages
          support.
        </Text>

        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateSurveyEditorMutation.mutate();
          }}
        >
          Run Update
        </Button>
      </Stack> */}

      <Stack mt="xl">
        <Title order={2}>Update Page Type Questions</Title>
        <Text>
          Updates welcome, language, thankyou page type questions with title,
          subtitle, start button text values from active survey theme.
        </Text>

        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updatePageTypeQuestionsMutations.mutate();
          }}
        >
          Update Page type Questions.
        </Button>
      </Stack>

      <Stack mt="xl">
        <Title order={2}>Database Updations (July 30)</Title>
        <Text>
          Subscription feature structure change for Ai module, HTML Code Page
          (premium feature).
        </Text>
        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateDBMutation.mutate();
          }}
        >
          Run Update
        </Button>
      </Stack>

      <Stack mt="xl">
        <Title order={2}>Integration Updations</Title>
        <Text>Migrating data from googleAccessTokens to Integration.</Text>
        <Button
          ml="md"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            updateIntegrationMutation.mutate({ app: "googlesheet" });
          }}
        >
          Update Google Sheet Credentials
        </Button>
      </Stack>
    </Stack>
  );
}

export default UpdateAllThemes;
