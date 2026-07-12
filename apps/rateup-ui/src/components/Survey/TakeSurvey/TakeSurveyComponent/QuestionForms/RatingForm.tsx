import { Star } from "lucide-react";
import { useAnimate } from "motion/react";
import { useContext, useState } from "react";

import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { CurrentResponsesContext } from "@/context/ResponseContext.ts";
import { useSurveyContext } from "@/context/SurveyObjContext.tsx";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import { cn } from "@/lib/utils";

import { useSelectedPreview } from "../../../SurveyTheme/SurveyThemeContext.tsx";
import { useThemePrimaryColor } from "./useThemePrimaryColor.ts";

export function RatingForm() {
  const selectedPreview = useSelectedPreview();
  const isMobile = useIsMobile() || selectedPreview === "mobile";

  const { response, updateResponse } = useContext(CurrentResponsesContext);
  const themePrimaryColor = useThemePrimaryColor();
  const [hoveredValue, setHoveredValue] = useState(-1);

  const [scope, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const { webSurveyAutoTransitionToNextQues } = useSurveyContext() || {};

  const onRatingChange = async (value: number) => {
    updateResponse(value);
    const selectedValueEle = scope.current?.querySelectorAll(`button:nth-child(-n+${value})`);
    if (!isLastQuestion && webSurveyAutoTransitionToNextQues) {
      if (selectedValueEle) {
        await animate(selectedValueEle, { opacity: [0, 1, 0, 1] }, { duration: 0.75 });
      }
      nextFn?.(value);
    }
  };

  return (
    <div ref={scope} className={cn("flex items-center", isMobile ? "gap-1.5" : "gap-4")}>
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= (hoveredValue !== -1 ? hoveredValue : response || 0);
        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onRatingChange(starValue)}
            onMouseEnter={() => setHoveredValue(starValue)}
            onMouseLeave={() => setHoveredValue(-1)}
            className="flex items-center justify-center"
          >
            <Star
              className={cn(
                "size-[50px] transition-colors",
                filled ? "fill-current" : "text-muted-foreground",
              )}
              style={filled ? { color: themePrimaryColor } : undefined}
            />
          </button>
        );
      })}
    </div>
  );
}
