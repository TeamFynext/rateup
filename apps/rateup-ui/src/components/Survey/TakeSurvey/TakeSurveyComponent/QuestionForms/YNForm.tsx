import { animate } from "motion/react";
import { useContext } from "react";

import { Button } from "@/components/ui/button.tsx";
import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { useSurveyContext } from "@/context/SurveyObjContext.tsx";
import { YNResponse } from "@/types/enums.ts";

import { isLightColor } from "./isLightColor.ts";
import { useThemePrimaryColor } from "./useThemePrimaryColor.ts";

export function YNForm() {
  const { response, updateResponse } = useContext(CurrentResponsesContext);

  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();
  const { webSurveyAutoTransitionToNextQues } = useSurveyContext() || {};

  const themePrimaryColor = useThemePrimaryColor();
  const foregroundColor = isLightColor(themePrimaryColor) ? "#000000" : "#FFFFFF";

  const handleYesOrNOClick = async (e, value: YNResponse) => {
    const clickedBtn = e.target;
    updateResponse(value);
    if (!isLastQuestion && webSurveyAutoTransitionToNextQues) {
      if (clickedBtn) {
        await animate(clickedBtn, { opacity: [0, 1, 0, 1] }, { duration: 0.75 });
        nextFn?.(value);
      }
    }
  };

  const getButtonStyle = (isSelected: boolean) =>
    isSelected
      ? { backgroundColor: themePrimaryColor, color: foregroundColor }
      : { color: themePrimaryColor, borderColor: themePrimaryColor };

  return (
    <div className="flex gap-4">
      <div className="w-[100px]">
        <Button
          size="lg"
          variant={response === YNResponse.No ? "default" : "outline"}
          style={getButtonStyle(response === YNResponse.No)}
          className="w-full rounded-full [&_*]:pointer-events-none"
          onClick={(e) => handleYesOrNOClick(e, YNResponse.No)}
        >
          No
        </Button>
      </div>
      <div className="w-[100px]">
        <Button
          size="lg"
          variant={response === YNResponse.Yes ? "default" : "outline"}
          style={getButtonStyle(response === YNResponse.Yes)}
          className="w-full rounded-full [&_*]:pointer-events-none"
          onClick={(e) => handleYesOrNOClick(e, YNResponse.Yes)}
        >
          Yes
        </Button>
      </div>
    </div>
  );
}
