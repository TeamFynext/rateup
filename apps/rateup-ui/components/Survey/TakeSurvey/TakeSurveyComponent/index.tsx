"use client";

import { useContext, useEffect, useRef, useState } from "react";
import {
  useParams,
  useSearchParams,
} from "next/dist/client/components/navigation";
import { useRouter } from "next/navigation";

import { Box, Center, Container, ScrollArea, Stack, Text } from "@mantine/core";
import { useDisclosure, useListState, useMediaQuery } from "@mantine/hooks";
import { AnimatePresence, motion } from "motion/react";
import { useBeforeUnload } from "react-use";
import { toast } from "sonner";

import { useUpdateCompletedMutation } from "../../../../backend/surveys/surveys.query";
import { NextPrevFuncsAndLastQuestionContextProvider } from "../../../../context/NextPrevFuncsContext";
import { CurrentResponsesContext } from "../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../context/SelectedQ";
import { SurveyContextProvider } from "../../../../context/SurveyObjContext";
import { SurveyThemeContextProvider } from "../../../../context/SurveyThemeContext";
import { LogicAction, PageType, QuestionType } from "../../../../types/enums";
import { isHtml } from "../../../../utils";
import { encryptResponse } from "../../../../utils/encryption";
import { parseLogicAction } from "../../../../utils/survey/logic/logic.utils";
import CustomHTML from "../../Page/Previews/CustomHTML";
import {
  useIsSurveyThemeEditView,
  useIsSurveyThemePreview,
} from "../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext";
import ConfirmResponsesModal from "./ConfirmResponsesModal";
import NextPrev from "./NextPrev";
import QuestionDesc from "./QuestionDesc";
import QuestionForm from "./QuestionForm";
import QuestionTitle from "./QuestionTitle";
import styles from "./TakeSurvey.module.css";
import {
  checkGoogleReviewForQuestion,
  checkRaiseTicketIssueQuestion,
  getFirstQuestion,
  getLastQuestion,
  getQuestionsLength,
  submitSurvey,
} from "./util";

function TakeSurvey({
  survey,
  setIsReviewPage,
  fromShortUrl = false,
  setIsThankyouPage = null,
  setIsDefaultThankyouPage = null,
}) {
  const isSurveyThemePreview = useIsSurveyThemePreview();
  const isSurveyThemeEditView = useIsSurveyThemeEditView();

  const largeScreen = useMediaQuery("(min-width: 60em)");
  const smallScreen = useMediaQuery("(max-width: 30em)");
  const searchParams = useSearchParams();
  const [isSavingResponses, setIsSavingResponses] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  const surveyTeamMapId = survey.surveyTeamMapId;
  useBeforeUnload(true, "Your inputs are not submitted yet, are you sure?");

  const { theme: surveyThemeData } = survey?.webSurveyTheme;

  const [isThankYouPageEnabled, setIsThankYouPageEnabled] = useState(
    survey?.questions?.some((q) => q.type === PageType.ThankYou) || false,
  );

  const [selectedQ, setSelectedQ] = useState<Question>(null);
  const [alignment, setAlignment] = useState("left");
  const [
    isConfirmResponsesModalOpen,
    { open: openConfirmationResponsesModal, close: closeConfirmResponsesModal },
  ] = useDisclosure(false);

  // Questions Array length without PageType Questions(excluding Custom Page type question).
  const questionsLength = getQuestionsLength(survey);

  // used for animation of question change in Question AnimationPresence below.
  const [aPDirection, setApDirection] = useState(0);

  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  }>(undefined);

  const updateCompleted = useUpdateCompletedMutation(survey?.id);

  const [responses, handlers] = useListState<QuestionResponse>([]);
  const responsesRef = useRef(responses);
  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  // Used to track questions filled by user. Since there may be logical jumps, this can be used by handlePrev to get the previous question
  const [questionsHistory, questionsHistoryHandlers] = useListState<string>([]);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    setIsThankYouPageEnabled(
      survey?.questions?.some((q) => q.type === PageType.ThankYou) || false,
    );
  }, [survey?.questions]);

  useEffect(() => {
    if (survey?.questions?.length > 0 && selectedQ === null) {
      const firstQuestion = getFirstQuestion(survey);
      if (firstQuestion) {
        setSelectedQ(firstQuestion);
        questionsHistoryHandlers.append(firstQuestion?.id);
      }
    }
  }, [survey?.questions]);

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

  const takeSurveyRootDivRef = useRef(null);

  const pendingUpdate = useRef(false);
  const viewportHandler = (event) => {
    if (pendingUpdate.current) return;
    pendingUpdate.current = true;

    requestAnimationFrame(() => {
      pendingUpdate.current = false;
      const takeSurveyRootDiv = takeSurveyRootDivRef.current;
      const nextPrevBtnDiv = document.getElementById("next-prev-btn-div");
      if (takeSurveyRootDiv && nextPrevBtnDiv) {
        const nextPrevBtnDivHeight =
          nextPrevBtnDiv.getBoundingClientRect().height;
        const nextPrevBtnOffsetTop = nextPrevBtnDiv.offsetTop;

        const visualViewport = event.target;
        const offsetLeft = visualViewport.offsetLeft;

        const nextPrevBtnDivTranslateY =
          -(
            nextPrevBtnOffsetTop -
            visualViewport.height +
            nextPrevBtnDivHeight
          ) + visualViewport.offsetTop;
        if (!isSurveyThemePreview)
          nextPrevBtnDiv.style.transform = `translate(${offsetLeft}px, ${nextPrevBtnDivTranslateY}px)`;
      }
    });
  };

  useEffect(() => {
    window?.visualViewport.addEventListener("scroll", viewportHandler);
    window?.visualViewport.addEventListener("resize", viewportHandler);

    return () => {
      window?.visualViewport.removeEventListener("scroll", viewportHandler);
      window?.visualViewport.removeEventListener("resize", viewportHandler);
    };
  }, [isSurveyThemePreview]);

  const errorTextDivRef = useRef(null);

  if (!questionsLength) {
    return (
      <Center style={{ height: "100vh" }}>
        <Text fw={500}>No Questions found!</Text>
      </Center>
    );
  }

  if (!selectedQ) {
    return null;
  }

  const currentQRes = responses.find((r) => r.questionId === selectedQ.id);
  const currentResponse = currentQRes?.response[selectedQ.type];

  const goTo = (question: Question) => {
    setSelectedQ(question);
    questionsHistoryHandlers.append(question.id);
    setApDirection(1);
  };

  const goBack = () => {
    const prevQId = questionsHistory[questionsHistory.length - 2];
    setSelectedQ(survey.questions.find((q) => q.id === prevQId));
    questionsHistoryHandlers.pop();
    setApDirection(-1);
  };

  const handleNext = (response: any) => {
    const currentResponse_ = response ? response : currentResponse;
    const lastQuestion = getLastQuestion(survey);
    const isLastQuestion = selectedQ?.id === lastQuestion?.id;

    const selectedQuestionIndex = survey.questions.findIndex(
      (Q) => selectedQ.id === Q.id,
    );
    if (selectedQuestionIndex === -1) throw new Error("Question not found"); // this should never happen

    if (!isLastQuestion) {
      // Not last question
      // Checking for logic jump
      const action = parseLogicAction(
        selectedQ,
        currentResponse_,
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
          if (nextQ) {
            if (
              nextQ.type === PageType.GoogleReview ||
              nextQ.type === PageType.ThankYou
            ) {
              try {
                finishSurvey(nextQ.type);
              } catch (error) {
                toast.error(error?.message?.toString());
              } finally {
                return;
              }
            }
            goTo(nextQ);
            return;
          } else {
            console.error(
              "Question not found. Invalid logic jump. Going to next question",
            );
          }
        }
      }
      goTo(survey.questions[selectedQuestionIndex + 1]);
    } else {
      // Survey completed
      openConfirmationModal();
    }
  };

  async function openConfirmationModal() {
    if (survey.skipPreview || isSurveyThemePreview) {
      try {
        finishSurvey();
      } catch (error) {
        toast.error(error?.message?.toString());
      }
    } else {
      openConfirmationResponsesModal();
    }
  }
  function getColumnIdFromTickets(questions, responses) {
    for (const question of questions) {
      const ticketIssue = question?.ticketIssue;
      if (!ticketIssue) continue;
      const response = responses.find((r) => r.questionId === question.id);
      if (!response) continue;
      return ticketIssue.selectedColumnId;
    }
    return null;
  }
  const finishSurvey = async (pageType = "") => {
    const start = searchParams.get("start"); //(TODO - Temp) change for survey merge
    const shouldShowGoogleReview =
      pageType === PageType.GoogleReview ||
      checkGoogleReviewForQuestion(survey?.questions, responsesRef.current);
    const shouldRaiseTicket =
      survey?.enableAutoGenerateTicket ||
      checkRaiseTicketIssueQuestion(
        survey?.questions,
        responsesRef.current,
        selectedLanguage,
      );
    let selectedColumnId = survey?.ticketColumnId;
    if (shouldRaiseTicket && !survey?.enableAutoGenerateTicket) {
      selectedColumnId = getColumnIdFromTickets(
        survey?.questions,
        responsesRef.current,
      );
    }
    // This If Condition is for survey preview in survey editor.
    if (isSurveyThemePreview) {
      shouldShowGoogleReview && !(pageType === PageType.ThankYou)
        ? setIsReviewPage(selectedLanguage)
        : isThankYouPageEnabled
          ? setIsThankyouPage?.(true)
          : setIsDefaultThankyouPage?.(true);
      return;
    }

    setIsSavingResponses(true);

    const checkUniqueDevice = survey?.uniqueDeviceResponse;

    //logic for encrypting the responses, to swap values between response variable and end to end encrypted response
    let defaultResponses = responsesRef.current;
    let encryptedResponses = "";
    if (survey?.isEncrypted || survey?.publicKey) {
      const { encryptedResponse } = await encryptResponse(
        responsesRef.current,
        survey?.publicKey,
      );
      encryptedResponses = encryptedResponse;
      defaultResponses = [];
    }
    const shortId = params?.shortId as string;
    submitSurvey({
      surveyTeamMapId: surveyTeamMapId,
      responses: defaultResponses,
      encryptedResponses: encryptedResponses,
      selectedLanguage,
      setIsSavingResponses,
      coordinates,
      tag: searchParams.get("tag"),
      shouldRaiseTicket,
      checkUniqueDevice,
      selectedColumnId,
    })
      .then(() => {
        updateCompleted.mutate(surveyTeamMapId);
        let kioskMode = survey?.kioskMode ? "y" : "n";
        kioskMode = start === "true" ? "cs" : kioskMode; // temp for static cs demo (TODO)

        shouldShowGoogleReview && !(pageType === PageType.ThankYou)
          ? setIsReviewPage(selectedLanguage)
          : isThankYouPageEnabled
            ? fromShortUrl
              ? router.push(`/ws/${shortId}/end`)
              : router.push(
                  `${surveyTeamMapId}/end?k=${kioskMode}&sid=${survey.id}&language=${selectedLanguage}`,
                )
            : router.push(`/ws/${shortId}/response-submitted`);
      })
      .catch((e) => {
        if (e?.message === "ALREADY_RESPONDED") {
          fromShortUrl
            ? router.push(`/ws/${shortId}/end?err=oops`)
            : router.push(
                `${surveyTeamMapId}/end?k=${false}&sid=${survey.id}&language=${selectedLanguage}&err=oops`,
              );
        }
      });
  };

  const handlePrev = () => {
    goBack();
  };

  const updateResponse = (response: object) => {
    const index = responsesRef.current.findIndex(
      (r) => r.questionId === selectedQ.id,
    );
    // Converting response to QuestionResponse
    const formattedResponse: QuestionResponse = {
      response: {
        [selectedQ.type]: response,
      },
      questionId: selectedQ.id,
      type: selectedQ.type as QuestionType,
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
      <SurveyContextProvider survey={survey}>
        <SelectedQContext.Provider value={{ selectedQ, alignment }}>
          <SurveyThemeContextProvider surveyThemeObj={surveyThemeData}>
            <NextPrevFuncsAndLastQuestionContextProvider
              nextFn={handleNext}
              prevFn={handlePrev}
              survey={survey}
            >
              <Container
                size={"md"}
                className={styles["take-survey-root-div"]}
                ref={takeSurveyRootDivRef}
                style={isSavingResponses ? { pointerEvents: "none" } : {}}
              >
                <Stack justify="space-between" h={"100%"} gap={"1rem"}>
                  <ConfirmResponsesModal
                    opened={isConfirmResponsesModalOpen}
                    close={closeConfirmResponsesModal}
                    survey={survey}
                    questionsHistory={questionsHistory}
                    responses={responsesRef.current}
                    selectedLanguage={selectedLanguage}
                    surveyThemeData={surveyThemeData}
                    finishSurvey={finishSurvey}
                    isSavingResponses={isSavingResponses}
                    largeScreen={largeScreen}
                  />

                  <AnimatePresence initial={false}>
                    <Box
                      className={`${styles["question-form-title-desc-container"]}`}
                    >
                      <motion.div
                        className={
                          styles["question-form-title-desc-motion-div"]
                        }
                        key={selectedQ.id}
                        transition={{
                          type: "tween",
                          duration: 0.85,
                        }}
                        initial={{
                          x: aPDirection > 0 ? "100%" : "-100%",
                          opacity: 0,
                        }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{
                          x: aPDirection > 0 ? "-100%" : "100%",
                          opacity: 0,
                        }}
                      >
                        <motion.div
                          className={`${styles["question-and-error-text-containers-wrapper"]}  prose max-w-none`}
                          layout="position"
                          transition={{
                            type: "tween",
                            duration: 0.2,
                          }}
                        >
                          <ScrollArea.Autosize
                            type="never"
                            className={styles["question-div"]}
                          >
                            {selectedQ.type in PageType ? (
                              <CustomHTML
                                content={
                                  selectedQ?.description[selectedLanguage]
                                }
                              />
                            ) : (
                              <>
                                <Box
                                  className={`${styles["title-desc-container"]}`}
                                >
                                  <QuestionTitle
                                    largeScreen={largeScreen}
                                    themeStyles={
                                      surveyThemeData?.surveyTheme?.title
                                        ?.styles
                                    }
                                    smallScreen={smallScreen}
                                    responses={responsesRef.current}
                                    surveyId={survey?.id}
                                    setAlignment={setAlignment}
                                  />
                                  {!isHtml(
                                    selectedQ?.title[selectedLanguage],
                                  ) && (
                                    <QuestionDesc
                                      largeScreen={largeScreen}
                                      themeStyles={
                                        surveyThemeData?.surveyTheme?.subtitle
                                          ?.styles
                                      }
                                    />
                                  )}
                                </Box>

                                <QuestionForm />
                              </>
                            )}
                          </ScrollArea.Autosize>

                          <Box
                            className={styles["error-text-div"]}
                            ref={errorTextDivRef}
                          >
                            {/* required, response error messages will be rendered here */}
                          </Box>
                        </motion.div>
                      </motion.div>
                    </Box>
                  </AnimatePresence>

                  <NextPrev
                    next={handleNext}
                    prev={handlePrev}
                    survey={survey}
                    questionsLength={questionsLength}
                    surveyThemeData={surveyThemeData}
                    isSavingResponses={isSavingResponses}
                    errorTextDivRef={errorTextDivRef}
                    isSurveyThemePreview={isSurveyThemePreview}
                  />
                </Stack>
              </Container>
            </NextPrevFuncsAndLastQuestionContextProvider>
          </SurveyThemeContextProvider>
        </SelectedQContext.Provider>
      </SurveyContextProvider>
    </CurrentResponsesContext.Provider>
  );
}

export default TakeSurvey;
