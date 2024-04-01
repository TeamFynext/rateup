import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { useSearchParams } from "next/dist/client/components/navigation";
import {
  Center,
  Container,
  Loader,
  Text,
  useMantineTheme,
  Box,
  LoadingOverlay,
  ScrollArea,
  Stack,
} from "@mantine/core";
import { useDisclosure, useListState, useMediaQuery } from "@mantine/hooks";
import { useRouter } from "next/router";
import { useUpdateCompletedMutation } from "../../../../backend/surveys/surveys.query";
import { useContext, useEffect, useRef, useState } from "react";
import { SelectedQContext } from "../../../../context/SelectedQ";
import { LogicAction, QuestionType as Q } from "../../../../types/enums";
import { CurrentResponsesContext } from "../../../../context/ResponseContext";
import QuestionCountContext from "../../../../context/QuestionCountContext";
import { parseLogicAction } from "../../../../utils/survey/logic/logic.utils";
import { encryptResponse } from "../../../../utils/encryption";
import { useSurveyTheme } from "../../../../backend/surveyTheme/surveyTheme.query";
import { SurveyTheme } from "../../SurveyTheme/surveyTheme.types";
import { motion, AnimatePresence } from "framer-motion";
import { lexend } from "../../../../utils/fonts";
import RateupLoader from "../../../Loaders/RateupLoader";
import {
  checkGoogleReviewForQuestion,
  checkRaiseTicketIssueQuestion,
  submitSurvey,
} from "./util";
import ConfirmResponsesModal from "./ConfirmResponsesModal";
import NextPrev from "./NextPrev";
import QuestionForm from "./QuestionForm";
import QuestionDesc from "./QuestionDesc";
import QuestionTitle from "./QuestionTitle";
import styles from "./TakeSurvey.module.css";
import { useBeforeUnload } from "react-use";
import { RichTextEditor } from "@mantine/tiptap";

function TakeSurvey({ survey, setIsReviewPage, fromShortUrl = false }) {
  const largeScreen = useMediaQuery("(min-width: 60em)");
  const smallScreen = useMediaQuery("(max-width: 30em)");
  const searchParams = useSearchParams();
  const [isSavingResponses, setIsSavingResponses] = useState(false);
  const { selectedLanguage } = useContext(SelectedLanguageContext);

  const surveyTeamMapId = survey.surveyTeamMapId;
  useBeforeUnload(true, "Your inputs are not submitted yet, are you sure?");

  const { data: surveyThemeData, isLoading: IsLoading } = useSurveyTheme(
    survey?.id,
  ) as {
    data: SurveyTheme;
    isLoading: boolean;
  };
  const [selectedQ, setSelectedQ] = useState<Question>(null);
  const [QnNo, setQnNo] = useState(1);
  const [
    isConfirmResponsesModalOpen,
    { open: openConfirmationResponsesModal, close: closeConfirmResponsesModal },
  ] = useDisclosure(false);

  // used for animation of question change in Question AnimationPresence below.
  const [aPDirection, setApDirection] = useState(0);

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
    setApDirection(1);
  };

  const goBack = () => {
    const prevQId = questionsHistory[questionsHistory.length - 2];
    setSelectedQ(survey.questions.find((q) => q.id === prevQId));
    setPageSwitchTransition("bottomSlideOut");
    questionsHistoryHandlers.pop();
    setApDirection(-1);
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
      openConfirmationResponsesModal();
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
    })
      .then(() => {
        updateCompleted.mutate(surveyTeamMapId);
        let kioskMode = survey?.kioskMode ? "y" : "n";
        kioskMode = start === "true" ? "cs" : kioskMode; // temp for static cs demo (TODO)
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

  if (IsLoading) return <RateupLoader h={"100dvh"} />;

  return (
    <CurrentResponsesContext.Provider
      value={{ response: currentResponse, updateResponse }}
    >
      <SelectedQContext.Provider value={{ selectedQ }}>
        <Container size={"md"}>
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

          <Box pos="relative">
            {/* <LoadingOverlay
              visible={isSavingResponses}
              zIndex={1000}
              overlayProps={{ radius: "sm", blur: 10 }}
            /> */}
            <Stack>
              <AnimatePresence initial={false}>
                <Box
                  className={`${styles["question-form-title-desc-container"]}`}
                >
                  <motion.div
                    className={styles["question-form-title-desc-motion-div"]}
                    key={selectedQ.id}
                    transition={{
                      type: "tween",
                      duration: 0.5,
                    }}
                    initial={{
                      x: aPDirection > 0 ? "120%" : "-120%",
                      opacity: 0,
                    }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: aPDirection > 0 ? "-120%" : "120%", opacity: 0 }}
                  >
                    <motion.div
                      layout="position"
                      transition={{
                        type: "tween",
                        duration: 0.2,
                      }}
                    >
                      <Box
                        pb={smallScreen ? "sm" : "lg"}
                        ref={boxRef}
                        className={lexend.className}
                      >
                        <QuestionTitle
                          largeScreen={largeScreen}
                          themeStyles={
                            surveyThemeData?.surveyTheme?.title?.styles
                          }
                          smallScreen={smallScreen}
                        />
                        {selectedQ.type !== Q.InfoMessage && (
                          <QuestionDesc
                            largeScreen={largeScreen}
                            themeStyles={
                              surveyThemeData?.surveyTheme?.subtitle?.styles
                            }
                          />
                        )}
                      </Box>
                      <ScrollArea.Autosize
                        mah={formMaxHeight}
                        p={0}
                        m={0}
                        w={"100%"}
                      >
                        <QuestionForm />
                      </ScrollArea.Autosize>
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
                themeStyles={surveyThemeData?.surveyTheme?.button?.styles}
                isSavingResponses={isSavingResponses}
              />
            </Stack>
          </Box>
        </Container>
      </SelectedQContext.Provider>
    </CurrentResponsesContext.Provider>
  );
}

export default TakeSurvey;
