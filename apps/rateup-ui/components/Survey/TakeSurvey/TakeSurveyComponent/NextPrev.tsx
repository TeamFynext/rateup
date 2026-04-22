"use client";

import { useContext, useEffect, useState } from "react";

import {
  ActionIcon,
  Button,
  Group,
  Portal,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useExtracted } from "next-intl";

import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext";

import { CurrentResponsesContext } from "../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../context/SelectedQ";
import { QuestionType as Q, QuestionType } from "../../../../types/enums";
import { validationSupportedTypes } from "../../../../utils/data";
import { validateQuestion } from "../../../../utils/validation";
import styles from "./TakeSurvey.module.css";
import { getSelectedQPos, validateResponse } from "./util";

function NextPrev({
  prev,
  next,
  questionsLength,
  survey,
  isSavingResponses,
  surveyThemeData,
  errorTextDivRef,
  isSurveyThemePreview = false,
}) {
  const { selectedQ } = useContext(SelectedQContext);
  const { response } = useContext(CurrentResponsesContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [isErrorInput, setIsErrorInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { isLastQuestion, isFirstQuestion } = useHandleNextPrevFuncs();

  const uiTextTranslations = survey?.uiTextTranslations;
  let nextBtnLabel =
    uiTextTranslations["nextBtn"][selectedLanguage.toLowerCase()]?.trim();
  let submitBtnLabel =
    uiTextTranslations["submitBtn"][selectedLanguage.toLowerCase()]?.trim();
  if (!nextBtnLabel) {
    nextBtnLabel = "Next";
  }
  if (!submitBtnLabel) {
    submitBtnLabel = "Submit";
  }
  const selectedQuestionPosition = getSelectedQPos(survey, selectedQ);
  const translations = useExtracted();
  const themeStyles = surveyThemeData?.surveyTheme?.button?.styles;
  const inputColor = surveyThemeData?.surveyTheme?.input?.primaryColor;

  // themeStylesWoBr => themeStyles without border radius, border radius option will be removed from theme settings, for this we are taking themeStyles object without borderRadius, since old theme object will still have borderRadius.
  const { borderRadius = "initial", ...themeStylesWoBr } = themeStyles;

  useEffect(() => {
    const errMsg = validateResponse(response, selectedQ, selectedLanguage);
    setErrorMsg(errMsg);
    if (errMsg.length) setIsErrorInput(true);
    else setIsErrorInput(false);

    //custom validation rules
    if (
      selectedQ?.validationRules &&
      response &&
      validationSupportedTypes.includes(selectedQ?.type as QuestionType)
    ) {
      const error = validateQuestion(selectedQ, response, selectedLanguage);
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

  return (
    <Stack
      gap={0}
      w={"100%"}
      justify="flex-end"
      id="next-prev-btn-div"
      className={styles["next-prev-btns-root-div"]}
    >
      {errorTextDivRef.current && (
        <Portal target={errorTextDivRef.current}>
          {selectedQ?.required && !response && response !== 0 && (
            <Text
              className={styles["message-p"]}
              c={themeStyles?.backgroundColor}
            >
              {translations("*Choose an option or answer to proceed!")}
            </Text>
          )}

          {errorMsg && isErrorInput && (
            <Text className={styles["message-p"]} c={"red"}>
              {translations("Note: *")} {errorMsg}
            </Text>
          )}
        </Portal>
      )}
      <Stack className={styles["next-prev-btns-and-progress-container"]}>
        <Group justify="flex-end">
          <ActionIcon
            className={styles["prev-btn"]}
            title=""
            disabled={isFirstQuestion}
            variant="outlined"
            onClick={prev}
            style={isFirstQuestion ? {} : themeStylesWoBr}
          >
            <IconChevronLeft size={isMobile ? 20 : 24} />
          </ActionIcon>
          <Button
            className={styles["submit-next-btn"]}
            disabled={
              ((selectedQ?.required || selectedQ?.validationRules) &&
                response !== 0 &&
                !response) ||
              isErrorInput
            }
            onClick={handleNextClick}
            rightSection={<IconChevronRight size={isMobile ? 20 : 24} />}
            style={
              ((selectedQ?.required || selectedQ?.validationRules) &&
                response !== 0 &&
                !response) ||
              isErrorInput
                ? {}
                : themeStylesWoBr
            }
            loading={isSavingResponses}
            loaderProps={{
              color: themeStylesWoBr?.color || "white",
            }}
          >
            {isLastQuestion ? submitBtnLabel : nextBtnLabel}
          </Button>
        </Group>

        <Progress
          value={parseInt(
            getCompletionRate(selectedQuestionPosition, questionsLength),
          )}
          transitionDuration={300}
          color={inputColor}
          size={isMobile ? "xs" : "sm"}
          styles={{
            root: { backgroundColor: "#d0d0d0" },
          }}
        />
      </Stack>
    </Stack>
  );
}

export default NextPrev;
