import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Rating, useMantineTheme } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { useMediaQuery } from "@mantine/hooks";

export function RatingForm() {
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const theme = useMantineTheme();

  return (
    <Rating
      value={response}
      onChange={updateResponse}
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
