import {
  Box,
  Center,
  Container,
  Loader,
  ScrollArea,
  Stack,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useListState, useMediaQuery } from "@mantine/hooks";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/dist/client/components/navigation";
import { useRouter } from "next/router";
import { useContext, useEffect, useRef, useState } from "react";
import { useBeforeUnload } from "react-use";
import {
  Invoice,
  getInvoicesByPhNo,
} from "../../../../backend/surveys/survey.api";
import { useUpdateCompletedMutation } from "../../../../backend/surveys/surveys.query";
import QuestionCountContext from "../../../../context/QuestionCountContext";
import { CurrentResponsesContext } from "../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../context/SelectedQ";
import { LogicAction, QuestionType } from "../../../../types/enums";
import { isHtml } from "../../../../utils";
import { INTERNAL_ERROR2 } from "../../../../utils/constants";
import { encryptResponse } from "../../../../utils/encryption";
import { lexend } from "../../../../utils/fonts";
import { showErrorToast } from "../../../../utils/notifications";
import { MIN_GIFT_AMOUNT, getRandomGift } from "../../../../utils/survey/gift";
import { parseLogicAction } from "../../../../utils/survey/logic/logic.utils";
import RateupLoader from "../../../Loaders/RateupLoader";
import GiftModal from "../../Gift/GiftModal";
import { SurveyTheme } from "../../SurveyTheme/surveyTheme.types";
import ConfirmResponsesModal from "./ConfirmResponsesModal";
import NextBtn from "./NextBtn";
import NextPrev from "./NextPrev";
import QuestionDesc from "./QuestionDesc";
import QuestionForm from "./QuestionForm";
import QuestionTitle from "./QuestionTitle";
import { QuestionType as Q } from "../../../../types/enums";
import {
  checkGoogleReviewForQuestion,
  checkRaiseTicketIssueQuestion,
  submitSurvey,
  validateResponse,
} from "./util";
import { NextPrevFuncsAndLastQuestionContextProvider } from "../../../../context/NextPrevFuncsContext";
import { validateQuestion } from "../../../../utils/validation";
import styles from "./TakeSurvey.module.css";
import { SurveyThemeContextProvider } from "../../../../context/SurveyThemeContext";
import { useIsSurveyThemePreviewContext } from "../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreveiwContext";
import { SurveyContextProvider } from "../../../../context/SurveyObjContext";

function TakeSurvey({ survey, setIsReviewPage, fromShortUrl = false }) {
  const isSurveyThemePreview = useIsSurveyThemePreviewContext();

  const largeScreen = useMediaQuery("(min-width: 60em)");
  const smallScreen = useMediaQuery("(max-width: 30em)");
  const searchParams = useSearchParams();
  const [isSavingResponses, setIsSavingResponses] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [giftLoading, setGiftLoading] = useState(false);

  const surveyTeamMapId = survey.surveyTeamMapId;
  useBeforeUnload(true, "Your inputs are not submitted yet, are you sure?");

  const { theme: surveyThemeData } = survey?.webSurveyTheme;

  const [selectedQ, setSelectedQ] = useState<Question>(null);
  const [QnNo, setQnNo] = useState(1);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [
    isConfirmResponsesModalOpen,
    { open: openConfirmationResponsesModal, close: closeConfirmResponsesModal },
  ] = useDisclosure(false);
  const [opened, { toggle, close }] = useDisclosure(false);

  // used for animation of question change in Question AnimationPresence below.
  const [aPDirection, setApDirection] = useState(0);

  const theme = useMantineTheme();
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  }>(undefined);

  const { setQuestionCount, setCurrentQuestionNo, questionCount } =
    useContext(QuestionCountContext);
  const updateCompleted = useUpdateCompletedMutation(survey?.id);

  const [responses, handlers] = useListState<QuestionResponse>([]);

  // Used to track questions filled by user. Since there may be logical jumps, this can be used by handlePrev to get the previous question
  const [questionsHistory, questionsHistoryHandlers] = useListState<string>([]);
  const router = useRouter();

  const [pageSwitchTransition, setPageSwitchTransition] = useState<
    "fade" | "leftSlideIn" | "rightSlideIn" | "bottomSlideIn" | "bottomSlideOut"
  >("bottomSlideIn");

  const formMaxHeight = smallScreen ? "calc(100dvh - 10.9375rem)" : `70dvh`;

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

  const takeSurveyRootDivRef = useRef(null);

  let pendingUpdate = useRef(false);
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
    setApDirection(1);
  };

  const goBack = () => {
    const prevQId = questionsHistory[questionsHistory.length - 2];
    setSelectedQ(survey.questions.find((q) => q.id === prevQId));
    setPageSwitchTransition("bottomSlideOut");
    questionsHistoryHandlers.pop();
    setApDirection(-1);
  };

  const handleNext = (response: any) => {
    const currentResponse_ = response ? response : currentResponse;
    const index = survey.questions.findIndex((Q) => selectedQ.id === Q.id);
    if (index === -1) throw new Error("Question not found"); // this should never happen

    if (index < survey.questions.length - 1) {
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

  async function openConfirmationModal() {
    if (survey.skipPreview) {
      //TODO REMOVE LATER: MYG GIFT VISHU
      try {
        if (survey.id === process.env.NEXT_PUBLIC_VISHU_SURVEY) {
          const contactRes = responses?.find(
            (data) => data.type === QuestionType.Contact,
          );
          setGiftLoading(true);

          const res = await getInvoicesByPhNo(
            contactRes?.response?.Contact?.phone?.substring(3),
          );
          setInvoiceList(res);
          toggle();
        } else {
          finishSurvey();
        }
      } catch (error) {
        showErrorToast(error?.message?.toString());
      } finally {
        setGiftLoading(false);
      }
    } else {
      openConfirmationResponsesModal();
    }
  }

  const finishSurvey = async (image = "", price = 0, error = "") => {
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

    let checkUniqueDevice = survey?.uniqueDeviceResponse;

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
      checkUniqueDevice,
      phone: searchParams.get("phone"),
    })
      .then(() => {
        updateCompleted.mutate(surveyTeamMapId);
        let kioskMode = survey?.kioskMode ? "y" : "n";
        kioskMode = start === "true" ? "cs" : kioskMode; // temp for static cs demo (TODO)
        //TODO REMOVE LATER: MYG GIFT VISHU
        if (survey.id === process.env.NEXT_PUBLIC_VISHU_SURVEY) {
          const giftRes = responses?.findLast(
            (data) => data.type === QuestionType.WinItem,
          );
          const encodedString = encodeURIComponent(
            `?name=${giftRes?.response?.Win_item ?? ""}&image=${image ?? ""}&error=${error ?? ""}&price=${price ?? 0}`,
          );
          const gift = btoa(encodedString);
          router.push(`/ws/${router.query.shortId}/end?gift=${gift}`);
          return;
        }
        shouldShowGoogleReview
          ? //  ? router.push(`${surveyId}/review-us-on-google`)  //TODO remove after testing
            setIsReviewPage(selectedLanguage)
          : fromShortUrl
            ? router.push(`/ws/${router.query.shortId}/end`)
            : router.push(
                `${surveyTeamMapId}/end?k=${kioskMode}&sid=${survey.id}&language=${selectedLanguage}`,
              );
      })
      .catch((e) => {
        if (e?.message === "ALREADY_RESPONDED") {
          fromShortUrl
            ? router.push(`/ws/${router.query.shortId}/end?err=oops`)
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
  const handleInvoiceSubmit = ({
    id,
    price,
    redeem,
  }: {
    id: string;
    price: number;
    redeem: boolean;
  }) => {
    if (!id || redeem || price < MIN_GIFT_AMOUNT) return;
    const gift = getRandomGift(price);
    if (gift) {
      responses.push({
        questionId: "win_item",
        response: {
          Win_item: gift.name,
          invoice_id: id,
        },
        type: QuestionType.WinItem,
      });
      finishSurvey(gift.image, price);
    } else {
      responses.push({
        questionId: "win_item",
        response: {
          Win_item: "Not eligible",
          invoice_id: id,
        },
        type: QuestionType.WinItem,
      });
      finishSurvey("", 0, INTERNAL_ERROR2);
    }
  };

  return (
    <CurrentResponsesContext.Provider
      value={{ response: currentResponse, updateResponse }}
    >
      <SurveyContextProvider survey={survey}>
        <SelectedQContext.Provider value={{ selectedQ }}>
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
              >
                <Stack justify="space-between" h={"100%"} gap={"1rem"}>
                  <ConfirmResponsesModal
                    opened={isConfirmResponsesModalOpen}
                    close={closeConfirmResponsesModal}
                    survey={survey}
                    questionsHistory={questionsHistory}
                    responses={responses}
                    selectedLanguage={selectedLanguage}
                    surveyThemeData={surveyThemeData}
                    finishSurvey={finishSurvey}
                    isSavingResponses={isSavingResponses}
                    largeScreen={largeScreen}
                  />
                  <GiftModal
                    close={close}
                    invoiceList={invoiceList}
                    opened={opened}
                    handleInvoiceSubmit={handleInvoiceSubmit}
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
                          className={
                            styles["question-and-error-text-containers-wrapper"]
                          }
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
                            <Box
                              className={`${styles["title-desc-container"]} ${lexend.className}`}
                            >
                              <QuestionTitle
                                largeScreen={largeScreen}
                                themeStyles={
                                  surveyThemeData?.surveyTheme?.title?.styles
                                }
                                smallScreen={smallScreen}
                                responses={responses}
                                surveyId={survey?.id}
                              />
                              {!isHtml(selectedQ?.title[selectedLanguage]) && (
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
                    num={QnNo}
                    total={questionCount}
                    survey={survey}
                    surveyThemeData={surveyThemeData}
                    isSavingResponses={isSavingResponses || giftLoading}
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
