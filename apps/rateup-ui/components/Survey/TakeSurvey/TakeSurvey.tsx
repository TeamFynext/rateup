import SelectedLanguageContext from "../../../context/SelectedLanguage";
import {
  Button,
  Center,
  Checkbox,
  Container,
  FileButton,
  Group,
  Loader,
  Rating,
  Stack,
  Text, Grid,
  TextInput, Paper, Input,
  Textarea,
  Box, Image,
  Modal, useMantineTheme,
  Title,
  Divider,
  NumberInput,
  Avatar,
  Select, MultiSelect
} from "@mantine/core";
import { forwardRef } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from "next/router";
import { usePublicSurvey, useUpdateCompletedMutation } from "../../../backend/surveys/surveys.query";
import { useContext, useEffect, useState } from "react";
import { SelectedQContext } from "../../../context/SelectedQ";
import dayjs from 'dayjs';
import {
  LDResponse,
  LogicAction,
  QuestionType as Q,
  YNResponse,
} from "../../../types/enums";
import { notifications } from "@mantine/notifications";
import {
  IconCalendarEvent,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconMail,
  IconThumbDownFilled,
  IconThumbUpFilled,
} from "@tabler/icons-react";
import { SmileyResponse } from "../../../types/enums";
import { DateInput } from "@mantine/dates";
import { useListState } from "@mantine/hooks";
import { CurrentResponsesContext } from "../../../context/ResponseContext";
import { createResponsePublic } from "../../../backend/surveys/response/response.api";
import { RateupButtonBlackOutline, RateupButtonBlue, RateupButtonSecondary } from "../../Button/RateupButtons";
import QuestionCountContext from "../../../context/QuestionCountContext";
import { useStyles } from "./TakeSurvey.styles";
import { uploadFile } from "../../../utils/file-upload/upload";
import { useMediaQuery } from '@mantine/hooks';
import { parseLogicAction } from "../../../utils";
import { validateQuestion } from "../../../utils/validation";

function TakeSurvey() {
  const largeScreen = useMediaQuery('(min-width: 60em)');
  const [isSavingResponses, setIsSavingResponses] = useState(false)
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { surveyId } = useRouter().query as { surveyId: string };
  const { isLoading, isError, data: survey } = usePublicSurvey(surveyId);
  const [selectedQ, setSelectedQ] = useState<Question>(null);
  const [QnNo, setQnNo] = useState(1)
  const [opened, { open, close }] = useDisclosure(false);
  const theme = useMantineTheme();
  const isMobile = useMediaQuery('(max-width: 480px)');
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  }>(undefined);

  const { setQuestionCount, setCurrentQuestionNo, questionCount } = useContext(QuestionCountContext);
  const updateCompleted = useUpdateCompletedMutation();

  const [responses, handlers] = useListState<QuestionResponse>([]);
  // Used to track questions filled by user. Since there may be logical jumps, this can be used by handlePrev to get the previous question
  const [questionsHistory, questionsHistoryHandlers] = useListState<string>([]);
  const router = useRouter();

  if (!selectedLanguage) throw new Error("No language selected");

  useEffect(() => {
    if (survey.questions.length > 0 && selectedQ === null) {
      setSelectedQ(survey.questions[0]);
      questionsHistoryHandlers.append(survey.questions[0].id);
    }
    setQuestionCount(survey.questions.length)
  }, [survey]);

  useEffect(() => {
    const index = survey.questions.indexOf(selectedQ);
    setQnNo(index + 1)
    setCurrentQuestionNo(index + 1)
  }, [selectedQ])

  // Getting location coordinates
  // TODO: fetching location is very slow. Plan what to do when user finishes survey before location is fetched
  useEffect(() => {
    if (survey.getLocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        },
        (error) => {
          console.error(error);
        }
      );
    }
  }, [survey])


  if (isLoading) {
    return (
      <Center sx={{ height: "100vh" }}>
        <Loader />
      </Center>
    );
  }
  if (isError || !selectedQ) {
    return <Center sx={{ height: "100vh" }}>
      <Text fw={500} >
        {questionCount == 0 ? "No Questions found!" : "Something went wrong!"}

      </Text>
    </Center>;
  }

  const currentQRes = responses.find((r) => r.questionId === selectedQ.id);
  let currentResponse = currentQRes?.response[selectedQ.type];

  const goTo = (question: Question) => {
    setSelectedQ(question);
    questionsHistoryHandlers.append(question.id);
  };

  const goBack = () => {
    const prevQId = questionsHistory[questionsHistory.length - 2];
    setSelectedQ(survey.questions.find((q) => q.id === prevQId));
    questionsHistoryHandlers.pop();
  };

  const handleNext = () => {
    const index = survey.questions.indexOf(selectedQ);
    if (index === -1) throw new Error("Question not found"); // this should never happen

    if (index < survey.questions.length - 1) {
      // Not last question
      // Checking for logic jump
      const action = parseLogicAction(selectedQ.type, selectedQ.logic, currentResponse)
      if (action) {
        // Performing logic jump
        if (action === LogicAction.NextQ) {
          // Do nothing since we are already going to next question
        } else if (action === LogicAction.EndSurvey) {
          // End survey and submit
          open()
          return;
        } else {
          // Action is a question id
          const nextQ = survey.questions.find((q) => q.id === action);
          if (!nextQ) {
            // quietly go to next question
            console.error(
              "Question not found. Invalid logic jump. Going to next question"
            );
          } else {
            goTo(nextQ);
            return;
          }
        }
      }
      goTo(survey.questions[index + 1]);
    } else {
      // Survey completed
      open()
    }
  };

  const finishSurvey = () => {
    setIsSavingResponses(true)
    let shouldShowGoogleReview = false;
    const { start } = router.query as { start: string };  //(TODO - Temp) change for survey merge 

    for (let question of survey?.questions) {
      if (question?.googleReview) {
        let userResponse = responses.find(r => r?.questionId === question?.id);
        if (userResponse) {
          switch (question?.type) {
            case "Rating":
              if (userResponse?.response?.Rating >= question?.googleReview?.minRating) {
                shouldShowGoogleReview = true;
              }
              break;
            case "Opinion Scale":
              if (userResponse?.response["Opinion Scale"] >= question?.googleReview?.minOpinion) {
                shouldShowGoogleReview = true;
              }
              break;
            case "Smiley":
              if (question?.googleReview?.reqOptions.includes(userResponse?.response?.Smiley)) {
                shouldShowGoogleReview = true;
              }
              break;
            default:
              break;
          }
        }
      }

      if (shouldShowGoogleReview) {
        break;
      }
    }

    // if (shouldShowGoogleReview) {
    //     console.log("Show Google Review");
    // } else {
    //     console.log("Don't show Google Review");
    // }

    submitSurvey({ surveyId, responses, selectedLanguage, setIsSavingResponses, coordinates }).then(() => {
      updateCompleted.mutate(surveyId)
      let kioskMode = survey?.kioskMode ? "y" : "n"
      kioskMode = start === 'true' ? "cs" : kioskMode // temp for static cs demo (TODO)
      shouldShowGoogleReview ? router.push(`${surveyId}/end?k=${kioskMode}&msg=thanks`) : router.push(`${surveyId}/end?k=${kioskMode}`)
    });
  }

  const handlePrev = () => {
    goBack();
  };

  const updateResponse = (response: object) => {
    const index = responses.findIndex((r) => r.questionId === selectedQ.id);
    // Converting response to QuestionResponse
    const formattedResponse: QuestionResponse = {
      response: {
        [selectedQ.type]: response,
      },
      questionId: selectedQ.id,
      type: selectedQ.type,
    };
    if (index === -1) {
      handlers.append(formattedResponse);
    } else {
      handlers.setItem(index, formattedResponse);
    }
  };

  const responseValues = responses.map(item => {
    const key = Object.keys(item.response)[0];
    const value = item.response[key];
    return value;
  });

  const filteredQuestions = survey?.questions?.filter(
    question => question?.title[selectedLanguage]
  );

  return (
    <CurrentResponsesContext.Provider
      value={{ response: currentResponse, updateResponse }}
    >
      <SelectedQContext.Provider value={{ selectedQ }}>
        <Container h={isMobile ? "53vh" : "60vh"} size={"md"} sx={{ position: "relative" }}>
          {/* TODO for mobile design 80vh */}

          <Modal
            opened={opened}
            title="Confirm your responses"
            onClose={close}
            overlayProps={{
              color: theme.colorScheme === 'dark' ? theme.colors.dark[9] : theme.colors.gray[2],
              opacity: 0.55,
              blur: 3,
            }}
            styles={{
              title: {
              fontSize: '26px',
              fontWeight: 700,
              padding: "10px"
            }}}
          >
            <Stack pb="5rem">
              <Divider />
              <Stack >
                {filteredQuestions.map(question => {
                  const response = responses.find(
                    response => response.questionId === question.id
                  );

                  return (
                    <Stack key={question.id}>
                      <Title pt="sm" order={4}>{question.title[selectedLanguage]}</Title>
                      {response && (
                        <Text pb="sm">
                          {question.type === 'DateTime' ? (
                            dayjs(Object.values(response?.response)[0]).format('DD, MMM , YYYY')
                          ) : (
                            JSON.stringify(Object.values(response?.response)[0])
                          )}

                        </Text>
                      )}
                      <Divider />
                    </Stack>
                  );
                })}
              </Stack>

              <div style={{ position: "fixed", bottom: 0, left: 10, right: 10, }}>
                <Group position="apart" p="lg" sx={{ background: '#fff' }}>
                  <RateupButtonBlackOutline
                    radius={"xl"}
                    title={"Back"}
                    size={largeScreen ? "lg" : "md"}
                    onClick={close}
                    leftIcon={<IconChevronLeft />}
                  />

                  <RateupButtonBlue
                    loading={isSavingResponses}
                    radius={"xl"}
                    title={"Confirm"}
                    size={largeScreen ? "lg" : "md"}
                    leftIcon={<IconCheck />}
                    onClick={finishSurvey}
                  />
                </Group>
              </div>
            </Stack>
          </Modal>


          <Stack mt="xl">
            {/* <QuestionNo num={QnNo} /> */}

            <QuestionTitle largeScreen={largeScreen} />
            <QuestionDesc largeScreen={largeScreen} />
            <QuestionForm />

            <NextPrev next={handleNext} prev={handlePrev} />
          </Stack>
        </Container>
      </SelectedQContext.Provider>
    </CurrentResponsesContext.Provider>
  );
}

function submitSurvey({ surveyId, responses, selectedLanguage, setIsSavingResponses, coordinates }) {
  return createResponsePublic({
    surveyId,
    responses,
    language: selectedLanguage,
    location: { coordinates },
  })
    .then(() => {
      notifications.show({
        message: "Survey completed!",
        color: "teal",
      });
      setIsSavingResponses(false)
    })
    .catch((e) => {
      console.error(e);
      notifications.show({
        message: "Something went wrong",
        color: "red",
      });
      setIsSavingResponses(false)
    });
}

function QuestionNo({ num }) {
  return <Text size={"15px"}>Question: {num}</Text>;
}

function QuestionTitle({ largeScreen }) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return <Text fw={500} size={largeScreen ? "30px" : "18px"}>{selectedQ.title[selectedLanguage]}</Text>;
}
function QuestionDesc({ largeScreen }) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return (
    <Text size={largeScreen ? "15px" : "12px"} c="dimmed" pb={largeScreen ? 20 : 10}>
      {selectedQ.description[selectedLanguage]}
    </Text>
  );
}

function QuestionForm() {
  const { selectedQ } = useContext(SelectedQContext);
  const { type } = selectedQ;

  return <Group>{getQuestionForm(type)}</Group>;
}

function getQuestionForm(type) {
  switch (type) {
    case Q.Text:
      return <TextForm />;
    case Q.TextArea:
      return <TextAreaForm />;
    case Q.Number:
      return <NumberForm />;
    case Q.Phone:
      return <PhoneForm />;
    case Q.Email:
      return <EmailForm />;
    case Q.Rating:
      return <RatingForm />;
    case Q.LD:
      return <LDForm />;
    case Q.YN:
      return <YNForm />;
    case Q.Opinion:
      return <OpinionScaleForm />;
    case Q.Smiley:
      return <SmileyForm />;
    case Q.Photo:
      return <ImageForm />;
    case Q.MCQ:
      return <MCQForm />;
    case Q.MSQ:
      return <MSQForm />;
    case Q.DDSS:
      return <DDSSForm />;
    case Q.DDMS:
      return <DDMSForm />;
    case Q.Testimonial:
      return <TestimonialForm />;
    case Q.DateTime:
      return <DateForm />;
    default:
      return <div>not implemented</div>;
  }
}

function NextPrev({ prev, next }) {
  const { surveyId } = useRouter().query as { surveyId: string };
  const { isLoading, isError, data: survey } = usePublicSurvey(surveyId);
  const { selectedQ } = useContext(SelectedQContext);
  const { response } = useContext(CurrentResponsesContext);

  const [isErrorInput, setIsErrorInput] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    // TODO: check if rebase was done correctly
    if (selectedQ?.required && response && selectedQ?.type === 'Email') {
      setErrorMsg(/^\S+@\S+$/.test(response) ? null : "Invalid email");
      if (!(/^\S+@\S+$/.test(response))) {
        setIsErrorInput(false)
      }
    } else if (selectedQ?.required && response && selectedQ?.type === 'Phone') {
      setErrorMsg(/^\d{10}$/.test(response) ? null : "Invalid Phone")
      if (!/^\d{10}$/.test(response)) {
        setIsErrorInput(false)
      }
    } else if (selectedQ?.required && response && selectedQ?.type === 'Testimonial') {
      const { name, testimonial } = response;
      if (name?.length < 3 || testimonial?.length < 5) {
        setErrorMsg("Name - min 3 characters, and \n testimonial - min 5 characters");
        setIsErrorInput(true);
      } else {
        setErrorMsg("");
        setIsErrorInput(false);
      }
    } else {
      setErrorMsg("");
      setIsErrorInput(false);
    }

    //custom validation rules
    if (selectedQ?.validationRules && response &&
      (selectedQ?.type === 'Number' || selectedQ?.type === 'Text' || selectedQ?.type === 'TextArea')
    ) {
      let error = validateQuestion(selectedQ, response)
      if (error?.length > 0) {
        setIsErrorInput(true)
        setErrorMsg(error?.length ? error : null);
      }
      if (!error) {
        setIsErrorInput(false)
      }
    }

  }, [response])

  function handleNextClick() {
    if (selectedQ?.type === 'Email' || selectedQ?.type === 'Phone' || selectedQ?.type === 'Testimonial') {
      if (!errorMsg) {
        next();
      } else {
        setIsErrorInput(true);
      }
    } else {
      next();
    }
  }

  if (isLoading || isError) return null;
  const isFirstQuestion = survey.questions.indexOf(selectedQ) === 0;
  const isLastQuestion =
    survey.questions.indexOf(selectedQ) === survey.questions.length - 1;
  return (

    <Stack pb={40} sx={{ position: "absolute", bottom: "6vh", width: "100%" }}>
      {selectedQ.required && !response &&
        <Text color="gray">Note: * Must attend to continue with next.</Text>
      }
      {errorMsg && isErrorInput &&
        <Text color="red">Note: * {errorMsg}</Text>
      }
      <Grid>
        <Grid.Col span={6}>
          {isFirstQuestion || (
            <RateupButtonSecondary radius={"xl"} title="" leftIcon={<IconChevronLeft />}
              sx={{ position: "absolute", }}
              size="lg" onClick={prev} />
          )}
        </Grid.Col>
        <Grid.Col span={6}>

          {isLastQuestion ?

            <RateupButtonBlue radius={"xl"} title={"Submit"}
              disabled={((selectedQ?.required || selectedQ?.validationRules) && !response) || isErrorInput}
              sx={{ position: "absolute", right: "5vw" }}
              size="lg" onClick={handleNextClick} />
            :

            <RateupButtonSecondary radius={"xl"} title={"Next"} disabled={((selectedQ?.required || selectedQ?.validationRules) && !response) || isErrorInput}
              sx={{ position: "absolute", right: "5vw" }}
              size="lg" onClick={handleNextClick} rightIcon={<IconChevronRight />} />
          }
        </Grid.Col>
      </Grid>
    </Stack>
  )
}

function TextForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const { classes } = useStyles();

  return (
    <Paper shadow="sm"
      className={classes.inputBox}
    >
      <Input
        placeholder="Enter your answer"
        value={response || ""}
        onChange={(e) => updateResponse(e.currentTarget.value)}
        sx={{ maxWidth: "400px" }}
        variant="unstyled"
        radius="xl"
        size="sm"
      />
    </Paper>

  );
}

function TextAreaForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const { classes } = useStyles();

  return (
    <Paper shadow="sm"
      className={classes.inputBox}
    >
      <Textarea
        placeholder="Enter your answer"
        value={response ? response.replace(', ', '\n') : ""}
        onChange={(e) => {
          const replacedValue = e.currentTarget.value.replace(/\n/g, ', ');
          updateResponse(replacedValue)
        }}
        sx={{ maxWidth: "400px" }}
        variant="unstyled"
        radius="xl"
        size="sm"
      />
    </Paper>

  );
}

function NumberForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const { classes } = useStyles();

  return (
    <Paper shadow="sm"
      className={classes.inputBox}
    >
      <NumberInput
        size="sm"
        type="number"
        placeholder="Enter number input"
        value={response || undefined}
        onChange={(value) => updateResponse(value)}
        //onBlur={handleInputBlur}
        variant="unstyled"
      //error={numberError && !isFocused  ? 'Invalid phone number' : null}
      />
    </Paper>

  );
}


function PhoneForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const { classes } = useStyles();
  const [phoneError, setPhoneError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  const data = [
    {
      image: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/flag_india.png`,
      label: '+91',
      value: '91',
      description: 'India',
    },

  ];

  interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
    image: string;
    label: string;
    description: string;
  }

  const SelectItem = forwardRef<HTMLDivElement, ItemProps>(
    ({ image, label, description, ...others }: ItemProps, ref) => (
      <div ref={ref} {...others}>
        <Group noWrap>
          <Avatar src={image} sx={{ minWidth: "50px" }} />
          <div>
            <Text size="sm">{label}</Text>
            <Text size="xs" opacity={0.65}>
              {description}
            </Text>
          </div>
        </Group>
      </div>
    )
  );

  //TODO : save with 91 in db if required

  useEffect(() => {
    if (response)
      setPhoneError(/^\d{10}$/.test(response) ? null : "Invalid phone number");
  }, [response])

  const handleInputBlur = () => {
    if (phoneError) {

    }
    setIsFocused(false)
  };
  const handleInputChange = (value: number) => {
    setIsFocused(true)
    const phone = value;
    updateResponse(phone);
    setPhoneError(/^\d{10}$/.test(response) ? null : "Invalid phone number");
  };

  return (
    <Paper shadow="sm"
      className={classes.inputBox}
    >
      <Group>
        <Select
          sx={{ maxWidth: "140px" }}
          placeholder="Select Country Code"
          itemComponent={SelectItem}
          data={data}
          searchable
          maxDropdownHeight={400}
          defaultValue={data[0].value}
          nothingFound="No results"
          filter={(value, item) =>
            item.label.toLowerCase().includes(value.toLowerCase().trim()) ||
            item.description.toLowerCase().includes(value.toLowerCase().trim())
          }
        />
        <NumberInput
          size="sm"
          max={9999999999}
          type="number"
          placeholder="Enter 10 digit phone number"
          hideControls
          value={response || ""}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          variant="unstyled"
          error={phoneError && !isFocused ? 'Invalid phone number' : null}
        />
      </Group>


    </Paper>

  );
}

function EmailForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [emailError, setEmailError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const { classes } = useStyles();

  useEffect(() => {
    if (response)
      setEmailError(/^\S+@\S+$/.test(response) ? null : "Invalid email");
  }, [response])

  const handleInputBlur = () => {
    if (emailError) {
      // console.log("Invalid email");
    }
    setIsFocused(false)
  };
  const handleInputChange = (e) => {
    setIsFocused(true)
    const email = e.target.value;
    updateResponse(email);
    setEmailError(/^\S+@\S+$/.test(email) ? null : "Invalid email");
  };

  return (
    <Paper shadow="sm"
      className={classes.inputBox}
    >
      <TextInput
        placeholder="Enter email address"
        value={response || ""}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        sx={{ maxWidth: "400px" }}
        error={emailError && !isFocused ? 'Invalid email' : null}
        icon={<IconMail size="1.2rem" color="black" />}
        variant="unstyled"
      />
    </Paper>
  );
}

function RatingForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return <Paper px={30} py={20} radius="lg"><Rating value={response} onChange={updateResponse} size="xl" /></Paper>;
}

function LDForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      <Box w={120}>
        <Button
          color={response === LDResponse.Like ? "yellow" : "dark.0"}
          size="lg"
          px="md"
          fullWidth
          radius="md"
          leftIcon={<IconThumbUpFilled />}
          onClick={() => updateResponse(LDResponse.Like)}
        >
          Like
        </Button>
      </Box>
      <Box w={130}>

        <Button
          color={response === LDResponse.Dislike ? "yellow" : "dark.0"}
          size="lg"
          px="md"
          radius="md"
          fullWidth
          leftIcon={<IconThumbDownFilled />}
          onClick={() => updateResponse(LDResponse.Dislike)}
        >
          Dislike
        </Button>
      </Box>
    </Group>
  );
}

function OpinionScaleForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const renderButtons = () => {
    const buttons = [];
    for (let i = 1; i <= 10; i++) {
      buttons.push(
        <Button
          key={i}
          radius="xl"
          onClick={() => updateResponse(i)}
          color={response === i ? 'blue' : 'blue.9'}
          variant={response === i ? 'gradient' : 'default'}
          gradient={{ from: '#62CBE6', to: '#3F5BA9' }}
        >
          {i}
        </Button>
      );
    }
    return buttons
  }

  return (
    <Group position="center" spacing="xs">
      {renderButtons()}
    </Group>
  );
}

function YNForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      <Box w={100}>
        <Button
          color={response === YNResponse.No ? "yellow" : "dark.0"}
          size="lg"
          px="xl"
          fullWidth
          radius="md"
          onClick={() => updateResponse(YNResponse.No)}
        >
          No
        </Button>
      </Box>
      <Box w={100}>

        <Button
          color={response === YNResponse.Yes ? "yellow" : "dark.0"}
          size="lg"
          px="xl"
          radius="md"
          fullWidth
          onClick={() => updateResponse(YNResponse.Yes)}
        >
          Yes
        </Button>
      </Box>
    </Group>
  );
}

// TODO: improve smileys
const SMILEY_OPTIONS = Object.entries(SmileyResponse).map(([type, value]) => ({
  value: type,
  label: value,
}));
function SmileyForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      {SMILEY_OPTIONS.map(({ value, label }) => (
        <Button
          key={value}
          variant={response === value ? "gradient" : "default"}
          gradient={{ from: '#62CBE6', to: '#3F5BA9' }}
          onClick={() => updateResponse(value)}
          sx={{ minHeight: '70px', maxWidth: '90px' }}
        >
          {/* <Stack> */}
          <Image src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/images/smileys/${value}.png`} width={50} height={50} />
          {/* <Text> {label}</Text>

          </Stack> */}

        </Button>
      ))}
    </Group>
  );
}

function ImageForm() {
  const [file, setFile] = useState<File | null>(null);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  useEffect(() => {
    const uploadAndUpdate = async () => {
      if (file) {
        const fileKey = await uploadFile(file);
        updateResponse(fileKey);
        //console.log("File Name:...." + JSON.stringify("https://d2uj946b0i8y27.cloudfront.net/"+fileKey));
      }
    };
    uploadAndUpdate();
  }, [file]);
  return (
    <>
      <Box w={300}>
        <FileButton onChange={setFile} accept="image/png,image/jpeg">
          {(props) => <Button fullWidth size="lg" radius="lg"
            variant="gradient" gradient={{ from: '#62CBE6', to: '#3F5BA9' }}{...props}>Upload image</Button>}
        </FileButton>
      </Box>

      {file && (
        <Text size="sm" align="center" mt="sm">
          Picked file: {file.name}
        </Text>
      )}
    </>
  );
}

function MCQForm() {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ.choices[selectedLanguage];

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Stack>
      {choices.map((choice) => (
        <Checkbox
          checked={response === choice}
          onChange={() => updateResponse(choice)}
          key={choice}
          label={choice}
        />
      ))}
    </Stack>
  );
}

function MSQForm() {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ.choices[selectedLanguage];

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Checkbox.Group value={response} onChange={updateResponse}>
      <Stack>
        {choices.map((choice) => (
          <Checkbox value={choice} key={choice} label={choice} />
        ))}
      </Stack>
    </Checkbox.Group>
  );
}

function DDSSForm() {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ.choices[selectedLanguage];

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const data = choices.map((choice) => ({ value: choice, label: choice }));

  return (
    <Select
      sx={{ minWidth: "300px", maxWidth: "500px" }}
      label="Select one option"
      placeholder="Pick one"
      data={data}
      value={response}
      onChange={(e) => updateResponse(e)}
    />
  );
}

function DDMSForm() {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const choices = selectedQ.choices[selectedLanguage];

  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const data = choices.map((choice) => ({ value: choice, label: choice }));

  return (
    <MultiSelect
      sx={{ minWidth: "300px", maxWidth: "500px" }}
      data={data}
      value={response}
      onChange={updateResponse}
      label="Select one or more options"
      placeholder="Pick one or more"
    />
  );
}

function DateForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const { classes } = useStyles();
  return (
    <Paper shadow="sm"
      className={classes.inputBox}
    >
      <DateInput
        value={response}
        onChange={updateResponse}
        placeholder="Select date"
        maw={400}
        mx="auto"
        variant="unstyled"
        icon={<IconCalendarEvent size="1.2rem" color="black" />}

      />
    </Paper>
  );
}

function TestimonialForm() {
  // TODO: show some disclaimer about the image & testimonial being being displayed in public
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [file, setFile] = useState<File>(response?.file);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateResponse({ ...response, name: e.currentTarget.value });
  };
  const handleTestimonialChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    updateResponse({ ...response, testimonial: e.currentTarget.value });
  };
  //TODO: image storage
  console.error("Image storage not implemented");
  const { classes } = useStyles();

  return (
    <>
      <Paper shadow="sm"
        className={classes.inputBox}
      >
        <TextInput
          placeholder="Enter your name"
          value={response?.name}
          onChange={handleNameChange}
          sx={{ maxWidth: "400px" }}
          variant="unstyled"
        />
      </Paper>
      <Paper shadow="sm"
        className={classes.inputBox}
      >
        <Textarea
          placeholder="Enter your testimonial"
          value={response?.testimonial}
          onChange={handleTestimonialChange}
          sx={{ maxWidth: "400px" }}
          variant="unstyled"
        />
      </Paper>
      {/* Will be brought back once image storing setup is  */}
      {/* <FileButton onChange={setFile} accept="image/png,image/jpeg">
        {(props) => <Button {...props}>Upload your image</Button>}
      </FileButton>

      {file && (
        <Text size="sm" align="center" mt="sm">
          Picked file: {file.name}
        </Text>
      )} */}
    </>
  );
}
export default TakeSurvey;
