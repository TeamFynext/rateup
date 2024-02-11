import { Stack, Title, Text } from "@mantine/core";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { useRouter } from "next/router";
import dayjs from "dayjs";

const TestimonialSurveyCard = ({ survey, selectedTeamId }) => {
  return (
    <PaperLayout shadow="xl" hoveractive>
      <Stack p={"sm"}>
        <Title order={3}>{survey.title}</Title>
        <Text>{dayjs(survey?.createdAt).format("DD/MM/YYYY")} </Text>
      </Stack>
    </PaperLayout>
  );
};

export default TestimonialSurveyCard;
