import { Rating, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useAnimate } from "motion/react";
import { useContext } from "react";

import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { useSurveyContext } from "@/context/SurveyObjContext.tsx";

import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";

import classes from "../TakeSurvey.module.css";

export function RatingForm() {
  const selectedPreview = useSelectedPreview();
  const isMobile = useMediaQuery("(max-width: 480px)") || selectedPreview === "mobile";

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();

  const [scope, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const { webSurveyAutoTransitionToNextQues } = useSurveyContext() || {};

  const onRatingChange = async (value) => {
    updateResponse(value);
    const selectedValueEle = scope.current.querySelectorAll(
      `.${classes.rating} .mantine-Rating-symbolGroup:nth-child(-n+${value})`,
    );
    if (!isLastQuestion && webSurveyAutoTransitionToNextQues) {
      if (selectedValueEle) {
        await animate(selectedValueEle, { opacity: [0, 1, 0, 1] }, { duration: 0.75 });
      }
      nextFn?.(value);
    }
  };

  return (
    <Rating
      ref={scope}
      value={response}
      onChange={onRatingChange}
      color={theme.primaryColor}
      size="xl"
      className={classes.rating}
      styles={{
        label: {
          paddingLeft: isMobile ? "3px" : "8px",
          paddingRight: isMobile ? "3px" : "8px",
        },
      }}
    />
  );
}
