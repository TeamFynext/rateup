import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Rating, useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { useMediaQuery } from "@mantine/hooks";
import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";
import { useAnimate } from "framer-motion";
import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext";

export function RatingForm() {
  const selectedPreview = useSelectedPreview();
  const isMobile =
    useMediaQuery("(max-width: 480px)") || selectedPreview === "mobile";

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();

  const [scope, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const onRatingChange = async (value) => {
    updateResponse(value);
    const selectedValueEle = scope.current.querySelectorAll(
      `.${classes.rating} .mantine-Rating-symbolGroup:nth-child(-n+${value})`,
    );
    if (!isLastQuestion) {
      if (selectedValueEle) {
        await animate(
          selectedValueEle,
          { opacity: [0, 1, 0, 1] },
          { duration: 0.75 },
        );
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
