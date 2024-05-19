import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Box, Group, isLightColor, useMantineTheme } from "@mantine/core";
import { RateupButtonBlue } from "../../../../Button/RateupButtons";
import { YNResponse } from "../../../../../types/enums";
import styles from "./YNForm.module.css";
import { animate } from "framer-motion";
import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";

export function YNForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const mantineTheme = useMantineTheme();
  const themePrimaryColor = mantineTheme.colors.primaryColor
    ? mantineTheme.colors.primaryColor[5]
    : "#1C518E";

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

  const foregroundColor = isLightColor(themePrimaryColor)
    ? "#000000"
    : "#FFFFFF";

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
          sx={{
            color:
              response === YNResponse.No ? foregroundColor : themePrimaryColor,
          }}
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
          sx={{
            color:
              response === YNResponse.Yes ? foregroundColor : themePrimaryColor,
          }}
        />
      </Box>
    </Group>
  );
}
