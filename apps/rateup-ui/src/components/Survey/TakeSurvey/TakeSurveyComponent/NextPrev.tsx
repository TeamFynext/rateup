import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useContext, useEffect, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button.tsx";
import { ProgressIndicator, ProgressTrack } from "@/components/ui/progress.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import SelectedLanguageContext from "@/context/SelectedLanguage.ts";
import { SelectedQContext } from "@/context/SelectedQ.ts";
import type { SurveyTheme } from "@/context/SurveyThemeContext.tsx";
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import type { QuestionType } from "@/types/enums.ts";
import { QuestionType as Q } from "@/types/enums.ts";
import { validationSupportedTypes } from "@/utils/data.ts";
import { validateQuestion } from "@/utils/validation/index.ts";

import { getSelectedQPos, validateResponse } from "./util.tsx";

function NextPrev({
  prev,
  next,
  questionsLength,
  survey,
  isSavingResponses,
  surveyThemeData,
  errorTextDivRef,
}: {
  prev: () => void;
  next: (response?: unknown) => void;
  questionsLength: number;
  survey: Survey;
  isSavingResponses: boolean;
  surveyThemeData: SurveyTheme | null;
  errorTextDivRef: RefObject<HTMLDivElement | null>;
}) {
  const { selectedQ } = useContext(SelectedQContext);
  const { response } = useContext(CurrentResponsesContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [isErrorInput, setIsErrorInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { isLastQuestion, isFirstQuestion } = useHandleNextPrevFuncs();

  const uiTextTranslations = survey?.uiTextTranslations;
  let nextBtnLabel = uiTextTranslations["nextBtn"][selectedLanguage.toLowerCase()]?.trim();
  let submitBtnLabel = uiTextTranslations["submitBtn"][selectedLanguage.toLowerCase()]?.trim();
  if (!nextBtnLabel) {
    nextBtnLabel = "Next";
  }
  if (!submitBtnLabel) {
    submitBtnLabel = "Submit";
  }
  const selectedQuestionPosition = getSelectedQPos(survey, selectedQ);
  const { t: translations } = useTranslation();
  const themeStyles = surveyThemeData?.surveyTheme?.button?.styles;
  const inputColor = surveyThemeData?.surveyTheme?.input?.primaryColor;

  // themeStylesWoBr => themeStyles without border radius, border radius option will be removed from theme settings, for this we are taking themeStyles object without borderRadius, since old theme object will still have borderRadius.
  const { ...themeStylesWoBr } = themeStyles;

  useEffect(() => {
    const errMsg = validateResponse(response, selectedQ, selectedLanguage);
    setErrorMsg(errMsg);
    if (errMsg.length) setIsErrorInput(true);
    else setIsErrorInput(false);

    // custom validation rules
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
      selectedQ?.type === Q.Contact
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

  function getCompletionRate(num: number, total: number) {
    const completionPercentage = ((num / total) * 100).toFixed(0);
    return completionPercentage;
  }

  if (!survey) return null;

  const isNextDisabled =
    ((selectedQ?.required || selectedQ?.validationRules) && response !== 0 && !response) ||
    isErrorInput;

  return (
    <div
      id="next-prev-btn-div"
      className="flex w-full flex-col justify-end gap-0 px-[0.3125rem] pb-8 max-[480px]:pb-5"
    >
      {errorTextDivRef.current &&
        createPortal(
          <>
            {selectedQ?.required && !response && response !== 0 && (
              <p
                className="rounded-[0.625rem] text-sm"
                style={{ color: themeStyles?.backgroundColor }}
              >
                {translations("*Choose an option or answer to proceed!")}
              </p>
            )}

            {errorMsg && isErrorInput && (
              <p className="rounded-[0.625rem] text-sm" style={{ color: "red" }}>
                {translations("Note: *")} {errorMsg}
              </p>
            )}
          </>,
          errorTextDivRef.current,
        )}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-end gap-4">
          <Button
            variant="outline"
            size="icon"
            title=""
            disabled={isFirstQuestion}
            onClick={prev}
            style={isFirstQuestion ? {} : themeStylesWoBr}
            className="h-auto w-[2.875rem] rounded-[0.625rem] px-4 py-2.5 max-[480px]:w-[2.625rem]"
          >
            <IconChevronLeft className={isMobile ? "size-5" : "size-6"} />
          </Button>
          <Button
            disabled={isNextDisabled || isSavingResponses}
            onClick={handleNextClick}
            style={isNextDisabled ? {} : themeStylesWoBr}
            className="h-auto rounded-[0.625rem] py-2.5 pr-2.5 pl-4 text-base max-[480px]:flex-1 max-[480px]:text-sm"
          >
            {isLastQuestion ? submitBtnLabel : nextBtnLabel}
            {isSavingResponses ? (
              <Spinner style={{ color: themeStylesWoBr?.color || "white" }} />
            ) : (
              <IconChevronRight data-icon="inline-end" className={isMobile ? "size-5" : "size-6"} />
            )}
          </Button>
        </div>

        <ProgressPrimitive.Root
          value={parseInt(getCompletionRate(selectedQuestionPosition, questionsLength))}
          className="flex w-full flex-wrap gap-3"
        >
          <ProgressTrack className={isMobile ? "h-1 bg-[#d0d0d0]" : "h-1.5 bg-[#d0d0d0]"}>
            <ProgressIndicator
              className="transition-all duration-300"
              style={{ backgroundColor: inputColor }}
            />
          </ProgressTrack>
        </ProgressPrimitive.Root>
      </div>
    </div>
  );
}

export default NextPrev;
