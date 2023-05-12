import {  getQuestions, getSurvey } from "../../../api"
import { Box, Group, Paper, Select, Stack, Title } from "@mantine/core"
import {  IconLetterCase, IconMail, IconPhone, IconStar } from '@tabler/icons-react';
import { useState } from "react";
import { QuestionType as Q } from "../../../types";
import { resetServerContext } from "react-beautiful-dnd"
import SelectedLanguageContext from "../../../context/SelectedLanguage";
import { QuestionTypeSelection } from "../../../components/Survey/Question/QuestionTypeSelection";
import { QuestionsSideBar } from "../../../components/Survey/QuestionsSideBar";
import { QuestionDetailedView } from "../../../components/Survey/Question/QuestionDetailedView";

export default ({survey, questions}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(survey.languages[0])
  // Opens question type menu to choose from
  const [typeSelectionOpen, setTypeSelectionOpen] = useState(true);
  const [selectedQ, setSelectedQ] = useState(null)

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

export async function getServerSideProps({params}) {

  // Fix for drag & drop
  resetServerContext()
  try {
    const survey = await (await getSurvey(params.surveyId)).json()
    const questions = await (await getQuestions(params.surveyId)).json();
    return {
      props: {
        survey,
        questions
      }
    }
  } catch (error) {
    console.error(error)
    return;
  }
}