import { useContext, useState } from "react";
import { CurrentResponsesContext } from "../../../../../context/ResponseContext";
import {
  Button,
  Flex,
  Group,
  isLightColor,
  useMantineTheme,
} from "@mantine/core";
import { useAnimate } from "framer-motion";
import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";
import { useSurveyThemeData } from "../../../../../context/SurveyThemeContext";
import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext";
import styles from "./OpinionScaleForm.module.css";
import classNames from "classnames/bind";
import { useIsSurveyThemePreviewContext } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreveiwContext";

const cx = classNames.bind(styles);
interface iProps {
  initValue?: any;
}
export function OpinionScaleForm({ initValue }: iProps) {
  const theme = useMantineTheme();
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [isHovered, setIsHovered] = useState(null);

  const mantineTheme = useMantineTheme();
  const themePrimaryColor = mantineTheme.colors.primaryColor
    ? mantineTheme.colors.primaryColor[5]
    : "#1C518E";
  const foregroundColor = isLightColor(themePrimaryColor)
    ? "#000000"
    : "#FFFFFF";

  const [scope, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const handleHover = (index) => {
    setIsHovered(index);
  };

  const handleLeave = () => {
    setIsHovered(null);
  };

  const handleBtnClick = async (e) => {
    const clickedBtn = e.target;
    const clickedBtnValue = parseInt(clickedBtn.dataset.btnValue);
    if (clickedBtnValue) {
      !initValue && updateResponse(clickedBtnValue);
      if (!isLastQuestion) {
        if (clickedBtn) {
          await animate(
            clickedBtn,
            { opacity: [0, 1, 0, 1] },
            { duration: 0.75 },
          );
        }
        nextFn?.(clickedBtnValue);
      }
    }
  };

  const isSurveyThemePreview = useIsSurveyThemePreviewContext();
  const selectedPreview = useSelectedPreview();
  const surveyThemeMobilePreview =
    isSurveyThemePreview && selectedPreview === "mobile";

  const renderButtons = () => {
    const oneToFive = [];
    const fiveToTen = [];
    for (let i = 1; i <= 10; i++) {
      const button = (
        <Button
          className={cx("opinion-scale-interval-btn", {
            "survey-theme-mobile-preview": surveyThemeMobilePreview,
          })}
          key={i}
          onMouseEnter={() => handleHover(i)}
          onMouseLeave={handleLeave}
          radius="xs"
          variant={response === i || initValue == i ? "filled" : "outline"}
          style={{
            color:
              response === i || initValue == i
                ? foregroundColor
                : themePrimaryColor,
          }}
          styles={{
            root: {
              backgroundColor:
                response === i || initValue == i
                  ? `var(--mantine-color-${theme.primaryColor}-filled)`
                  : isHovered !== i
                    ? ""
                    : `var(--mantine-color-${theme.primaryColor}-outline-hover)`,
              borderColor:
                (response !== i || initValue != i) &&
                `var(--mantine-color-${theme.primaryColor}-outline)`,
              color:
                response === i || initValue == i
                  ? "var(--mantine-color-white)"
                  : `var(--mantine-color-${theme.primaryColor}-outline)`,
            },
          }}
          data-btn-value={i}
        >
          {i}
        </Button>
      );
      if (i <= 5) {
        oneToFive.push(button);
      } else {
        fiveToTen.push(button);
      }
    }
    const firstFiveBtnsContiner = (
      <Flex className={cx("opinion-scale-first-five-btns-container")}>
        {oneToFive}
      </Flex>
    );
    const secondFiveBtnsContainer = (
      <Flex className={cx("opinion-scale-last-five-btns-container")}>
        {fiveToTen}
      </Flex>
    );
    return (
      <>
        {firstFiveBtnsContiner}
        {secondFiveBtnsContainer}
      </>
    );
  };

  return (
    <Group onClick={handleBtnClick} className={cx("opinion-scale")}>
      {renderButtons()}
    </Group>
  );
}
