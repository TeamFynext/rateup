import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useUpdateCompletedMutation } from "@/backend/surveys/surveys.query";
import { NextPrevFuncsAndLastQuestionContextProvider } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import { SurveyContextProvider } from "@/context/SurveyObjContext.tsx";
import { SurveyThemeContextProvider } from "@/context/SurveyThemeContext.tsx";
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import type { QuestionType } from "@/types/enums.ts";
import { LogicAction, PageType } from "@/types/enums.ts";
import { getApiErrorMessage } from "@/utils/apiError.ts";
import { encryptResponse } from "@/utils/encryption/index.ts";
import { isHtml } from "@/utils/index.ts";
import { parseLogicAction } from "@/utils/survey/logic/logic.utils";

import CustomHTML from "../../Page/Previews/CustomHTML.tsx";
import { useIsSurveyThemePreview } from "../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext.tsx";
import ConfirmResponsesModal from "./ConfirmResponsesModal.tsx";
import NextPrev from "./NextPrev.tsx";
import QuestionDesc from "./QuestionDesc.tsx";
import QuestionForm from "./QuestionForm.tsx";
import QuestionTitle from "./QuestionTitle.tsx";
import {
  checkGoogleReviewForQuestion,
  checkRaiseTicketIssueQuestion,
  getFirstQuestion,
  getLastQuestion,
  getQuestionsLength,
  submitSurvey,
} from "./util.tsx";

function useListState<T>(initialValue: T[]) {
  const [state, setState] = useState<T[]>(initialValue);
  const handlers = {
    append: (item: T) => setState((current) => [...current, item]),
    setItem: (index: number, item: T) =>
      setState((current) => current.map((value, i) => (i === index ? item : value))),
    pop: () => setState((current) => current.slice(0, -1)),
  };
  return [state, handlers] as const;
}

function TakeSurvey({
  survey,
  setIsReviewPage,
  fromShortUrl = false,
  setIsThankyouPage = null,
  setIsDefaultThankyouPage = null,
}: {
  survey: Survey;
  setIsReviewPage?: (language: string) => void;
  fromShortUrl?: boolean;
  setIsThankyouPage?: ((isThankYou: boolean) => void) | null;
  setIsDefaultThankyouPage?: ((isDefault: boolean) => void) | null;
}) {
  const isSurveyThemePreview = useIsSurveyThemePreview();

  const largeScreen = useMediaQuery("(min-width: 60em)");

  const searchParams = useSearch({ strict: false });
  const [isSavingResponses, setIsSavingResponses] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  const surveyTeamMapId = survey.surveyTeamMapId;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const { theme: surveyThemeData } = survey?.webSurveyTheme ?? {};

  const [isThankYouPageEnabled, setIsThankYouPageEnabled] = useState(
    survey?.questions?.some((q) => q.type === PageType.ThankYou) || false,
  );

  const [selectedQ, setSelectedQ] = useState<Question | null>(null);
  const [alignment, setAlignment] = useState("left");
  const [isConfirmResponsesModalOpen, setIsConfirmResponsesModalOpen] = useState(false);
  const openConfirmationResponsesModal = () => setIsConfirmResponsesModalOpen(true);
  const closeConfirmResponsesModal = () => setIsConfirmResponsesModalOpen(false);

  // Questions Array length without PageType Questions(excluding Custom Page type question).
  const questionsLength = getQuestionsLength(survey);

  // used for animation of question change in Question AnimationPresence below.
  const [aPDirection, setApDirection] = useState(0);

  const [coordinates, setCoordinates] = useState<
    { latitude: number; longitude: number } | undefined
  >(undefined);

  const updateCompleted = useUpdateCompletedMutation(survey?.id ?? "");

  const [responses, handlers] = useListState<QuestionResponse>([]);
  const responsesRef = useRef(responses);
  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  // Used to track questions filled by user. Since there may be logical jumps, this can be used by handlePrev to get the previous question
  const [questionsHistory, questionsHistoryHandlers] = useListState<string>([]);
  const navigate = useNavigate();
  const params = useParams({
    strict: false,
  });

  useEffect(() => {
    setIsThankYouPageEnabled(survey?.questions?.some((q) => q.type === PageType.ThankYou) || false);
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

  const takeSurveyRootDivRef = useRef<HTMLDivElement | null>(null);

  const pendingUpdate = useRef(false);
  const viewportHandler = (event: Event) => {
    const visualViewport = event.target as VisualViewport;
    if (pendingUpdate.current) return;
    pendingUpdate.current = true;

    requestAnimationFrame(() => {
      pendingUpdate.current = false;
      const takeSurveyRootDiv = takeSurveyRootDivRef.current;
      const nextPrevBtnDiv = document.getElementById("next-prev-btn-div");
      if (takeSurveyRootDiv && nextPrevBtnDiv) {
        const nextPrevBtnDivHeight = nextPrevBtnDiv.getBoundingClientRect().height;
        const nextPrevBtnOffsetTop = nextPrevBtnDiv.offsetTop;

        const offsetLeft = visualViewport.offsetLeft;

        const nextPrevBtnDivTranslateY =
          -(nextPrevBtnOffsetTop - visualViewport.height + nextPrevBtnDivHeight) +
          visualViewport.offsetTop;
        if (!isSurveyThemePreview)
          nextPrevBtnDiv.style.transform = `translate(${offsetLeft}px, ${nextPrevBtnDivTranslateY}px)`;
      }
    });
  };

  useEffect(() => {
    window?.visualViewport?.addEventListener("scroll", viewportHandler);
    window?.visualViewport?.addEventListener("resize", viewportHandler);

    return () => {
      window?.visualViewport?.removeEventListener("scroll", viewportHandler);
      window?.visualViewport?.removeEventListener("resize", viewportHandler);
    };
  }, [isSurveyThemePreview]);

  const errorTextDivRef = useRef<HTMLDivElement | null>(null);

  if (!questionsLength) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="font-medium">No Questions found!</p>
      </div>
    );
  }

  if (!selectedQ) {
    return null;
  }

  const currentQRes = responses.find((r) => r.questionId === selectedQ.id);
  const currentResponse =
    currentQRes?.response[selectedQ.type as keyof QuestionResponse["response"]];

  const goTo = (question: Question) => {
    setSelectedQ(question);
    questionsHistoryHandlers.append(question.id);
    setApDirection(1);
  };

  const goBack = () => {
    const prevQId = questionsHistory[questionsHistory.length - 2];
    setSelectedQ(survey.questions.find((q) => q.id === prevQId) ?? null);
    questionsHistoryHandlers.pop();
    setApDirection(-1);
  };

  const handleNext = (response) => {
    const currentResponse_ = response ? response : currentResponse;
    const lastQuestion = getLastQuestion(survey);
    const isLastQuestion = selectedQ?.id === lastQuestion?.id;

    const selectedQuestionIndex = survey.questions.findIndex((Q) => selectedQ.id === Q.id);
    if (selectedQuestionIndex === -1) throw new Error("Question not found"); // this should never happen

    if (!isLastQuestion) {
      // Not last question
      // Checking for logic jump
      const action = parseLogicAction(selectedQ, currentResponse_, selectedLanguage);
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
            if (nextQ.type === PageType.GoogleReview || nextQ.type === PageType.ThankYou) {
              try {
                finishSurvey(nextQ.type);
              } catch (error) {
                toast.error(getApiErrorMessage(error));
              }
              return;
            }
            goTo(nextQ);
            return;
          } else {
            console.error("Question not found. Invalid logic jump. Going to next question");
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
        toast.error(getApiErrorMessage(error));
      }
    } else {
      openConfirmationResponsesModal();
    }
  }
  function getColumnIdFromTickets(questions: Question[], responses: QuestionResponse[]) {
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
    const start = searchParams.start; // (TODO - Temp) change for survey merge
    const shouldShowGoogleReview =
      pageType === PageType.GoogleReview ||
      checkGoogleReviewForQuestion(survey?.questions, responsesRef.current);
    const shouldRaiseTicket =
      survey?.enableAutoGenerateTicket ||
      checkRaiseTicketIssueQuestion(
        survey?.questions ?? [],
        responsesRef.current,
        selectedLanguage,
      );
    let selectedColumnId: string | undefined = survey?.ticketColumnId;
    if (shouldRaiseTicket && !survey?.enableAutoGenerateTicket) {
      selectedColumnId =
        getColumnIdFromTickets(survey?.questions ?? [], responsesRef.current) ?? undefined;
    }
    // This If Condition is for survey preview in survey editor.
    if (isSurveyThemePreview) {
      if (shouldShowGoogleReview && !(pageType === PageType.ThankYou)) {
        setIsReviewPage?.(selectedLanguage);
      } else if (isThankYouPageEnabled) {
        setIsThankyouPage?.(true);
      } else {
        setIsDefaultThankyouPage?.(true);
      }
      return;
    }

    setIsSavingResponses(true);

    const checkUniqueDevice = survey?.uniqueDeviceResponse;

    // logic for encrypting the responses, to swap values between response variable and end to end encrypted response
    let defaultResponses = responsesRef.current;
    let encryptedResponses = "";
    if (survey?.isEncrypted || survey?.publicKey) {
      const { encryptedResponse } = await encryptResponse(
        responsesRef.current,
        survey?.publicKey ?? "",
      );
      encryptedResponses = encryptedResponse ?? "";
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
      tag: typeof searchParams.tag === "string" ? searchParams.tag : null,
      shouldRaiseTicket,
      checkUniqueDevice,
      selectedColumnId,
    })
      .then(() => {
        updateCompleted.mutate(surveyTeamMapId ?? "");
        let kioskMode = survey?.kioskMode ? "y" : "n";
        kioskMode = start === "true" ? "cs" : kioskMode; // temp for static cs demo (TODO)

        if (shouldShowGoogleReview && !(pageType === PageType.ThankYou)) {
          setIsReviewPage?.(selectedLanguage);
        } else if (isThankYouPageEnabled) {
          if (fromShortUrl) {
            navigate({
              to: `/ws/${shortId}/end`,
            });
          } else {
            navigate({
              to: `${surveyTeamMapId}/end?k=${kioskMode}&sid=${survey.id}&language=${selectedLanguage}`,
            });
          }
        } else {
          navigate({
            to: `/ws/${shortId}/response-submitted`,
          });
        }
      })
      .catch((e) => {
        if (e?.message === "ALREADY_RESPONDED") {
          if (fromShortUrl) {
            navigate({
              to: `/ws/${shortId}/end?err=oops`,
            });
          } else {
            navigate({
              to: `${surveyTeamMapId}/end?k=${false}&sid=${survey.id}&language=${selectedLanguage}&err=oops`,
            });
          }
        }
      });
  };

  const handlePrev = () => {
    goBack();
  };

  const updateResponse = (response: object) => {
    const index = responsesRef.current.findIndex((r) => r.questionId === selectedQ.id);
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
    <CurrentResponsesContext.Provider value={{ response: currentResponse, updateResponse }}>
      <SurveyContextProvider survey={survey}>
        <SelectedQContext.Provider value={{ selectedQ, alignment }}>
          <SurveyThemeContextProvider surveyThemeObj={surveyThemeData}>
            <NextPrevFuncsAndLastQuestionContextProvider
              nextFn={handleNext}
              prevFn={handlePrev}
              survey={survey}
            >
              <div
                ref={takeSurveyRootDivRef}
                className="mx-auto h-full w-full max-w-[64em] px-4"
                style={isSavingResponses ? { pointerEvents: "none" } : {}}
              >
                <div className="flex h-full flex-col justify-between gap-4">
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
                    <div className="relative flex-1">
                      <motion.div
                        className="absolute flex h-full w-full flex-col justify-center"
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
                          className="prose flex h-full max-w-none flex-col gap-2.5 px-[0.3125rem]"
                          layout="position"
                          transition={{
                            type: "tween",
                            duration: 0.2,
                          }}
                        >
                          <ScrollAreaPrimitive.Root className="m-0 min-h-0 w-full max-w-full flex-1 p-0">
                            <ScrollAreaPrimitive.Viewport className="size-full max-h-full rounded-[inherit] outline-none">
                              <div className="flex flex-col justify-center py-[0.3125rem]">
                                {selectedQ.type in PageType ? (
                                  <CustomHTML content={selectedQ?.description[selectedLanguage]} />
                                ) : (
                                  <>
                                    <div className="mb-2.5">
                                      <QuestionTitle
                                        largeScreen={largeScreen}
                                        themeStyles={surveyThemeData?.surveyTheme?.title?.styles}
                                        responses={responsesRef.current}
                                        surveyId={survey?.id}
                                        setAlignment={setAlignment}
                                      />
                                      {!isHtml(selectedQ?.title[selectedLanguage]) && (
                                        <QuestionDesc
                                          largeScreen={largeScreen}
                                          themeStyles={
                                            surveyThemeData?.surveyTheme?.subtitle?.styles
                                          }
                                        />
                                      )}
                                    </div>

                                    <QuestionForm />
                                  </>
                                )}
                              </div>
                            </ScrollAreaPrimitive.Viewport>
                          </ScrollAreaPrimitive.Root>

                          <div ref={errorTextDivRef}>
                            {/* required, response error messages will be rendered here */}
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  </AnimatePresence>

                  <NextPrev
                    next={handleNext}
                    prev={handlePrev}
                    survey={survey}
                    questionsLength={questionsLength}
                    surveyThemeData={surveyThemeData}
                    isSavingResponses={isSavingResponses}
                    errorTextDivRef={errorTextDivRef}
                  />
                </div>
              </div>
            </NextPrevFuncsAndLastQuestionContextProvider>
          </SurveyThemeContextProvider>
        </SelectedQContext.Provider>
      </SurveyContextProvider>
    </CurrentResponsesContext.Provider>
  );
}

export default TakeSurvey;
