import { useContext } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import { Box, Group, isLightColor, useMantineTheme } from "@mantine/core";
import { RateupButtonBlue } from "../../../../Button/RateupButtons";
import { IconThumbDownFilled, IconThumbUpFilled } from "@tabler/icons-react";
import { LDResponse } from "../../../../../types/enums";
import { useMediaQuery } from "@mantine/hooks";
import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";
import { useAnimate } from "framer-motion";
import styles from "./LDForm.module.css";

export function LDForm() {
  const isMobile = useMediaQuery("(max-width: 480px)");
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const mantineTheme = useMantineTheme();
  const themePrimaryColor = mantineTheme.colors.primaryColor
    ? mantineTheme.colors.primaryColor[5]
    : "#1C518E";

  const [scope, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const handleLikeOrDislikeClick = async (e) => {
    const clikcedBtn = e.target;
    const clickedBtnName = clikcedBtn.dataset.name;
    const clickedRes =
      clickedBtnName === "like" ? LDResponse.Like : LDResponse.Dislike;
    updateResponse(clickedRes);
    if (!isLastQuestion) {
      if (clikcedBtn) {
        await animate(
          clikcedBtn,
          { opacity: [0, 1, 0, 1] },
          { duration: 0.75 },
        );
      }
      nextFn?.(clickedRes);
    }
  };

  const foregroundColor = isLightColor(themePrimaryColor)
    ? "#000000"
    : "#FFFFFF";

  return (
    <Group onClick={handleLikeOrDislikeClick}>
      <Box w={150}>
        <RateupButtonBlue
          size="md"
          variant={response === LDResponse.Dislike ? "filled" : "outline"}
          sx={{
            color:
              response === LDResponse.Dislike
                ? foregroundColor
                : themePrimaryColor,
          }}
          radius="xl"
          title="Dislike"
          leftIcon={<IconThumbDownFilled />}
          fullWidth
          className={styles["like-dislike-btn"]}
          data-name={"dislike"}
        />
      </Box>
      <Box w={150} ml={!isMobile && "sm"}>
        <RateupButtonBlue
          size="md"
          variant={response === LDResponse.Like ? "filled" : "outline"}
          sx={{
            color:
              response === LDResponse.Like
                ? foregroundColor
                : themePrimaryColor,
          }}
          radius="xl"
          title="Like"
          fullWidth
          leftIcon={<IconThumbUpFilled />}
          className={styles["like-dislike-btn"]}
          data-name={"like"}
        />
      </Box>
    </Group>
  );
}
