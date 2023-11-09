import React, { useContext, useEffect, useState } from "react";
import Responses from "../../../../components/Survey/Response/Responses";
import { useSurvey } from "../../../../backend/surveys/surveys.query";
import { useRouter } from "next/router";
import { Title, Group, Stack } from "@mantine/core";
import { useRouteParams } from "../../../../context/RouteParamsContext";
import { useResponses } from "../../../../backend/surveys/response/response.query";
import { ResultFilter } from "../../../../components/Survey/Result/Result";
import SurveyContext from "../../../../context/SurveyContext";

//page made for MEMBER role to just view responses

//TODO - set selected languge using - useContext(SelectedLanguageContext)
//now language default value given 'English' in inside <Resoponses />

const ViewResponses = () => {
  const router = useRouter();
  const surveyId = router.query.surveyId as string;
  const { surveyTeamMapId } = useContext(SurveyContext);
  const {
    isLoading: isSurveyLoading,
    error: surveyError,
    data: survey,
  } = useSurvey(surveyId);
  const {
    data: responses,
    error: responseFetchError,
    isLoading: isLoading,
  } = useResponses(surveyTeamMapId);
  const [filteredResponses, setFilteredResponses] = useState(responses);

  const { update } = useRouteParams();
  useEffect(() => {
    update({ surveyId: survey?.title });
  }, [survey?.title]);
  useEffect(() => {
    setFilteredResponses(responses);
  }, [responses]);

  return (
    <Stack>
      <Group>
        <Title>Survey: </Title>
        <Title c={"blue.9"} pl="lg" ml="lg">
          {survey?.title}
        </Title>
      </Group>
      <Group h={"100%"} mt={"md"} wrap="nowrap" align="flex-start">
        <Group miw={200} maw={200}>
          <ResultFilter
            responses={responses}
            setFilteredResponses={setFilteredResponses}
            survey={survey}
          />
        </Group>
        <Responses survey={survey} responses={filteredResponses} />
      </Group>
    </Stack>
  );
};

export default ViewResponses;
