import React, {useEffect} from 'react'
import Responses from '../../../../components/Survey/Response/Responses'
import { useSurvey } from '../../../../backend/surveys/surveys.query';
import { useRouter } from "next/router";
import {  Title, Group } from "@mantine/core";
import { useRouteParams } from '../../../../context/RouteParamsContext';


//page made for MEMBER role to just view responses

//TODO - set selected languge using - useContext(SelectedLanguageContext)
//now language default value given 'English' in inside <Resoponses />

const ViewResponses = () => {
  const router = useRouter();
  const surveyId = router.query.surveyId as string;
  const {
    isLoading: isSurveyLoading,
    error: surveyError,
    data: survey,
  } = useSurvey(surveyId);

  const { update } = useRouteParams();
  useEffect(() => {
    update({ surveyId: survey?.title });
  }, [survey?.title])

  return (
    <div>
      <Group>
         <Title   pb="xl" mb="xl">Survey: </Title>
         <Title   pb="xl" mb="xl" color={ "blue.9" } pl="lg" ml="lg">{survey?.title}</Title>
      </Group>

      <Responses survey={survey} />
    </div>
  )
}

export default ViewResponses