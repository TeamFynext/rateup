import SelectedLanguageContext from "../../../../context/SelectedLanguage";
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
  Text,
  TextInput,
  Paper,
  Input,
  Textarea,
  Box,
  Image,
  Modal,
  useMantineTheme,
  Title,
  Divider,
  NumberInput,
  Select,
  MultiSelect,
  Combobox,
  InputBase,
  useCombobox,
  Flex,
  ActionIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/router";
import {
  usePublicSurvey,
  useUpdateCompletedMutation,
} from "../../../../backend/surveys/surveys.query";
import { useContext, useEffect, useState } from "react";
import { SelectedQContext } from "../../../../context/SelectedQ";
import dayjs from "dayjs";
import {
  LDResponse,
  LogicAction,
  QuestionType as Q,
  YNResponse,
} from "../../../../types/enums";
import { notifications } from "@mantine/notifications";
import {
  IconCalendarEvent,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconMail,
  IconThumbDownFilled,
  IconThumbUpFilled,
  IconX,
} from "@tabler/icons-react";
import { DateInput } from "@mantine/dates";
import { useListState } from "@mantine/hooks";
import { CurrentResponsesContext } from "../../../../context/ResponseContext";
import { createResponsePublic } from "../../../../backend/surveys/response/response.api";
import {
  RateupButtonBlackOutline,
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../Button/RateupButtons";
import QuestionCountContext from "../../../../context/QuestionCountContext";
import classes from "./TakeSurvey.module.css";
import modalStyles from "./ModalStyles.module.css";
import { uploadFile } from "../../../../utils/file-upload/upload";
import { useMediaQuery } from "@mantine/hooks";
import { parseLogicAction } from "../../../../utils";
import { validateQuestion } from "../../../../utils/validation";
import SmileyRating, { mapSmileyIcon } from "../RatingSmiley";
import { GilroySemibold } from "../../../../public/fonts";
import Flag from "react-world-flags";
import { getFileName } from "../../SurveyTheme/components/BackgroundStyles";

function TakeSurvey() {
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const [isSavingResponses, setIsSavingResponses] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const { surveyId } = useRouter().query as { surveyId: string };
  const { isLoading, isError, data: survey } = usePublicSurvey(surveyId);
  const [selectedQ, setSelectedQ] = useState<Question>(null);
  const [QnNo, setQnNo] = useState(1);
  const [opened, { open, close }] = useDisclosure(false);
  const theme = useMantineTheme();
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  }>(undefined);

  const { setQuestionCount, setCurrentQuestionNo, questionCount } =
    useContext(QuestionCountContext);
  const updateCompleted = useUpdateCompletedMutation();

  const [responses, handlers] = useListState<QuestionResponse>([]);
  // Used to track questions filled by user. Since there may be logical jumps, this can be used by handlePrev to get the previous question
  const [questionsHistory, questionsHistoryHandlers] = useListState<string>([]);
  const router = useRouter();

  if (!selectedLanguage) throw new Error("No language selected");

  useEffect(() => {
    if (survey?.questions?.length > 0 && selectedQ === null) {
      setSelectedQ(survey.questions[0]);
      questionsHistoryHandlers.append(survey.questions[0].id);
    }
    setQuestionCount(survey?.questions?.length);
  }, [survey]);

  useEffect(() => {
    const index = survey?.questions?.indexOf(selectedQ);
    setQnNo(index + 1);
    setCurrentQuestionNo(index + 1);
  }, [selectedQ]);

  // Getting location coordinates
  // TODO: fetching location is very slow. Plan what to do when user finishes survey before location is fetched
  useEffect(() => {
    if (survey?.getLocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setCoordinates({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        },
        (error) => {
          console.error(error);
        },
      );
    }
  }, [survey]);

  if (isLoading) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader />
      </Center>
    );
  }
  if (isError || !selectedQ) {
    return (
      <Center style={{ height: "100vh" }}>
        <Text fw={500}>
          {questionCount == 0 ? "No Questions found!" : "Something went wrong!"}
        </Text>
      </Center>
    );
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
      const action = parseLogicAction(
        selectedQ.type,
        selectedQ.logic,
        currentResponse,
      );
      if (action) {
        // Performing logic jump
        if (action === LogicAction.NextQ) {
          // Do nothing since we are already going to next question
        } else if (action === LogicAction.EndSurvey) {
          // End survey and submit
          openConfirmationModal();
          return;
        } else {
          // Action is a question id
          const nextQ = survey.questions.find((q) => q.id === action);
          if (!nextQ) {
            // quietly go to next question
            console.error(
              "Question not found. Invalid logic jump. Going to next question",
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
      openConfirmationModal();
    }
  };

  function openConfirmationModal() {
    if (survey.skipPreview) {
      finishSurvey();
    } else {
      open();
    }
  }

  const finishSurvey = () => {
    setIsSavingResponses(true);
    let shouldShowGoogleReview = false;
    const { start } = router.query as { start: string }; //(TODO - Temp) change for survey merge

    for (let question of survey?.questions) {
      if (question?.googleReview) {
        let userResponse = responses.find(
          (r) => r?.questionId === question?.id,
        );
        if (userResponse) {
          switch (question?.type) {
            case "Rating":
              if (
                userResponse?.response?.Rating >=
                question?.googleReview?.minRating
              ) {
                shouldShowGoogleReview = true;
              }
              break;
            case "Opinion Scale":
              if (
                userResponse?.response["Opinion Scale"] >=
                question?.googleReview?.minOpinion
              ) {
                shouldShowGoogleReview = true;
              }
              break;
            case "Smiley":
              if (
                question?.googleReview?.reqOptions.includes(
                  userResponse?.response?.Smiley,
                )
              ) {
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
    submitSurvey({
      surveyTeamMapId: surveyId,
      responses,
      selectedLanguage,
      setIsSavingResponses,
      coordinates,
    }).then(() => {
      updateCompleted.mutate(surveyId);
      let kioskMode = survey?.kioskMode ? "y" : "n";
      kioskMode = start === "true" ? "cs" : kioskMode; // temp for static cs demo (TODO)
      shouldShowGoogleReview
        ? router.push(`${surveyId}/end?k=${kioskMode}&msg=thanks`)
        : router.push(`${surveyId}/end?k=${kioskMode}`);
    });
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

  const responseValues = responses.map((item) => {
    const key = Object.keys(item.response)[0];
    const value = item.response[key];
    return value;
  });

  return (
    <CurrentResponsesContext.Provider
      value={{ response: currentResponse, updateResponse }}
    >
      <SelectedQContext.Provider value={{ selectedQ }}>
        <Container size={"md"}>
          <Modal
            className={classes["modal"]}
            opened={opened}
            title="Confirm your responses"
            centered
            onClose={close}
            overlayProps={{
              color: theme.colors.gray[2],
              opacity: 0.55,
              blur: 3,
              className: classes["modal-overlay"],
            }}
            classNames={modalStyles}
          >
            <Flex className={modalStyles["modal-body-content-container"]}>
              <Stack pb="xl">
                {survey.questions
                  .filter((q) => questionsHistory.includes(q.id))
                  .map((question) => {
                    const response = responses.find(
                      (response) => response.questionId === question.id,
                    );
                    return (
                      <Stack key={question.id}>
                        <Title pt="sm" order={5}>
                          {question.title[selectedLanguage]}
                        </Title>
                        {response ? (
                          <Text pb="sm">
                            {(() => {
                              switch (question.type) {
                                case Q.Rating:
                                  return (
                                    <Rating
                                      value={
                                        Object.values(response?.response)[0]
                                      }
                                      readOnly
                                    />
                                  );
                                case Q.Smiley:
                                  return mapSmileyIcon(
                                    Object.values(response?.response)[0],
                                  );
                                case Q.Photo:
                                  const img = Object.values(
                                    response?.response,
                                  )[0];
                                  const imgUrl = `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${img}`;
                                  return img ? (
                                    <Image
                                      radius="md"
                                      maw={240}
                                      mx="0px"
                                      src={imgUrl}
                                    />
                                  ) : (
                                    <Text pb="sm" c="dark.0" fz="xs">
                                      ... not answered...{" "}
                                    </Text>
                                  );
                                case Q.MSQ:
                                case Q.DDMS:
                                  const responseData = Object.values(
                                    response?.response,
                                  )[0];
                                  if (Array.isArray(responseData)) {
                                    return responseData.map((item, index) => {
                                      return <li key={index}>{item}</li>;
                                    });
                                  }
                                  return <li>{responseData}</li>;

                                case Q.DateTime:
                                  return dayjs(
                                    Object.values(response?.response)[0],
                                  ).format("DD, MMM , YYYY");

                                case Q.Testimonial:
                                  const data = Object.values(
                                    response?.response,
                                  )[0];
                                  return (
                                    <Stack>
                                      <Group>
                                        {" "}
                                        <Text fw="400">Name: </Text>{" "}
                                        <Text fw="300">{data.name}</Text>{" "}
                                      </Group>
                                      <Group mt="-10px">
                                        {" "}
                                        <Text fw="400">Testimonial: </Text>{" "}
                                        <Text fw="300">{data.testimonial}</Text>{" "}
                                      </Group>
                                    </Stack>
                                  );

                                default:
                                  return JSON.stringify(
                                    Object.values(response?.response)[0],
                                  );
                              }
                            })()}
                          </Text>
                        ) : (
                          <Text pb="sm" c="dark.0" fz="xs">
                            ... not answered...{" "}
                          </Text>
                        )}
                        <Divider />
                      </Stack>
                    );
                  })}
              </Stack>
            </Flex>
            <Flex className={modalStyles["modal-footer-container"]}>
              <RateupButtonBlackOutline
                radius={"xl"}
                title=""
                size={largeScreen ? "lg" : "xs"}
                onClick={close}
                leftIcon={<IconChevronLeft />}
              />

              <RateupButtonBlue
                loading={isSavingResponses}
                radius={"xl"}
                title={"Confirm"}
                size={largeScreen ? "lg" : "xs"}
                leftIcon={<IconCheck />}
                onClick={finishSurvey}
              />
            </Flex>
          </Modal>

          <Stack>
            <Stack style={{ minHeight: "45vh" }} justify="center">
              <QuestionNo num={QnNo} />
              <QuestionTitle largeScreen={largeScreen} />
              <QuestionDesc largeScreen={largeScreen} />
              <QuestionForm />
            </Stack>
            <NextPrev
              next={handleNext}
              prev={handlePrev}
              num={QnNo}
              total={questionCount}
            />
          </Stack>
        </Container>
      </SelectedQContext.Provider>
    </CurrentResponsesContext.Provider>
  );
}

function submitSurvey({
  surveyTeamMapId,
  responses,
  selectedLanguage,
  setIsSavingResponses,
  coordinates,
}) {
  return createResponsePublic({
    surveyTeamMapId,
    responses,
    language: selectedLanguage,
    location: { coordinates },
  })
    .then(() => {
      notifications.show({
        message: "Survey completed!",
        color: "teal",
      });
      setIsSavingResponses(false);
    })
    .catch((e) => {
      console.error(e);
      notifications.show({
        message: "Something went wrong",
        color: "red",
      });
      setIsSavingResponses(false);
    });
}

function QuestionNo({ num }) {
  const isMobile = useMediaQuery("(max-width: 480px)");

  return <Text size={isMobile ? "12px" : "15px"}>Question: {num} </Text>;
}

function QuestionTitle({ largeScreen }) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return (
    <Text
      ff={GilroySemibold.style.fontFamily}
      size={largeScreen ? "30px" : "18px"}
    >
      {selectedQ.title[selectedLanguage]}
    </Text>
  );
}
function QuestionDesc({ largeScreen }) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return (
    <Text
      size={largeScreen ? "15px" : "12px"}
      c="dimmed"
      pb={largeScreen ? 20 : 10}
    >
      {selectedQ.description[selectedLanguage]}
    </Text>
  );
}

function QuestionForm() {
  const { selectedQ } = useContext(SelectedQContext);
  const { type } = selectedQ;
  const isMobile = useMediaQuery("(max-width: 480px)");
  const className = type.toLowerCase().replaceAll(" ", "-") + "-container";
  return (
    <Group className={classes[className]}>
      {(() => {
        switch (type) {
          case Q.DateTime:
            return getQuestionForm(type);
          default:
            return getQuestionForm(type);
        }
      })()}
    </Group>
  );
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

function NextPrev({ prev, next, num, total }) {
  const { surveyId } = useRouter().query as { surveyId: string };
  const { isLoading, isError, data: survey } = usePublicSurvey(surveyId);
  const { selectedQ } = useContext(SelectedQContext);
  const { response } = useContext(CurrentResponsesContext);

  const [isErrorInput, setIsErrorInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const isMobile = useMediaQuery("(max-width: 480px)");

  useEffect(() => {
    // TODO: check if rebase was done correctly
    if (selectedQ?.required && response && selectedQ?.type === Q.Email) {
      setErrorMsg(/^\S+@\S+$/.test(response) ? null : "Invalid email");
      if (!/^\S+@\S+$/.test(response)) {
        setIsErrorInput(false);
      }
    } else if (selectedQ?.required && response && selectedQ?.type === Q.Phone) {
      setErrorMsg(/^\d{10}$/.test(response) ? null : "Invalid Phone");
      if (!/^\d{10}$/.test(response)) {
        setIsErrorInput(false);
      }
    } else if (
      selectedQ?.required &&
      response &&
      selectedQ?.type === Q.Testimonial
    ) {
      const { name, testimonial } = response;
      if (name?.length < 3 || testimonial?.length < 5) {
        setErrorMsg(
          "Name - min 3 characters, and \n testimonial - min 5 characters",
        );
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
    if (
      selectedQ?.validationRules &&
      response &&
      (selectedQ?.type === Q.Number ||
        selectedQ?.type === Q.Text ||
        selectedQ?.type === Q.TextArea)
    ) {
      let error = validateQuestion(selectedQ, response);
      if (error?.length > 0) {
        setIsErrorInput(true);
        setErrorMsg(error?.length ? error : null);
      }
      if (!error) {
        setIsErrorInput(false);
      }
    }
  }, [response]);

  function handleNextClick() {
    if (
      selectedQ?.type === Q.Email ||
      selectedQ?.type === Q.Phone ||
      selectedQ?.type === Q.Testimonial
    ) {
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
  const isFirstQuestion = survey?.questions?.indexOf(selectedQ) === 0;
  const isLastQuestion =
    survey?.questions?.indexOf(selectedQ) === survey?.questions?.length - 1;
  return (
    <Stack
      pt={40}
      pb="md"
      style={{
        width: "100%",
        minHeight: isMobile ? "143px" : "163px",
      }}
      justify="flex-end"
    >
      {selectedQ?.required && !response && (
        <Text c="gray" mb="md" size={isMobile && "sm"}>
          Note: * Must attend to continue with next.
        </Text>
      )}
      {errorMsg && isErrorInput && <Text c="red">Note: * {errorMsg}</Text>}
      <Group justify="space-between">
        <RateupButtonSecondary
          radius={"xl"}
          title=""
          disabled={isFirstQuestion}
          leftIcon={<IconChevronLeft />}
          size={isMobile ? "sm" : "lg"}
          onClick={prev}
          color="dark"
        />
        <Center>
          <Text mt={!isMobile && "xs"} fz="sm" fw={600}>
            {num} / {total}
          </Text>
        </Center>
        {isLastQuestion ? (
          <Button
            radius={"xl"}
            disabled={
              ((selectedQ?.required || selectedQ?.validationRules) &&
                !response) ||
              isErrorInput
            }
            size={isMobile ? "sm" : "lg"}
            onClick={handleNextClick}
            color="dark"
            rightSection={<IconChevronRight />}
          >
            Submit
          </Button>
        ) : (
          <Button
            radius={"xl"}
            disabled={
              ((selectedQ?.required || selectedQ?.validationRules) &&
                !response) ||
              isErrorInput
            }
            size={isMobile ? "sm" : "lg"}
            onClick={handleNextClick}
            color="dark"
            rightSection={<IconChevronRight />}
          >
            Next
          </Button>
        )}
      </Group>
    </Stack>
  );
}

function TextForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <Input
        placeholder="Enter your answer"
        value={response || ""}
        onChange={(e) => updateResponse(e.currentTarget.value)}
        style={{ maxWidth: "400px" }}
        variant="unstyled"
        radius="xl"
        size="sm"
      />
    </Paper>
  );
}

function TextAreaForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <Textarea
        placeholder="Enter your answer"
        value={response ? response.replace(", ", "\n") : ""}
        onChange={(e) => {
          const replacedValue = e.currentTarget.value.replace(/\n/g, ", ");
          updateResponse(replacedValue);
        }}
        style={{ maxWidth: "400px" }}
        variant="unstyled"
        size="sm"
      />
    </Paper>
  );
}

function NumberForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <NumberInput
        size="sm"
        placeholder="Enter number input"
        value={response || undefined}
        onChange={(value) => updateResponse(value)}
        variant="unstyled"
      />
    </Paper>
  );
}

function PhoneForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [phoneError, setPhoneError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  const countries = [
    {
      name: "India",
      code: "+91",
      flag: "IN",
    },
    // {
    //   name: 'USA',
    //   code: '+1',
    //   flag: 'US',
    // },
    // {
    //   name: 'UAE',
    //   code: '+971',
    //   flag: 'AE',
    // },
    // Add more countries...
  ];
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const [value, setValue] = useState<string | null>(countries[0].code);

  const options = countries?.map((country) => {
    return (
      <Combobox.Option
        style={{ minWidth: "150px" }}
        value={country?.code}
        key={country?.code}
      >
        <Group>
          <Flag code={country?.flag} height="16" />
          {/* <Text>{`${country.name} `}</Text> */}
        </Group>
      </Combobox.Option>
    );
  });

  //TODO : save with 91 in db if required

  useEffect(() => {
    if (response)
      setPhoneError(/^\d{10}$/.test(response) ? null : "Invalid phone number");
  }, [response]);

  const handleInputBlur = () => {
    if (phoneError) {
    }
    setIsFocused(false);
  };
  const handleInputChange = (value: number) => {
    setIsFocused(true);
    const phone = value;
    updateResponse(phone);
    setPhoneError(/^\d{10}$/.test(response) ? null : "Invalid phone number");
  };

  return (
    <Stack style={{ width: "90vw" }}>
      <Paper
        shadow="sm"
        className={classes.inputBox}
        style={{ maxWidth: "300px" }}
      >
        <Group align="flex-start">
          <Combobox
            store={combobox}
            withinPortal={false}
            onOptionSubmit={(val) => {
              setValue(val);
              combobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <InputBase
                component="button"
                type="button"
                pointer
                rightSection={<Combobox.Chevron />}
                onClick={() => combobox.toggleDropdown()}
                rightSectionPointerEvents="none"
                variant="unstyled"
              >
                {(
                  <Stack>
                    <Flag
                      code={
                        countries?.find((country) => country?.code === value)
                          ?.flag
                      }
                      height="15"
                    />
                  </Stack>
                ) || <Input.Placeholder>Select a country</Input.Placeholder>}
              </InputBase>
            </Combobox.Target>

            <Combobox.Dropdown>
              <Combobox.Options>{options}</Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
          <NumberInput
            size="sm"
            max={9999999999}
            placeholder="Enter 10 digit phone number"
            hideControls
            value={response || ""}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            variant="unstyled"
            style={{ minWidth: "185px" }}
          />
        </Group>
      </Paper>

      <Text c="red" fz="xs" ml="sm">
        {" "}
        {phoneError && !isFocused ? "* Invalid phone number" : null}
      </Text>
    </Stack>
  );
}

function EmailForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [emailError, setEmailError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (response)
      setEmailError(/^\S+@\S+$/.test(response) ? null : "Invalid email");
  }, [response]);

  const handleInputBlur = () => {
    if (emailError) {
      // console.log("Invalid email");
    }
    setIsFocused(false);
  };
  const handleInputChange = (e) => {
    setIsFocused(true);
    const email = e.target.value;
    updateResponse(email);
    setEmailError(/^\S+@\S+$/.test(email) ? null : "Invalid email");
  };

  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <TextInput
        placeholder="Enter email address"
        value={response || ""}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        style={{ maxWidth: "400px" }}
        error={emailError && !isFocused ? "Invalid email" : null}
        leftSection={<IconMail size="1.2rem" color="black" />}
        variant="unstyled"
      />
    </Paper>
  );
}

function RatingForm() {
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Stack align="center">
      <Rating
        value={response}
        onChange={updateResponse}
        color="var(--tertiary-color)"
        size="xl"
        className={classes.rating}
        styles={{
          label: {
            paddingLeft: isMobile ? "3px" : "8px",
            paddingRight: isMobile ? "3px" : "8px",
          },
        }}
      />
    </Stack>
  );
}

function LDForm() {
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      <Box w={150}>
        <RateupButtonBlue
          size="md"
          variant={response === LDResponse.Dislike ? "filled" : "outline"}
          radius="xl"
          title="Dislike"
          leftIcon={<IconThumbDownFilled />}
          fullWidth
          onClick={() => updateResponse(LDResponse.Dislike)}
        />
      </Box>
      <Box w={150} ml={!isMobile && "sm"}>
        <RateupButtonBlue
          size="md"
          variant={response === LDResponse.Like ? "filled" : "outline"}
          radius="xl"
          title="Like"
          fullWidth
          leftIcon={<IconThumbUpFilled />}
          onClick={() => updateResponse(LDResponse.Like)}
        />
      </Box>
    </Group>
  );
}

function OpinionScaleForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const renderButtons = () => {
    const oneToFive = [];
    const fiveToTen = [];
    for (let i = 1; i <= 10; i++) {
      const button = (
        <Button
          className={classes["opinion-scale-interval-btn"]}
          key={i}
          radius="md"
          onClick={() => updateResponse(i)}
          color={"var(--tertiary-color)"}
          variant={response === i ? "filled" : "outline"}
          styles={{
            root: { backgroundColor: response !== i && "#EBEFF7" },
          }}
        >
          {i}
        </Button>
      );
      if (i <= 5) {
        oneToFive.push(button);
      } else {
        fiveToTen.push(button);
      }
    }
    const firstFiveBtnsContiner = (
      <Flex className={classes["opinion-scale-first-five-btns-container"]}>
        {oneToFive}
      </Flex>
    );
    const secondFiveBtnsContainer = (
      <Flex className={classes["opinion-scale-last-five-btns-container"]}>
        {fiveToTen}
      </Flex>
    );
    return (
      <>
        {firstFiveBtnsContiner}
        {secondFiveBtnsContainer}
      </>
    );
  };

  return <Group className={classes["opinion-scale"]}>{renderButtons()}</Group>;
}

function YNForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      <Box w={100}>
        <RateupButtonBlue
          size="md"
          variant={response === YNResponse.No ? "filled" : "outline"}
          radius="xl"
          title="No"
          fullWidth
          onClick={() => updateResponse(YNResponse.No)}
        />
      </Box>
      <Box w={100}>
        <RateupButtonBlue
          size="md"
          variant={response === YNResponse.Yes ? "filled" : "outline"}
          radius="xl"
          title="Yes"
          fullWidth
          onClick={() => updateResponse(YNResponse.Yes)}
        />
      </Box>
    </Group>
  );
}

function SmileyForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  return (
    <Group>
      <SmileyRating updateResponse={updateResponse} response={response} />
    </Group>
  );
}

function ImageForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(response || null);

  useEffect(() => {
    const uploadAndUpdate = async () => {
      if (file) {
        const fileKey = await uploadFile(file);
        updateResponse(fileKey);
      }
    };
    uploadAndUpdate();
  }, [file]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  function removeImg() {
    setFile(null);
    setPreviewUrl(null);
    updateResponse(null);
  }

  return (
    <Stack>
      <Box w={300}>
        <FileButton onChange={setFile} accept="image/png,image/jpeg">
          {(props) => (
            <Button
              fullWidth
              size="lg"
              radius="lg"
              variant="outline"
              {...props}
            >
              Upload image
            </Button>
          )}
        </FileButton>
      </Box>

      <Stack mt="lg">
        {(file || response) && (
          <Group justify="flex-end">
            <ActionIcon
              onClick={removeImg}
              variant="filled"
              color="gray"
              radius="lg"
            >
              <IconX style={{ width: "70%", height: "70%" }} stroke={1.5} />
            </ActionIcon>
          </Group>
        )}

        <Center>
          {(previewUrl || response) && (
            <Image
              src={
                previewUrl ||
                `${process.env.NEXT_PUBLIC_AWS_CLOUDFRONT_URL}${response}`
              }
              alt="Preview"
              style={{ maxWidth: "100px", height: "auto", maxHeight: "100px" }}
            />
          )}
        </Center>

        {(file || response) && (
          <Text size="sm" style={{ textAlign: "center" }} mt="sm">
            Picked file: {file?.name || getFileName(response, false)}
          </Text>
        )}
      </Stack>
    </Stack>
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
      style={{ minWidth: "300px", maxWidth: "500px" }}
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
      style={{ minWidth: "300px", maxWidth: "500px" }}
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
  return (
    <Paper shadow="sm" className={classes.inputBox}>
      <DateInput
        value={response}
        onChange={updateResponse}
        placeholder="Select date"
        maw={400}
        mx="auto"
        variant="unstyled"
        leftSection={<IconCalendarEvent size="1.2rem" color="black" />}
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
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    updateResponse({ ...response, testimonial: e.currentTarget.value });
  };
  //TODO: image storage
  console.error("Image storage not implemented");

  return (
    <>
      <Paper shadow="sm" className={classes.inputBox}>
        <TextInput
          placeholder="Enter your name"
          value={response?.name}
          onChange={handleNameChange}
          style={{ maxWidth: "400px" }}
          variant="unstyled"
        />
      </Paper>
      <Paper shadow="sm" className={classes.inputBox}>
        <Textarea
          placeholder="Enter your testimonial"
          value={response?.testimonial}
          onChange={handleTestimonialChange}
          style={{ maxWidth: "400px" }}
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
