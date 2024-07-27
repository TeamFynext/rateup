import { useCallback, useState } from "react";

import { Blockquote, Button, Loader, Stack, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { useUpdateSurveyEditorMutation } from "@/backend/updations/update.query";

import { useUpdateAllThemesMutation } from "../../../backend/surveyTheme/surveyTheme.query";

function UpdateAllThemes() {
  const updateAllThemesMutation = useUpdateAllThemesMutation();
  const updateSurveyEditorMutation = useUpdateSurveyEditorMutation();

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
        <Blockquote color="blue" icon={<IconInfoCircle />} mt="xl">
          When we change the web survey theme json structure, we have to update
          all the themes in the db to new structure, this button can be used to
          update the themes in database.
        </Blockquote>

        <Button
          style={{ alignSelf: "center" }}
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

      <Stack>
        <Title order={2}>Survey Editor Updations</Title>
        <Button
          style={{ alignSelf: "center" }}
          onClick={() => {
            updateSurveyEditorMutation.mutate();
          }}
        >
          Update Editor Structure
        </Button>
      </Stack>
    </Stack>
  );
}

export default UpdateAllThemes;
