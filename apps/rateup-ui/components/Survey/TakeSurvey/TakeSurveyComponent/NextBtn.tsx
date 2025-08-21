import { useContext, useEffect, useState } from "react";

import { Box, Button } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { CurrentResponsesContext } from "../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../context/SelectedQ";
import { QuestionType as Q } from "../../../../types/enums";
import { validateQuestion } from "../../../../utils/validation";
import { validateResponse } from "./util";

function NextBtn({ next, themeStyles, survey, isSavingResponses }) {
  const { selectedQ } = useContext(SelectedQContext);
  const { response } = useContext(CurrentResponsesContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [isErrorInput, setIsErrorInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const { borderRadius, ...otherThemeStyles } = themeStyles;
  const translations = useTranslations();
  useEffect(() => {
    // TODO: check if rebase was done correctly

    if (response) {
      const errMsg = validateResponse(response, selectedQ, selectedLanguage);
      setErrorMsg(errMsg);
      if (errMsg.length) setIsErrorInput(true);
      else setIsErrorInput(false);
    }
    //custom validation rules
    if (
      selectedQ?.validationRules &&
      response &&
      (selectedQ?.type === Q.Number ||
        selectedQ?.type === Q.Text ||
        selectedQ?.type === Q.TextArea)
    ) {
      let error = validateQuestion(selectedQ, response, selectedLanguage);
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

  if (!survey) return null;
  const isLastQuestion =
    survey?.questions?.indexOf(selectedQ) === survey?.questions?.length - 1;
  return (
    <>
      <Box mt={"lg"}>
        {isLastQuestion ? (
          <Button
            radius={"md"}
            disabled={
              ((selectedQ?.required || selectedQ?.validationRules) &&
                !response) ||
              isErrorInput
            }
            onClick={handleNextClick}
            color="var(--tertiary-color)"
            rightSection={<IconChevronRight />}
            style={
              !(
                ((selectedQ?.required || selectedQ?.validationRules) &&
                  !response) ||
                isErrorInput
              ) && otherThemeStyles
            }
            loading={isSavingResponses}
          >
            {translations("Submit")}
          </Button>
        ) : (
          <Button
            radius={"md"}
            disabled={
              ((selectedQ?.required || selectedQ?.validationRules) &&
                !response) ||
              isErrorInput
            }
            onClick={handleNextClick}
            color="var(--tertiary-color)"
            rightSection={<IconChevronRight />}
            style={
              !(
                ((selectedQ?.required || selectedQ?.validationRules) &&
                  !response) ||
                isErrorInput
              ) && otherThemeStyles
            }
          >
            {translations("Next")}
          </Button>
        )}
      </Box>
    </>
  );
}

export default NextBtn;
