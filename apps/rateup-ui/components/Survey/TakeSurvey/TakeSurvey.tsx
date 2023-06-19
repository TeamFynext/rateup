import SelectedLanguageContext from "../../../context/SelectedLanguage";
import {
  ActionIcon,
  Button,
  Center,
  Checkbox,
  Container,
  FileButton,
  Group,
  Loader,
  Rating,
  Stack,
  Text,Grid,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useRouter } from "next/router";
import { usePublicSurvey } from "../../../backend/surveys/surveys.query";
import { useContext, useEffect, useState } from "react";
import { SelectedQContext } from "../../../context/SelectedQ";
import {
  LDResponse,
  LogicAction,
  QuestionType as Q,
  YNResponse,
} from "../../../types/enums";
import { notifications } from "@mantine/notifications";
import {
  IconChevronLeft,
  IconChevronRight,
  IconThumbDown,
  IconThumbDownFilled,
  IconThumbUp,
  IconThumbUpFilled,
} from "@tabler/icons-react";
import { SmileyResponse } from "../../../types/enums";
import { DateInput } from "@mantine/dates";
import { useListState } from "@mantine/hooks";
import { CurrentResponsesContext } from "../../../context/ResponseContext";
import { createResponsePublic } from "../../../backend/surveys/response/response.api";
import { RateupButtonBlue, RateupButtonSecondary } from "../../Button/RateupButtons";
import QuestionCountContext from "../../../context/QuestionCountContext";

function TakeSurvey() {
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { surveyId } = useRouter().query as { surveyId: string };
  const { isLoading, isError, data: survey } = usePublicSurvey(surveyId);
  const [selectedQ, setSelectedQ] = useState<Question>(null);
  const [QnNo, setQnNo] = useState(1)

  const { setQuestionCount, setCurrentQuestionNo } = useContext(QuestionCountContext);


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
  

  if (isLoading) {
    return (
      <Center sx={{ height: "100vh" }}>
        <Loader />
      </Center>
    );
  }
  if (isError || !selectedQ) {
    return <Center sx={{ height: "100vh" }}>Something went wrong</Center>;
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
      const action = selectedQ.logic?.[currentResponse];
      if (action) {
        // Performing logic jump
        if (action === LogicAction.NextQ) {
          // Do nothing since we are already going to next question
        } else if (action === LogicAction.EndSurvey) {
          // End survey and submit
          submitSurvey({ surveyId, responses, selectedLanguage }).then(() => {
            router.push(`${surveyId}/end`);
          });
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
      submitSurvey({ surveyId, responses, selectedLanguage }).then(() => {
        router.push(`${surveyId}/end`);
      });
    }
  };

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

  return (
    <CurrentResponsesContext.Provider
      value={{ response: currentResponse, updateResponse }}
    >
      <SelectedQContext.Provider value={{ selectedQ }}>
        <Container h={"80vh"} size={"md"} sx={{ position: "relative" }}>
          <Stack p="md">
            <QuestionNo num={QnNo} />
            <QuestionTitle  />
            <QuestionDesc />
            <QuestionForm />
            <NextPrev next={handleNext} prev={handlePrev} />
          </Stack>
        </Container>
      </SelectedQContext.Provider>
    </CurrentResponsesContext.Provider>
  );
}

function submitSurvey({ surveyId, responses, selectedLanguage }) {
  return createResponsePublic({
    surveyId,
    responses,
    language: selectedLanguage,
  })
    .then(() => {
      notifications.show({
        message: "Survey completed!",
        color: "teal",
      });
    })
    .catch((e) => {
      console.error(e);
      notifications.show({
        message: "Something went wrong",
        color: "red",
      });
    });
}

function QuestionNo({num}) {
  return <Text size={"15px"}>Question: {num}</Text>;
}

function QuestionTitle() {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return <Text size={"30px"}>{selectedQ.title[selectedLanguage]}</Text>;
}
function QuestionDesc() {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return (
    <Text size={"15px"} c="dimmed" pb={20}>
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
    case Q.Email:
    case Q.Phone:
      return <TextForm />;
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

  if (isLoading || isError) return null;
  const isFirstQuestion = survey.questions.indexOf(selectedQ) === 0;
  const isLastQuestion =
    survey.questions.indexOf(selectedQ) === survey.questions.length - 1;
  return (

    <Grid  pb={40} sx={{ position: "absolute", bottom: "10vh", width: "100%" }}>
          <Grid.Col span={5}>
              {isFirstQuestion || (
          <RateupButtonSecondary radius={"xl"} title="" leftIcon={<IconChevronLeft />}
                sx={{ position: "absolute", }}
                size="lg" onClick={prev}/>
            )}
           </Grid.Col>
              <Grid.Col span={5}>

              {isLastQuestion ?

                 <RateupButtonBlue radius={"xl"} title={"Submit"} 
                  sx={{ position: "absolute", right: "5vw" }}
                  size="lg" onClick={next}/>
              :

              <RateupButtonSecondary radius={"xl"} title={"Next"}
              sx={{ position: "absolute", right: "5vw" }}
              size="lg" onClick={next} rightIcon={<IconChevronRight />}/>
              }
              </Grid.Col>

    </Grid>
  )
}

function TextForm() {
  // TODO: TextArea?
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    // <Textarea
    //   placeholder="Enter your answer"
    //   value={response || ""}
    //   onChange={(e) => updateResponse(e.currentTarget.value)}

    // />

    <TextInput
      placeholder="Enter your answer"
      value={response || ""}
      onChange={(e) => updateResponse(e.currentTarget.value)}
    />
  );
}

function RatingForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return <Rating value={response} onChange={updateResponse} />;
}

function LDForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      <ActionIcon onClick={() => updateResponse(LDResponse.Dislike)}>
        {response === LDResponse.Dislike ? (
          <IconThumbDownFilled />
        ) : (
          <IconThumbDown />
        )}
      </ActionIcon>
      <ActionIcon onClick={() => updateResponse(LDResponse.Like)}>
        {response === LDResponse.Like ? <IconThumbUpFilled /> : <IconThumbUp />}
      </ActionIcon>
    </Group>
  );
}

function OpinionScaleForm(){
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const renderButtons = () => {
    const buttons = [];
    for (let i = 1; i <= 10; i++) {
      buttons.push(
        <Button
          key={i}
          radius="xl"
          onClick={() => updateResponse(i)}
          color={response === i ? 'blue' : 'gray'}
          variant={response === i ? 'gradient' : 'outline'}
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
      <Button
        variant={response === YNResponse.No ? "light" : "subtle"}
        onClick={() => updateResponse(YNResponse.No)}
      >
        No
      </Button>
      <Button
        variant={response === YNResponse.Yes ? "light" : "subtle"}
        onClick={() => updateResponse(YNResponse.Yes)}
      >
        Yes
      </Button>
    </Group>
  );
}

// TODO: add the smileys
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
          variant={response === value ? "light" : "subtle"}
          onClick={() => updateResponse(value)}
        >
          {label}
        </Button>
      ))}
    </Group>
  );
}

function ImageForm() {
  console.error("Image storage not implemented");
  const [file, setFile] = useState<File | null>(null);
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  useEffect(() => {
    if (file) {
      // TODO: upload to file storage
      updateResponse(file.name);
    }
  }, [file]);
  return (
    <>
      <Group position="center">
        <FileButton onChange={setFile} accept="image/png,image/jpeg">
          {(props) => <Button variant="gradient" gradient={{ from: '#62CBE6', to: '#3F5BA9' }}{...props}>Upload image</Button>}
        </FileButton>
      </Group>

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

function DateForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <DateInput
      value={response}
      onChange={updateResponse}
      label="Date input"
      placeholder="Date input"
      maw={400}
      mx="auto"
    />
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

  console.error("Image storage not implemented");

  return (
    <Stack>
      <TextInput
        placeholder="Enter your name"
        label="Name"
        value={response?.name}
        onChange={handleNameChange}
      />
      <Textarea
        placeholder="Enter your testimonial"
        label="Testimonial"
        value={response?.testimonial}
        onChange={handleTestimonialChange}
      />
      {/* Will be brought back once image storing setup is  */}
      {/* <FileButton onChange={setFile} accept="image/png,image/jpeg">
        {(props) => <Button {...props}>Upload your image</Button>}
      </FileButton>

      {file && (
        <Text size="sm" align="center" mt="sm">
          Picked file: {file.name}
        </Text>
      )} */}
    </Stack>
  );
}
export default TakeSurvey;
