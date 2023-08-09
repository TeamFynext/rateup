import { Box, Grid, Title, Paper, TextInput, Space, Text, Center, Stack, Container, Image, RingProgress, Modal, Group } from "@mantine/core";
import { useRouter } from "next/router";
import React, {useState, useEffect} from "react";
import { usePublicSurvey, useUpdateStartedMutation, useUpdateVisitedMutation, useVerifySurveyPwdMutation } from "../../../backend/surveys/surveys.query";
import { RateupButtonPrimary, RateupButtonSecondary } from "../../Button/RateupButtons";
import { IconArrowLeft } from "@tabler/icons-react";
import QuestionCountContext from "../../../context/QuestionCountContext";
import { useDisclosure } from '@mantine/hooks';

export const TakeSurveyLayoutWeb = ({ children }) => {
  const { surveyId } = useRouter().query as { surveyId: string };
  const { isLoading, isError, data: survey } = usePublicSurvey(surveyId);

  const { start } = useRouter().query as { start?: boolean };
  const [startClicked, setStartClicked] = useState(start || false);
  const [questionCount, setQuestionCount] = useState(0);
  const [currentQuestionNo, setCurrentQuestionNo] = useState(0);

  const updateStarted = useUpdateStartedMutation();

  const handleStartClick = () => {
    updateStarted.mutate(surveyId)
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
      <Container fluid px="10vw" py="5vh"  sx={{ background: '#F7F6FB',  height: "100vh" }}>
          <>
          <Image pb={30} 
              src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} 
              alt="RateUp Logo" width={140} height={35} />

          </>
          <Paper  p="sm" radius="lg" shadow="lg" sx={{ minHeight: "80vh" }}>
            <Container fluid>

                    {/* .........Survey Header Section.......... */}

            {startClicked ?
                   (currentQuestionNo > 0 && (
                    <Grid justify="center" align="center" pb={40} columns={24}>
                    <Grid.Col md={4} lg={4} xs={24} order={2}  orderSm={1} orderXs={1}>
                      <Center>
                      <Text>Question: {currentQuestionNo}</Text>
                      </Center>
                    </Grid.Col>
                    <Grid.Col md={16} lg={16} xs={24} order={1} orderSm={2} orderXs={2}>
                      <Center>
                        <Title order={2}>{survey.title}</Title>
                      </Center>
                    </Grid.Col>
                    <Grid.Col md={4} lg={4} xs={24} order={3} orderSm={3} orderXs={3}>
                    <Center>
                      <ProgressBar currentQuestionNo={currentQuestionNo} questionCount={questionCount} /> 
                      </Center>
                    </Grid.Col>
                  </Grid>
                    ))

                  :   
                        <Welcome onStart={handleStartClick} surveyId={surveyId} isProtected={survey?.isProtected}/>
                  }
                  { startClicked && children.children}
            </Container>

          <Center>
            <Text  fz="sm">Powered by </Text>
            <Image pl={10 }src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/logo.svg`} alt="RateUp Logo" width={80} height={20} />
          </Center>
          
          </Paper>

      </Container>
    </QuestionCountContext.Provider>

  );
};


function Welcome({ onStart, isProtected, surveyId }) {
  const [opened, { open, close }] = useDisclosure(false);

  const [passwordInput, setPasswordInput] = useState('')

  const updateSurveyPassword = useVerifySurveyPwdMutation(surveyId, passwordInput, onStart);

  const updateVisited = useUpdateVisitedMutation();

  useEffect(() => {
    if(surveyId)
      updateVisited.mutate(surveyId)
  }, [])

  return (
    <>
      <Modal opened={opened} onClose={close} title="Survey Login" centered size="sm">

        <Text size='sm' color="gray">Hey Welcome , <br/> You need to enter password to continue.</Text>
        <Space h="lg" />

        <Box pt={20} >
              <TextInput
                  required
                  label="Password"
                  placeholder="Enter survey password"
                  onChange={(event) => setPasswordInput(event.target.value)}
              />

        </Box>
            <Group  position="center" pt={40} >
                <RateupButtonPrimary
                    onClick={()=> updateSurveyPassword.mutate()}
                    title={"Login"} 
                    // disabled={!isNameValid} 
                    />
            </Group>
      </Modal>
      
      {/* .........Survey Welcome page.......... */}
      <Stack align="center" justify="center" spacing="xl" sx={{ height: "70vh" }}>
            <Title order={1} sx={{fontSize: '4rem', }}>Welcome</Title>
            <Text >Please fill the survey..</Text>
            <RateupButtonSecondary radius={"xl"} title="Go to Survey" size="lg" onClick={isProtected ? open  : onStart}/>
      </Stack>
      </>
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