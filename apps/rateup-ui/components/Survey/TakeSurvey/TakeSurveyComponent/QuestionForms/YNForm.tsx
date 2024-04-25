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

  const handleYesOrNOClick = async (e) => {
    const clikcedBtn = e.target;
    const clickedBtnName = clikcedBtn.dataset.name;
    if (clickedBtnName) {
      if (clickedBtnName === "yes") {
        updateResponse(YNResponse.Yes);
      } else if (clickedBtnName === "no") {
        updateResponse(YNResponse.No);
      }
      await animate(
        clikcedBtn,
        { opacity: [0, 1, 0, 1, 0, 1] },
        { duration: 0.65 },
      );
      if (!isLastQuestion) nextFn?.();
    }
  };

  return (
    <Group p={"xs"} onClick={handleYesOrNOClick}>
      <Box w={100}>
        <RateupButtonBlue
          size="md"
          variant={response === YNResponse.No ? "filled" : "outline"}
          radius="xl"
          title="No"
          fullWidth
          className={styles["yes-no-btn"]}
          data-name={"no"}
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
          data-name={"yes"}
        />
      </Box>
    </Group>
  );
}
