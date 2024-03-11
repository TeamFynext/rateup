import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { useSearchParams } from "next/dist/client/components/navigation";
import {
  Button,
  Center,
  Container,
  Group,
  Loader,
  Rating,
  Stack,
  Text,
  Image,
  Modal,
  useMantineTheme,
  Title,
  Divider,
  Flex,
  RingProgress,
  Box,
  LoadingOverlay,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure, useListState, useMediaQuery } from "@mantine/hooks";
import { useRouter } from "next/router";
import { useUpdateCompletedMutation } from "../../../../backend/surveys/surveys.query";
import { useContext, useEffect, useRef, useState } from "react";
import { SelectedQContext } from "../../../../context/SelectedQ";
import dayjs from "dayjs";
import { LogicAction, QuestionType as Q } from "../../../../types/enums";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { CurrentResponsesContext } from "../../../../context/ResponseContext";
import { createResponsePublic } from "../../../../backend/surveys/response/response.api";
import {
  RateupButtonBlackOutline,
  RateupButtonBlue,
} from "../../../Button/RateupButtons";
import QuestionCountContext from "../../../../context/QuestionCountContext";
import classes from "./TakeSurvey.module.css";
import modalStyles from "./ModalStyles.module.css";
import { validateQuestion } from "../../../../utils/validation";
import { mapSmileyIcon } from "./SmileyRating";
import { isValidPhoneNumber } from "react-phone-number-input";
import { emailPattern } from "../../../../utils/constants";
import { TextForm } from "./QuestionForms/TextForm";
import { TextAreaForm } from "./QuestionForms/TextAreaForm";
import { NumberForm } from "./QuestionForms/NumberForm";
import { RatingForm } from "./QuestionForms/RatingForm";
import { LDForm } from "./QuestionForms/LDForm";
import { YNForm } from "./QuestionForms/YNForm";
import { OpinionScaleForm } from "./QuestionForms/OpinionScaleForm";
import { SmileyForm } from "./QuestionForms/SmileyForm";
import { ImageForm } from "./QuestionForms/ImageForm";
import { MCQForm } from "./QuestionForms/MCQForm";
import { MSQForm } from "./QuestionForms/MSQForm";
import { DDSSForm } from "./QuestionForms/DDSSForm";
import { DDMSForm } from "./QuestionForms/DDMSForm";
import { TestimonialForm } from "./QuestionForms/TestimonialForm";
import { EmailPhoneForm } from "./QuestionForms/EmailPhoneForm";
import { DateForm } from "./QuestionForms/DateForm";
import { CustomNPSForm } from "./QuestionForms/CustomNPSForm";
import { parseLogicAction } from "../../../../utils/survey/logic/logic.utils";
import { getFileUrlFromKey } from "../../../../utils/file-upload/upload";
import { encryptResponse } from "../../../../utils/encryption";
import { useSurveyTheme } from "../../../../backend/surveyTheme/surveyTheme.query";
import { SurveyTheme } from "../../SurveyTheme/surveyTheme.types";
import { PCQForm } from "./QuestionForms/PCQForm";
import { MotionTransition } from "../../../animation/MotionTransition";
import { TermsNConditionsForm } from "./QuestionForms/TermsNConditionsForm";
import ContactForm from "./QuestionForms/ContactForm";
import { lexend } from "../../../../utils/fonts";
import RateupLoader from "../../../Loaders/RateupLoader";
import {
  checkGoogleReviewForQuestion,
  checkRaiseTicketIssueQuestion,
} from "./util";

function TakeSurvey({ survey, setIsReviewPage, fromShortUrl = false }) {
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const smallScreen = useMediaQuery("(max-width: 30em)");
  const searchParams = useSearchParams();
  const [isSavingResponses, setIsSavingResponses] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  const surveyTeamMapId = survey.surveyTeamMapId;

  const { data: surveyThemeData, isLoading: IsLoading } = useSurveyTheme(
    survey?.id,
  ) as {
    data: SurveyTheme;
    isLoading: boolean;
  };
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

  const [pageSwitchTransition, setPageSwitchTransition] = useState<
    "fade" | "leftSlideIn" | "rightSlideIn" | "bottomSlideIn" | "bottomSlideOut"
  >("bottomSlideIn");
  const [boxHeight, setBoxHeight] = useState(0);
  const boxRef = useRef(null);

  if (!selectedLanguage) throw new Error("No language selected");
  useEffect(() => {
    const updateHeight = () => {
      if (boxRef.current) {
        setBoxHeight((prevHeight) => {
          const newHeight = boxRef.current.offsetHeight;
          return newHeight !== prevHeight ? newHeight : prevHeight;
        });
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, [boxRef.current]);

  const formMaxHeight = smallScreen
    ? `calc(100dvh - ${boxHeight + 230}px)`
    : `calc(100dvh - ${boxHeight + 360}px)`;

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

  if (!survey) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader type="bars" />
      </Center>
    );
  }
  if (!selectedQ) {
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
    setPageSwitchTransition("bottomSlideIn");
    questionsHistoryHandlers.append(question.id);
  };

  const goBack = () => {
    const prevQId = questionsHistory[questionsHistory.length - 2];
    setSelectedQ(survey.questions.find((q) => q.id === prevQId));
    setPageSwitchTransition("bottomSlideOut");
    questionsHistoryHandlers.pop();
  };

  const handleNext = () => {
    const index = survey.questions.indexOf(selectedQ);
    if (index === -1) throw new Error("Question not found"); // this should never happen

    if (index < survey.questions.length - 1) {
      // Not last question
      // Checking for logic jump
      const action = parseLogicAction(
        selectedQ,
        currentResponse,
        selectedLanguage,
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

  const finishSurvey = async () => {
    setIsSavingResponses(true);
    const { start } = router.query as { start: string }; //(TODO - Temp) change for survey merge
    let shouldShowGoogleReview = checkGoogleReviewForQuestion(
      survey?.questions,
      responses,
    );
    let shouldRaiseTicket = checkRaiseTicketIssueQuestion(
      survey?.questions,
      responses,
    );

    //logic for encrypting the responses, to swap values between response variable and end to end encrypted response
    let defaultResponses = responses;
    let encryptedResponses = "";
    if (survey?.isEncrypted || survey?.publicKey) {
      const { encryptedResponse } = await encryptResponse(
        responses,
        survey?.publicKey,
      );
      encryptedResponses = encryptedResponse;
      defaultResponses = [];
    }

    submitSurvey({
      surveyTeamMapId: surveyTeamMapId,
      responses: defaultResponses,
      encryptedResponses: encryptedResponses,
      selectedLanguage,
      setIsSavingResponses,
      coordinates,
      tag: searchParams.get("tag"),
      shouldRaiseTicket,
    }).then(() => {
      updateCompleted.mutate(surveyTeamMapId);
      let kioskMode = survey?.kioskMode ? "y" : "n";
      kioskMode = start === "true" ? "cs" : kioskMode; // temp for static cs demo (TODO)
      shouldShowGoogleReview
        ? //  ? router.push(`${surveyId}/review-us-on-google`)  //TODO remove after testing
          setIsReviewPage(true)
        : fromShortUrl
          ? router.push(`/ws/${router.query.shortId}/end`)
          : router.push(
              `${surveyTeamMapId}/end?k=${kioskMode}&sid=${survey.id}`,
            );
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

  if (IsLoading) return <RateupLoader h={"100dvh"} />;

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
            styles={{
              content: { background: "white" },
            }}
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
                                    surveyThemeData?.surveyTheme?.input
                                      ?.primaryColor,
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
                                      return <li key={index}>{item?.value}</li>;
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
                                        <Text fw="400">Name: </Text>{" "}
                                        <Text fw="300">{data.name}</Text>{" "}
                                      </Group>
                                      {data.jobTitle && (
                                        <Group mt="-10px">
                                          <Text fw={"400"}>Job Title: </Text>
                                          <Text fw="300">{data.jobTitle}</Text>
                                        </Group>
                                      )}
                                      <Group mt="-10px">
                                        <Text fw="400">Testimonial: </Text>{" "}
                                        <Text fw="300">{data.testimonial}</Text>{" "}
                                      </Group>
                                      {data.rating && (
                                        <Rating value={data.rating} readOnly />
                                      )}
                                      {data.photo && (
                                        <Image
                                          src={getFileUrlFromKey(data?.photo)}
                                          radius="md"
                                          maw={240}
                                          mx="0px"
                                        />
                                      )}
                                    </Stack>
                                  );

                                case Q.EmailPhone:
                                  const contact = Object.values(
                                    response?.response,
                                  )[0];
                                  return (
                                    <Stack>
                                      <Group>
                                        <Text fw="400">Email: </Text>{" "}
                                        <Text fw="300">{contact.email}</Text>{" "}
                                      </Group>
                                      <Group mt="-10px">
                                        <Text fw="400">Phone: </Text>{" "}
                                        <Text fw="300">{contact.phone}</Text>{" "}
                                      </Group>
                                    </Stack>
                                  );

                                case Q.CustomNPS:
                                case Q.MCQ:
                                case Q.DDSS:
                                  let selectedChoice = Object.values(
                                    response?.response,
                                  )[0];
                                  return <Text>{selectedChoice?.value}</Text>;
                                case Q.PCQ:
                                  let selectedPictureChoice = Object.values(
                                    response?.response,
                                  )?.[0]?.value;
                                  return (
                                    <Stack gap={0} align="center">
                                      <Image
                                        src={getFileUrlFromKey(
                                          selectedPictureChoice?.image,
                                        )}
                                        w={50}
                                        style={{ aspectRatio: 4 / 3 }}
                                      />
                                      <Text>
                                        {selectedPictureChoice?.value}
                                      </Text>
                                    </Stack>
                                  );
                                case Q.Contact:
                                case Q.Phone:
                                case Q.Email:
                                  const res = Object.values(
                                    response?.response,
                                  )[0];
                                  return (
                                    <Stack>
                                      {res?.name && (
                                        <Group>
                                          <Text fw="400">Name: </Text>
                                          <Text fw="300">{res?.name}</Text>
                                        </Group>
                                      )}
                                      {res?.phone && (
                                        <Group>
                                          <Text fw="400">Phone: </Text>
                                          <Text fw="300">{res?.phone}</Text>
                                        </Group>
                                      )}
                                      {res?.email && (
                                        <Group>
                                          <Text fw="400">Email: </Text>
                                          <Text fw="300">{res?.email}</Text>
                                        </Group>
                                      )}
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

          <Box pos="relative">
            <LoadingOverlay
              visible={isSavingResponses}
              zIndex={1000}
              overlayProps={{ radius: "sm", blur: 10 }}
            />
            <Stack>
              <Stack
                justify="center"
                mih={smallScreen ? "calc(100dvh - 230px)" : "56dvh"}
              >
                <MotionTransition
                  keyValue={selectedQ}
                  type={"fade"}
                  apEnable={false}
                  duration={1}
                >
                  <Box
                    pb={smallScreen ? "sm" : "lg"}
                    ref={boxRef}
                    className={lexend.className}
                  >
                    <QuestionTitle
                      largeScreen={largeScreen}
                      themeStyles={surveyThemeData?.surveyTheme?.title?.styles}
                    />
                    <QuestionDesc
                      largeScreen={largeScreen}
                      themeStyles={
                        surveyThemeData?.surveyTheme?.subtitle?.styles
                      }
                    />
                  </Box>
                  <ScrollArea.Autosize
                    mah={formMaxHeight}
                    p={0}
                    m={0}
                    w={"100%"}
                  >
                    <QuestionForm />
                  </ScrollArea.Autosize>
                </MotionTransition>
              </Stack>
              <NextPrev
                next={handleNext}
                prev={handlePrev}
                num={QnNo}
                total={questionCount}
                survey={survey}
                themeStyles={surveyThemeData?.surveyTheme?.button?.styles}
              />
            </Stack>
          </Box>
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
  tag,
  encryptedResponses,
  shouldRaiseTicket,
}) {
  return createResponsePublic({
    surveyTeamMapId,
    responses,
    encryptedResponses,
    language: selectedLanguage,
    location: { coordinates },
    tag: tag || null,
    shouldRaiseTicket,
  })
    .then(() => {
      // notifications.show({
      //   message: "Survey completed!",
      //   color: "teal",
      // });
      //setIsSavingResponses(false);
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

function QuestionTitle({ largeScreen, themeStyles }) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return (
    <Text
      size={largeScreen ? "30px" : "20px"}
      className={classes.questionTitle}
      style={themeStyles}
    >
      {selectedQ.title[selectedLanguage]}
    </Text>
  );
}
function QuestionDesc({ largeScreen, themeStyles }) {
  const { selectedQ } = useContext(SelectedQContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  return (
    <Text
      size={largeScreen ? "15px" : "16px"}
      className={classes.questionTitle}
      style={themeStyles}
    >
      {selectedQ.description[selectedLanguage]}
    </Text>
  );
}

function QuestionForm() {
  const { selectedQ } = useContext(SelectedQContext);
  const { type } = selectedQ;
  const className = type.toLowerCase().replaceAll(" ", "-") + "-container";
  return (
    <Group className={classes[className]}>
      {(() => {
        switch (type) {
          case Q.DateTime:
            return getQuestionForm(type, selectedQ);
          default:
            return getQuestionForm(type, selectedQ);
        }
      })()}
    </Group>
  );
}

function getQuestionForm(type, selectedQ) {
  switch (type) {
    case Q.Text:
      return <TextForm key={selectedQ?.id} />;
    case Q.TextArea:
      return <TextAreaForm key={selectedQ?.id} />;
    case Q.Number:
      return <NumberForm key={selectedQ?.id} />;
    case Q.Phone:
      return <ContactForm key={selectedQ?.id} features={selectedQ.features} />;
    case Q.Email:
      return <ContactForm key={selectedQ?.id} features={selectedQ.features} />;
    case Q.Rating:
      return <RatingForm key={selectedQ?.id} />;
    case Q.LD:
      return <LDForm key={selectedQ?.id} />;
    case Q.YN:
      return <YNForm key={selectedQ?.id} />;
    case Q.Opinion:
      return <OpinionScaleForm key={selectedQ?.id} />;
    case Q.Smiley:
      return <SmileyForm key={selectedQ?.id} />;
    case Q.Photo:
      return <ImageForm key={selectedQ?.id} />;
    case Q.MCQ:
      return <MCQForm key={selectedQ?.id} />;
    case Q.MSQ:
      return <MSQForm key={selectedQ?.id} />;
    case Q.DDSS:
      return <DDSSForm key={selectedQ?.id} />;
    case Q.DDMS:
      return <DDMSForm key={selectedQ?.id} />;
    case Q.Testimonial:
      return (
        <TestimonialForm key={selectedQ?.id} features={selectedQ?.features} />
      );
    case Q.EmailPhone:
      return <EmailPhoneForm key={selectedQ?.id} />;
    case Q.DateTime:
      return <DateForm key={selectedQ?.id} />;
    case Q.CustomNPS:
      return <CustomNPSForm key={selectedQ?.id} />;
    case Q.PCQ:
      return <PCQForm key={selectedQ?.id} />;
    case Q.Contact:
      return <ContactForm key={selectedQ?.id} features={selectedQ?.features} />;
    case Q.TnC:
      return (
        <TermsNConditionsForm key={selectedQ?.id} tncData={selectedQ?.tnc} />
      );
    case Q.InfoMessage:
      return <></>;
    default:
      return <div>not implemented</div>;
  }
}

function NextPrev({ prev, next, num, total, themeStyles, survey }) {
  const { selectedQ } = useContext(SelectedQContext);
  const { response } = useContext(CurrentResponsesContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [isErrorInput, setIsErrorInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const isMobile = useMediaQuery("(max-width: 480px)");

  useEffect(() => {
    // TODO: check if rebase was done correctly
    // if (
    //   ((selectedQ?.required && response) || response?.length > 0) &&
    //   selectedQ?.type === Q.Email //for email input
    // ) {
    //   if (emailPattern.test(response)) {
    //     setIsErrorInput(false);
    //     setErrorMsg("");
    //   } else {
    //     setIsErrorInput(true);
    //     setErrorMsg("Enter a valid email");
    //   }
    // } else if (
    //   ((selectedQ?.required && response) || response?.length > 0) &&
    //   selectedQ?.type === Q.Phone //for phone input
    // ) {
    //   if (isValidPhoneNumber(response)) {
    //     setIsErrorInput(false);
    //     setErrorMsg("");
    //   } else {
    //     setIsErrorInput(true);
    //     setErrorMsg("Enter a valid phone");
    //   }
    // } else
    if (
      ((selectedQ?.required && response) ||
        response?.email?.length > 0 ||
        response?.phone?.length) &&
      selectedQ?.type === Q.EmailPhone //for contact qn - both email, phone
    ) {
      const { email, phone } = response;

      const isEmailValid = emailPattern.test(email || "");
      const isPhoneValid = isValidPhoneNumber(phone || "");

      if (
        selectedQ?.required &&
        (response?.email?.length < 1 || response?.phone?.length < 1)
      ) {
        setIsErrorInput(true);
        setErrorMsg("Please input all fields");
      } else if (selectedQ?.required && (!isEmailValid || !isPhoneValid)) {
        setIsErrorInput(true);
        if (!isEmailValid && !isPhoneValid) {
          setErrorMsg("Enter a valid email and phone");
        } else if (!isEmailValid) {
          setErrorMsg("Enter a valid email");
        } else {
          setErrorMsg("Enter a valid phone number");
        }
      } else if (
        !selectedQ?.required &&
        ((email?.length > 0 && !isEmailValid) ||
          (phone?.length > 0 && !isPhoneValid))
      ) {
        setIsErrorInput(true);
        if (email?.length > 0 && !isEmailValid) {
          setErrorMsg("Enter a valid email");
        } else {
          setErrorMsg("Enter a valid phone number");
        }
      } else {
        setErrorMsg("");
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
    } else if (
      selectedQ?.required &&
      [Q.Contact, Q.Email, Q.Phone].includes(selectedQ.type)
    ) {
      if (
        selectedQ.features?.[selectedLanguage]?.name.isEnabled &&
        !response?.name?.length
      ) {
        setErrorMsg("Name cannot be blank");
      } else if (
        selectedQ.features?.[selectedLanguage]?.phone.isEnabled &&
        (!response?.phone || !isValidPhoneNumber(response?.phone))
      ) {
        if (!response?.phone) setErrorMsg("phone number cannot be blank");
        else if (!isValidPhoneNumber(response?.phone))
          setErrorMsg("Enter a valid phone number");
      } else if (
        selectedQ.features?.[selectedLanguage]?.email.isEnabled &&
        (!response?.email?.length || !emailPattern.test(response?.email))
      ) {
        if (!response?.email?.length) setErrorMsg("Email cannot be blank");
        else if (!emailPattern.test(response?.email))
          setErrorMsg("Enter a valid email");
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
  }, [response, selectedQ]);

  function handleNextClick() {
    if (
      selectedQ?.type === Q.Email ||
      selectedQ?.type === Q.Phone ||
      selectedQ?.type === Q.EmailPhone ||
      selectedQ?.type === Q.Testimonial ||
      selectedQ.type === Q.Contact
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

  function getCompletionRate(num, total) {
    const completionPercentage = ((num / total) * 100).toFixed(0);
    return completionPercentage;
  }

  if (!survey) return null;
  const isFirstQuestion = survey?.questions?.indexOf(selectedQ) === 0;
  const isLastQuestion =
    survey?.questions?.indexOf(selectedQ) === survey?.questions?.length - 1;
  return (
    <Stack
      pt={"md"}
      gap={0}
      style={{
        width: "100%",
        minHeight: "74px",
      }}
      justify="flex-end"
    >
      <Text
        size={isMobile && "sm"}
        c={themeStyles?.backgroundColor}
        style={{ opacity: selectedQ?.required && !response ? 1 : 0 }}
      >
        *Choose an option or answer to proceed!
      </Text>
      {errorMsg && isErrorInput && <Text c="red">Note: * {errorMsg}</Text>}
      <Group justify="space-between" gap={0}>
        <Button
          radius={"xl"}
          title=""
          disabled={isFirstQuestion}
          leftSection={<IconChevronLeft />}
          size={isMobile ? "sm" : "lg"}
          variant="outlined"
          onClick={prev}
          style={!isFirstQuestion && themeStyles}
        >
          Prev
        </Button>
        <Center>
          <RingProgress
            sections={[
              {
                value: parseInt(getCompletionRate(num, total)),
                color: themeStyles?.backgroundColor ?? "dark.2",
              },
              {
                value: 100 - parseInt(getCompletionRate(num, total)),
                color: themeStyles?.color ?? "dark",
              },
            ]}
            size={isMobile ? 55 : 80}
            thickness={isMobile ? 4 : 8}
            label={
              <Text
                c={themeStyles?.backgroundColor ?? "dark.2"}
                fw={700}
                ta="center"
                size={isMobile ? "xs" : "sm"}
              >
                {getCompletionRate(num, total)}%
              </Text>
            }
          />
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
            color="var(--tertiary-color)"
            rightSection={<IconChevronRight />}
            style={
              !(
                ((selectedQ?.required || selectedQ?.validationRules) &&
                  !response) ||
                isErrorInput
              ) && themeStyles
            }
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
            color="var(--tertiary-color)"
            rightSection={<IconChevronRight />}
            style={
              !(
                ((selectedQ?.required || selectedQ?.validationRules) &&
                  !response) ||
                isErrorInput
              ) && themeStyles
            }
          >
            Next
          </Button>
        )}
      </Group>
    </Stack>
  );
}

export default TakeSurvey;
