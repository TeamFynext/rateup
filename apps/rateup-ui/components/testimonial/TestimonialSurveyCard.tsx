import { Title } from "@mantine/core";
import PaperLayout from "../styled/Layouts/PaperLayout";
import { useRouter } from "next/router";

const TestimonialSurveyCard = ({ survey }) => {
  const router = useRouter();
  return (
    <PaperLayout
      shadow="xl"
      hoveractive
      onClick={() => {
        router.push(`${router.pathname}/${survey?.id}`);
      }}
    >
      <Title>{survey.title}</Title>
    </PaperLayout>
  );
};

export default TestimonialSurveyCard;
