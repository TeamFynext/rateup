import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Rating, Stack } from "@mantine/core";
import classes from "../TakeSurvey.module.css";
import { useMediaQuery } from "@mantine/hooks";

export function RatingForm() {
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  return (
    <Stack align="center">
      <Rating
        value={response}
        onChange={updateResponse}
        color="var(--tertiary-color)"
        size="xl"
        className={classes.rating}
        styles={{
          label: {
            paddingLeft: isMobile ? "3px" : "8px",
            paddingRight: isMobile ? "3px" : "8px",
          },
        }}
      />
    </Stack>
  );
}
