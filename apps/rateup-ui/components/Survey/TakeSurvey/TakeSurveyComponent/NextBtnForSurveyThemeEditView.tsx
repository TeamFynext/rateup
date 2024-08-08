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

import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext";

import { CurrentResponsesContext } from "../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { SelectedQContext } from "../../../../context/SelectedQ";
import { QuestionType as Q, QuestionType } from "../../../../types/enums";
import { validationSupportedTypes } from "../../../../utils/data";
import { validateQuestion } from "../../../../utils/validation";
import styles from "./TakeSurvey.module.css";
import { validateResponse } from "./util";

function NextBtnForSurveyThemeEditView({
  prev,
  next,
  num,
  total,
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
          <Text
            className={styles["message-p"]}
            c={themeStyles?.backgroundColor}
          >
            *Choose an option or answer to proceed!
          </Text>
        </Portal>
      )}

      <Stack className={styles["next-prev-btns-and-progress-container"]}>
        <Group justify="flex-end">
          <ActionIcon
            className={styles["prev-btn"]}
            title=""
            variant="outlined"
            onClick={() => {}}
            style={themeStylesWoBr}
          >
            <IconChevronLeft size={isMobile ? 20 : 24} />
          </ActionIcon>
          <Button
            className={styles["submit-next-btn"]}
            onClick={() => {}}
            rightSection={<IconChevronRight size={isMobile ? 20 : 24} />}
            style={themeStylesWoBr}
            loading={isSavingResponses}
            loaderProps={{
              color: themeStylesWoBr?.color || "white",
            }}
            type="button"
          >
            Next
          </Button>
        </Group>

        <Progress
          value={40}
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

export default NextBtnForSurveyThemeEditView;
