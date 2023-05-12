import { Button, Center, SimpleGrid } from "@mantine/core";
import { Text } from '@mantine/core';
import { questionTypesList } from "../../../pages/dashboard/surveys/[surveyId]";

export function QuestionTypeSelection() {
  return (
    <Center sx={{ height: "100%" }}>
      <SimpleGrid cols={3}>
        {Object.values(questionTypesList).map(({ icon, label }) => (
          <Button key={label} leftIcon={icon} variant="default">
            <Text>{label}</Text>
          </Button>
        ))}
      </SimpleGrid>
    </Center>
  );
}
