import { Stack, Text, Title } from "@mantine/core";

import { formatDate } from "../../utils/dateTime";
import PaperLayout from "../styled/Layouts/PaperLayout";

const TestimonialSurveyCard = ({ survey, selectedTeamId }) => {
  return (
    <PaperLayout shadow="xl" hoveractive>
      <Stack p={"sm"}>
        <Title order={3}>{survey.title}</Title>
        <Text>{formatDate(survey?.createdAt)}</Text>
      </Stack>
    </PaperLayout>
  );
};

export default TestimonialSurveyCard;
