import { Button, Stack, Text, Title } from "@mantine/core";

import { useUpdatePageTypeQuestions } from "@/backend/updations/update.query";

function UpdateAllThemes() {
  const updatePageTypeQuestionsMutations = useUpdatePageTypeQuestions();

  return (
    <Stack>
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
    </Stack>
  );
}

export default UpdateAllThemes;
