import classNames from "classnames/bind";
import { useAnimate } from "motion/react";
import { useContext, useState } from "react";
import type { MouseEvent } from "react";

import { Button } from "@/components/ui/button.tsx";
import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { useSurveyContext } from "@/context/SurveyObjContext.tsx";

import { useIsSurveyThemePreview } from "../../../SurveyTheme/components/previewcomponents/surveytheme/isSurveyThemePreviewContext.tsx";
import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";
import { isLightColor } from "./isLightColor.ts";
import { useThemePrimaryColor } from "./useThemePrimaryColor.ts";

import styles from "./OpinionScaleForm.module.css";

const cx = classNames.bind(styles);
interface iProps {
  initValue?;
}
export function OpinionScaleForm({ initValue }: iProps) {
  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const [isHovered, setIsHovered] = useState<number | null>(null);

  const themePrimaryColor = useThemePrimaryColor();
  const foregroundColor = isLightColor(themePrimaryColor) ? "#000000" : "#FFFFFF";

  const [, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const { webSurveyAutoTransitionToNextQues } = useSurveyContext() || {};

  const handleHover = (index: number) => {
    setIsHovered(index);
  };

  const handleLeave = () => {
    setIsHovered(null);
  };

  const handleBtnClick = async (e: MouseEvent<HTMLElement>) => {
    // The click lands on the button element itself; `target` is typed only as EventTarget.
    const clickedBtn = e.target as HTMLElement;
    const clickedBtnValue = parseInt(clickedBtn.dataset.btnValue ?? "");
    if (clickedBtnValue) {
      if (!initValue) updateResponse(clickedBtnValue);
      if (!isLastQuestion && webSurveyAutoTransitionToNextQues) {
        if (clickedBtn) {
          await animate(clickedBtn, { opacity: [0, 1, 0, 1] }, { duration: 0.75 });
        }
        nextFn?.(clickedBtnValue);
      }
    }
  };

  const isSurveyThemePreview = useIsSurveyThemePreview();
  const selectedPreview = useSelectedPreview();
  const surveyThemeMobilePreview = isSurveyThemePreview && selectedPreview === "mobile";

  const renderButtons = () => {
    const oneToFive = [];
    const fiveToTen = [];
    for (let i = 1; i <= 10; i++) {
      const isSelected = response === i || initValue == i;
      const button = (
        <Button
          className={cx("opinion-scale-interval-btn", {
            "survey-theme-mobile-preview": surveyThemeMobilePreview,
          })}
          key={i}
          onMouseEnter={() => handleHover(i)}
          onMouseLeave={handleLeave}
          variant={isSelected ? "default" : "outline"}
          style={{
            backgroundColor: isSelected
              ? themePrimaryColor
              : isHovered === i
                ? `${themePrimaryColor}26`
                : "transparent",
            borderColor: themePrimaryColor,
            color: isSelected ? foregroundColor : themePrimaryColor,
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
      <div className={`${cx("opinion-scale-first-five-btns-container")} flex`}>{oneToFive}</div>
    );
    const secondFiveBtnsContainer = (
      <div className={`${cx("opinion-scale-last-five-btns-container")} flex`}>{fiveToTen}</div>
    );
    return (
      <>
        {firstFiveBtnsContiner}
        {secondFiveBtnsContainer}
      </>
    );
  };

  return (
    <div onClick={handleBtnClick} className={`${cx("opinion-scale")} flex flex-wrap items-center`}>
      {renderButtons()}
    </div>
  );
}
