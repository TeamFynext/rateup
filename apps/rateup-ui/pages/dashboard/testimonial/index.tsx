import {
  Center,
  Flex,
  Grid,
  Radio,
  RadioGroup,
  SimpleGrid,
  Stack,
} from "@mantine/core";
import { useTestimonialSurveys } from "../../../backend/testimonials/testimonial.query";
import TestimonialSurveyCard from "../../../components/testimonial/TestimonialSurveyCard";
import { TeamSelector } from "../../../components/input/TeamSelector";
import { useState } from "react";
import Heading from "../../../components/styled/Heading/Heading";
import { useSurveysWithQuestions } from "../../../backend/surveys/surveys.query";
import { QuestionType } from "../../../types/enums";
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";
import { IconCheck } from "@tabler/icons-react";
import { useRouter } from "next/router";

export default function () {
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const {
    data: allSurveys,
    isLoading,
    isError,
  } = useSurveysWithQuestions(!!selectedTeamId);
  const surveys =
    selectedTeamId === "all" || !selectedTeamId
      ? allSurveys
      : allSurveys?.filter(
          (s: Survey) => s?.teams?.some((team) => team?.id === selectedTeamId),
        );
  const filteredSurveys = surveys?.filter(
    (s) =>
      s?.questions?.some((q: Question) => q?.type == QuestionType.Testimonial),
  );
  const router = useRouter();
  const [enableSelect, setEnableSelect] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState("");
  return (
    <Stack>
      <Heading title="Testimonial Surveys" titleprops={{ w: "fit-content" }} />

      <Grid columns={12}>
        <Grid.Col span={3}>
          <TeamSelector
            value={selectedTeamId}
            onChange={(teamId) => setSelectedTeamId(teamId)}
            enableAll={true}
          />
        </Grid.Col>
        <Grid.Col span={9}>
          <Center mb={"xl"}>
            <RateupButtonBlue
              title="Select Survey"
              radius={"md"}
              size="lg"
              onClick={() => setEnableSelect(true)}
            />
          </Center>
          <Flex justify={"flex-end"}>
            <RateupButtonBlue
              title="Next"
              color="black"
              onClick={() => {
                router.push(`${router.pathname}/${selectedSurvey}`);
              }}
            />
          </Flex>
          <RadioGroup value={selectedSurvey} onChange={setSelectedSurvey}>
            <SimpleGrid cols={3} mt={"xl"}>
              {filteredSurveys?.map((survey) => (
                <Stack pos={"relative"}>
                  {enableSelect && (
                    <Radio
                      size="lg"
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        transform: "translate(50%, -50%)", // Center the button in the top right corner
                      }}
                      icon={IconCheck}
                      value={survey?.id}
                    />
                  )}
                  <TestimonialSurveyCard survey={survey} />
                </Stack>
              ))}
            </SimpleGrid>
          </RadioGroup>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
