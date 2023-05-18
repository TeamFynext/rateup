import { Box, Group, Loader, Paper, Select, Stack, Title } from "@mantine/core"
import {  IconLetterCase, IconMail, IconPhone, IconStar } from '@tabler/icons-react';
import { useEffect, useState } from "react";
import { QuestionType as Q } from "../../../types";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionTypeSelection } from "../../../components/Survey/Question/QuestionTypeSelection";
import { QuestionsSideBar } from "../../../components/Survey/QuestionsSideBar";
import { QuestionDetailedView } from "../../../components/Survey/Question/QuestionDetailedView";
import { getQuestions } from "../../../api/surveys/questions/questions.api";
import { getSurvey } from "../../../api/surveys/survey.api";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";

export default () => {
  // Get survey id from url
  const router = useRouter()
  const {surveyId} = router.query

  const {isLoading: isSurveyLoading, error: surveyError, data: survey} = useQuery({
    queryKey: ['survey', surveyId],
    queryFn: () => getSurvey(surveyId)

  })

  const {isLoading, error, data: questions} = useQuery({
    queryKey: ['questions', surveyId],
    queryFn: () => getQuestions(surveyId),
  })

  const [selectedLanguage, setSelectedLanguage] = useState(null)
  // Opens question type menu to choose from
  const [typeSelectionOpen, setTypeSelectionOpen] = useState(true);
  const [selectedQ, setSelectedQ] = useState(null)

  // create useEffect and if survey not null set selectedLanguage to surveys.languages[0]
  useEffect(() => {
    if(survey) {
      setSelectedLanguage(survey.languages[0])
    }
  }, [survey])

  if(isLoading || isSurveyLoading) return <Loader />
  if(error || surveyError) {
    console.log(error, surveyError)
    return 'An error has occurred'
  }
  
  return (
  <SelectedLanguageContext.Provider value={{selectedLanguage}}>
  <Stack sx={{height: "100%"}} >
    <Group position="apart" >
    <Title>{survey.title}</Title>
    <Select
      data={survey.languages}
      value={selectedLanguage}
      onChange={setSelectedLanguage}
      />
    </Group>
    <Box sx={{display: "flex", gap: 8, height: "100%"}}>
        <Paper p={"sm"} sx={{flex: 2}}>
          <Stack>
            <QuestionsSideBar
             questions={questions} setTypeSelectionOpen={setTypeSelectionOpen}
             setSelectedQ={setSelectedQ} />
          </Stack>
        </Paper>
        <Paper p={"sm"} sx={{flex: 5}}>
            {typeSelectionOpen ? (
              <QuestionTypeSelection />
            ):(
              <QuestionDetailedView
                question={questions.find(q => q.id === selectedQ)}
               />
            )}
        </Paper>
    </Box>
  </Stack>
  </SelectedLanguageContext.Provider>
  );

}

// TODO: add rest
export const questionTypesList = {
  [Q.Text]: {
    icon: <IconLetterCase />,
    label: "Text"
  },  [Q.Email]: {
    icon: <IconMail />,
    label: "Email"
  },  [Q.Phone]: {
    icon: <IconPhone />,
    label: "Phone"
  },  [Q.Rating]: {
    icon: <IconStar />,
    label: "Rating"
  },  [Q.LD]: {
    icon: <IconLetterCase />,
    label: "Like or Dislike"
  },  [Q.YN]: {
    icon: <IconLetterCase />,
    label: "Yes or No"
  },  [Q.MCQ]: {
    icon: <IconLetterCase />,
    label: "Multiple Choice"
  },  [Q.MSQ]: {
    icon: <IconLetterCase />,
    label: "Multiple Select"
  },
}