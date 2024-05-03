import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Box, Group } from "@mantine/core";
import { RateupButtonBlue } from "../../../../Button/RateupButtons";
import { YNResponse } from "../../../../../types/enums";
import styles from "./YNForm.module.css";
import { animate } from "framer-motion";
import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";

export function YNForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const handleYesOrNOClick = async (e, value: YNResponse) => {
    const clickedBtn = e.target;
    updateResponse(value);
    if (!isLastQuestion) {
      if (clickedBtn) {
        await animate(
          clickedBtn,
          { opacity: [0, 1, 0, 1] },
          { duration: 0.75 },
        );
        nextFn?.(value);
      }
    }
  };

  return (
    <Group>
      <Box w={100}>
        <RateupButtonBlue
          size="md"
          variant={response === YNResponse.No ? "filled" : "outline"}
          radius="xl"
          title="No"
          fullWidth
          className={styles["yes-no-btn"]}
          onClick={(e) => handleYesOrNOClick(e, YNResponse.No)}
        />
      </Box>
      <Box w={100}>
        <RateupButtonBlue
          size="md"
          variant={response === YNResponse.Yes ? "filled" : "outline"}
          radius="xl"
          title="Yes"
          fullWidth
          className={styles["yes-no-btn"]}
          onClick={(e) => handleYesOrNOClick(e, YNResponse.Yes)}
        />
      </Box>
    </Group>
  );
}
