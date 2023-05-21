import { Box, Center, Group, Loader, Paper, Select, Stack, Text, Title } from "@mantine/core"
import { useEffect, useState } from "react";
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionTypeSelection } from "../../../components/Survey/Question/QuestionTypeSelection";
import { QuestionsSideBar } from "../../../components/Survey/QuestionsSideBar";
import { QuestionDetailedView } from "../../../components/Survey/Question/QuestionDetailedView";
import { getQuestions } from "../../../api/surveys/questions/questions.api";
import { getSurvey } from "../../../api/surveys/survey.api";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";


export default () => {
  const router = useRouter()
  const { surveyId } = router.query

  if(Array.isArray(surveyId)) {
    throw new Error('surveyId is an array');
  }

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
  const [typeSelectionOpen, setTypeSelectionOpen] = useState(false);
  const [selectedQ, setSelectedQ] = useState<Question>(null)

  useEffect(() => {
    if(survey) {
      setSelectedLanguage(survey.languages[0])
    }
  }, [survey])

  useEffect(() => {
    if(!selectedQ) return;
    if(questions && selectedQ.id) {
      const Q = questions.find(q => q.id === selectedQ.id);
      if(Q) {
        setSelectedQ(Q)
      }
    }
  }, [questions])


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
    {/** TODO: Remove fixed height and make this responsive */}
    <Box sx={{display: "flex", gap: 8, height: "70vh"}}>
        <Paper p={"sm"} sx={{flex: 2}}>
          <Stack>
            <QuestionsSideBar
             questions={questions}
             setTypeSelectionOpen={setTypeSelectionOpen}
             setSelectedQ={setSelectedQ} />
          </Stack>
        </Paper>
        <Paper p={"sm"} sx={{flex: 5}}>
            {selectedQ ? (
              <QuestionDetailedView
                question={selectedQ}
                setSelectedQ={setSelectedQ}
               />
            ): typeSelectionOpen ? (
              <QuestionTypeSelection
                setSelectedQ={setSelectedQ}
              />
            ): (
              <Center sx={{height: "100%"}}>
                <Text c="dimmed" >Select a question to edit</Text>
              </Center>
            )}
        </Paper>
    </Box>
  </Stack>
  </SelectedLanguageContext.Provider>
  );

}
