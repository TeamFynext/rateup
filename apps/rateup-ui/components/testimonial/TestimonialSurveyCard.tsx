import { Stack, Title, Text } from "@mantine/core";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { formatDate } from "../../utils/dateTime";

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
