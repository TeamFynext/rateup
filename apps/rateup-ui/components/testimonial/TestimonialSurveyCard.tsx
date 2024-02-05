import { Stack, Title, Text } from "@mantine/core";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { useRouter } from "next/router";
import dayjs from "dayjs";

const TestimonialSurveyCard = ({ survey }) => {
  const router = useRouter();
  return (
    <PaperLayout
      shadow="xl"
      hoveractive
      // onClick={() => {
      //   router.push(`${router.pathname}/${survey?.id}`);
      // }}
    >
      <Stack p={"sm"}>
        <Title order={3}>{survey.title}</Title>
        <Text>{dayjs(survey?.createdAt).format("DD/MM/YYYY")} </Text>
      </Stack>
    </PaperLayout>
  );
};

export default TestimonialSurveyCard;
