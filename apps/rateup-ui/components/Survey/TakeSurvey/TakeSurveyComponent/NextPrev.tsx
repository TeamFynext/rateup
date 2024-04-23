import { useContext, useEffect, useState } from "react";
import { SelectedQContext } from "../../../../context/SelectedQ";
import { CurrentResponsesContext } from "../../../../context/ResponseContext";
import SelectedLanguageContext from "../../../../context/SelectedLanguage";
import { useMediaQuery } from "@mantine/hooks";
import { QuestionType as Q } from "../../../../types/enums";
import { isValidPhoneNumber } from "react-phone-number-input";
import { emailPattern } from "../../../../utils/constants";
import {
  Button,
  Center,
  Group,
  RingProgress,
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
        <RingProgress
          className={styles["ring-progress"]}
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
            loading={isSavingResponses}
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

export default NextPrev;
