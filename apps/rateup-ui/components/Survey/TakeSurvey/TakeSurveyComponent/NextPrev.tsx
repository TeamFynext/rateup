import { useContext, useEffect, useState } from "react";
import { SelectedQContext } from "../../../../context/SelectedQ";
import { CurrentResponsesContext } from "../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { useMediaQuery } from "@mantine/hooks";
import { QuestionType as Q } from "../../../../types/enums";
import { isValidPhoneNumber } from "react-phone-number-input";
import { emailPattern } from "../../../../utils/constants";
import {
  ActionIcon,
  Button,
  Center,
  Group,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { validateQuestion } from "../../../../utils/validation";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import styles from "./TakeSurvey.module.css";
import { validateResponse } from "./util";

function NextPrev({
  prev,
  next,
  num,
  total,
  themeStyles,
  survey,
  isSavingResponses,
}) {
  const { selectedQ } = useContext(SelectedQContext);
  const { response } = useContext(CurrentResponsesContext);
  const { selectedLanguage } = useContext(SelectedLanguageContext);
  const [isErrorInput, setIsErrorInput] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const isMobile = useMediaQuery("(max-width: 480px)");

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
    <Stack gap={0} w={"100%"} justify="flex-end">
      <Text
        mb={"0.625rem"}
        size={isMobile && "sm"}
        c={themeStyles?.backgroundColor}
        style={{ opacity: selectedQ?.required && !response ? 1 : 0 }}
      >
        *Choose an option or answer to proceed!
      </Text>
      {errorMsg && isErrorInput && (
        <Text c="red" mb={"0.625rem"}>
          Note: * {errorMsg}
        </Text>
      )}
      <Stack className={styles["next-prev-btns-and-progress-container"]}>
        <Group justify="flex-end">
          <ActionIcon
            className={styles["prev-btn"]}
            title=""
            disabled={isFirstQuestion}
            variant="outlined"
            onClick={prev}
            style={
              isFirstQuestion
                ? { borderRadius: themeStyles?.borderRadius }
                : {
                    ...themeStyles,
                    backgroundColor: `rgba(255, 255, 255, 0.75)`,
                    outline: `2px solid ${themeStyles?.backgroundColor}`,
                    color: themeStyles?.backgroundColor,
                  }
            }
          >
            <IconChevronLeft size={isMobile ? 20 : 24} />
          </ActionIcon>
          {isLastQuestion ? (
            <Button
              className={styles["submit-btn"]}
              radius={"xl"}
              disabled={
                ((selectedQ?.required || selectedQ?.validationRules) &&
                  !response) ||
                isErrorInput
              }
              onClick={handleNextClick}
              color="var(--tertiary-color)"
              rightSection={<IconChevronRight size={isMobile ? 20 : 24} />}
              style={
                ((selectedQ?.required || selectedQ?.validationRules) &&
                  !response) ||
                isErrorInput
                  ? { borderRadius: themeStyles.borderRadius }
                  : themeStyles
              }
              loading={isSavingResponses}
            >
              Submit
            </Button>
          ) : (
            <ActionIcon
              className={styles["prev-btn"]}
              disabled={
                ((selectedQ?.required || selectedQ?.validationRules) &&
                  !response) ||
                isErrorInput
              }
              onClick={handleNextClick}
              color="var(--tertiary-color)"
              style={
                ((selectedQ?.required || selectedQ?.validationRules) &&
                  !response) ||
                isErrorInput
                  ? { borderRadius: themeStyles.borderRadius }
                  : themeStyles
              }
            >
              <IconChevronRight size={isMobile ? 20 : 24} />
            </ActionIcon>
          )}
        </Group>

        <Progress
          value={parseInt(getCompletionRate(num, total))}
          transitionDuration={300}
          color={themeStyles?.backgroundColor}
        />
      </Stack>
    </Stack>
  );
}

export default NextPrev;
