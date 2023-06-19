import { Box, Grid, Title, Text, Center, Stack, Container, Image, RingProgress} from "@mantine/core";
import { useRouter } from "next/router";
import React, {useState} from "react";
import { usePublicSurvey } from "../../../backend/surveys/surveys.query";
import { RateupButtonSecondary } from "../../Button/RateupButtons";
import { IconArrowLeft } from "@tabler/icons-react";
import QuestionCountContext from "../../../context/QuestionCountContext";

export const TakeSurveyLayout = ({ children }) => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const { isLoading, isError, data: survey } = usePublicSurvey(surveyId);

  const [startClicked, setStartClicked] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [currentQuestionNo, setCurrentQuestionNo] = useState(0);

  const handleStartClick = () => {
    setStartClicked(true);
  };

  if (isLoading || isError || !survey) return null;

  return (
    <QuestionCountContext.Provider    
    value={{
     questionCount,
     currentQuestionNo,
     setQuestionCount,
     setCurrentQuestionNo,
   }}>
      <Container  sx={{ height: "100vh", background: '#F7F7F7' }}>
          <Box  p="sm">
            {startClicked ?

          <Grid justify="center" align="center" pb={40}>
              <Grid.Col span={1}>
                <Center> 
                  {/* TODO back action */}
                  <IconArrowLeft />
                </Center>
              </Grid.Col>
              <Grid.Col span={8}>
                <Center>
                  <Title order={2}>{survey.title}</Title>
                </Center>
              </Grid.Col>
              <Grid.Col span={3}>
                {currentQuestionNo > 0 && (
                  <Center>
                    <ProgressBar currentQuestionNo={currentQuestionNo} questionCount={questionCount} /> 
                  </Center>
                )}
              </Grid.Col>
          </Grid>
            :   
                  <Welcome onStart={handleStartClick} />
            }
            { startClicked && children.children}
          </Box>

          <Center mb={30}>
            <Text fz="sm">Powered by </Text>
            <Image pl={10 }src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} alt="RateUp Logo" width={80} height={20} />
          </Center>

      </Container>
    </QuestionCountContext.Provider>

  );
};


function Welcome({ onStart }) {
  return (
      <Stack align="center" justify="center" spacing="xl" sx={{ height: "80vh" }}>
            <Title order={1} sx={{fontSize: '4rem', }}>Welcome</Title>
            <Text >Please fill the survey..</Text>
      <RateupButtonSecondary radius={"xl"} title="Go to Survey" size="lg" onClick={onStart}/>
      </Stack>
  );
}

const ProgressBar = ({ currentQuestionNo, questionCount }) => {
  const progressPercentage = (currentQuestionNo / questionCount) * 100;

  return (
    <RingProgress
      size={60}
      thickness={5}
      sections={[{ value: progressPercentage, color: 'black' }]}
      label={
        <Text color="black" weight={700} align="center" size="xs">
          {currentQuestionNo}/{questionCount}
        </Text>
      }
    />
  );
};