import { IconThumbDownFilled, IconThumbUpFilled } from "@tabler/icons-react";
import { useAnimate } from "motion/react";
import { useContext } from "react";

import { Button } from "@/components/ui/button.tsx";
import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { useSurveyContext } from "@/context/SurveyObjContext.tsx";
import { useMediaQuery } from "@/hooks/use-media-query.ts";
import { LDResponse } from "@/types/enums.ts";

import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";
import { isLightColor } from "./isLightColor.ts";
import { useThemePrimaryColor } from "./useThemePrimaryColor.ts";

export function LDForm() {
  const selectedPreview = useSelectedPreview();
  const isMobile = useMediaQuery("(max-width: 480px)") || selectedPreview === "mobile";
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const themePrimaryColor = useThemePrimaryColor();

  const [, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const { webSurveyAutoTransitionToNextQues } = useSurveyContext() || {};

  const handleLikeOrDislikeClick = async (e) => {
    const clikcedBtn = e.target;
    const clickedBtnName = clikcedBtn.dataset.name;
    const clickedRes = clickedBtnName === "like" ? LDResponse.Like : LDResponse.Dislike;
    updateResponse(clickedRes);
    if (!isLastQuestion && webSurveyAutoTransitionToNextQues) {
      if (clikcedBtn) {
        await animate(clikcedBtn, { opacity: [0, 1, 0, 1] }, { duration: 0.75 });
      }
      nextFn?.(clickedRes);
    }
  };

  const foregroundColor = isLightColor(themePrimaryColor) ? "#000000" : "#FFFFFF";

  const getButtonStyle = (isSelected: boolean) =>
    isSelected
      ? { backgroundColor: themePrimaryColor, color: foregroundColor }
      : { color: themePrimaryColor, borderColor: themePrimaryColor };

  return (
    <div className="flex gap-4" onClick={handleLikeOrDislikeClick}>
      <div className="w-[150px]">
        <Button
          size="lg"
          variant={response === LDResponse.Dislike ? "default" : "outline"}
          style={getButtonStyle(response === LDResponse.Dislike)}
          className="w-full rounded-full [&_*]:pointer-events-none"
          data-name={"dislike"}
        >
          <IconThumbDownFilled data-icon="inline-start" />
          Dislike
        </Button>
      </div>
      <div className={`w-[150px] ${!isMobile ? "ml-3" : ""}`}>
        <Button
          size="lg"
          variant={response === LDResponse.Like ? "default" : "outline"}
          style={getButtonStyle(response === LDResponse.Like)}
          className="w-full rounded-full [&_*]:pointer-events-none"
          data-name={"like"}
        >
          <IconThumbUpFilled data-icon="inline-start" />
          Like
        </Button>
      </div>
    </div>
  );
}
