import {
  IconMoodAngry,
  IconMoodCrazyHappy,
  IconMoodEmpty,
  IconMoodHappy,
  IconMoodSad,
} from "@tabler/icons-react";
import { useAnimate } from "motion/react";
import { useEffect, useState } from "react";

import {
  generateGradient,
  SmileyColorType,
  SmileyVariantStyle,
} from "@/components/Survey/Question/QuestionExtraProps/SmileyExtraProps.tsx";
import { useHandleNextPrevFuncs } from "@/context/NextPrevFuncsContext.tsx";
import { useSurveyContext } from "@/context/SurveyObjContext.tsx";
import { SmileyResponse } from "@/types/enums.ts";

import {
  getEmptyIcon,
  getFullIcon,
  getIconStyle,
  getSmileyEmojies,
} from "./SmileyRatingStyling.tsx";
import type { SmileyGradientStyle, SmileyIconStyle } from "./SmileyRatingStyling.tsx";

const SMILEY_COUNT = 5;

const SmileyRating = ({
  updateResponse,
  response,
  features,
}: {
  updateResponse: (value: unknown) => void;
  response?: unknown;
  features?: { iconStyle?: SmileyIconStyle & SmileyGradientStyle; [key: string]: unknown };
}) => {
  const [scope, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  // The survey context is null on the standalone preview.
  const { webSurveyAutoTransitionToNextQues } = (useSurveyContext() ?? {}) as Partial<Survey>;

  const [iconColor, setIconColor] = useState<Record<number, string> | null>(null);
  const [customColor, setIsCustomColor] = useState(false);
  const [hoveredValue, setHoveredValue] = useState(-1);

  const updateStringResponse = (value: number) => {
    let stringValue;
    switch (value) {
      case 1:
        stringValue = SmileyResponse.VerySad;
        break;
      case 2:
        stringValue = SmileyResponse.Sad;
        break;
      case 3:
        stringValue = SmileyResponse.Neutral;
        break;
      case 4:
        stringValue = SmileyResponse.Happy;
        break;
      case 5:
        stringValue = SmileyResponse.VeryHappy;
        break;
    }
    updateResponse(stringValue);
    return stringValue;
  };

  const primaryColor = "dark";

  const iconStyle: SmileyIconStyle & SmileyGradientStyle = features?.iconStyle || {
    variant: SmileyVariantStyle.Default,
    colorType: SmileyColorType.Default,
  };

  const { variant, colorType, color, gradientStartColor, gradientEndColor } = iconStyle;

  // Always render the resting (unselected) icon as a plain outline, even when the
  // survey is configured for "Filled" — the solid/filled look is reserved for the
  // selected state so the picker doesn't look like a row of identical solid pills.
  const emptyIconStyle =
    variant === SmileyVariantStyle.Filled
      ? { ...iconStyle, variant: SmileyVariantStyle.FilledOnHover }
      : iconStyle;

  useEffect(() => {
    if (features?.iconStyle) {
      if (!variant) return;
      if (![SmileyVariantStyle.Custom].includes(variant) && colorType !== SmileyColorType.Default) {
        setIsCustomColor(true);
        const newColor: Record<number, string> = {};
        const colorArray = generateGradient(gradientStartColor, gradientEndColor, 5, primaryColor);
        Object.values(SmileyResponse)
          .reverse()
          .map((_s, i) => {
            if (colorType === SmileyColorType.Gradient) newColor[i + 1] = colorArray[i] ?? "";
            else newColor[i + 1] = color?.[i + 1] ?? primaryColor;
          });
        setIconColor(newColor);
      } else {
        setIsCustomColor(false);
        setIconColor(null);
      }
    }
  }, [features]);

  const currentValue = getNumericValue(response as string);

  const handleSelect = async (value: number) => {
    updateStringResponse(value);
    const selectedValueEle = scope.current?.querySelectorAll(`[data-smiley-index="${value}"]`);
    if (!isLastQuestion && webSurveyAutoTransitionToNextQues) {
      if (selectedValueEle) {
        await animate(selectedValueEle, { opacity: [0, 1, 0, 1] }, { duration: 0.7 });
      }
      nextFn?.(updateStringResponse(value));
    }
  };

  return (
    <div ref={scope} className="flex items-center gap-3">
      {Array.from({ length: SMILEY_COUNT }, (_, index) => {
        const number = index + 1;
        const isFull = hoveredValue !== -1 ? number === hoveredValue : number === currentValue;
        const symbolColor = isFull ? "red" : customColor ? iconColor?.[number] : primaryColor;
        return (
          <button
            key={number}
            type="button"
            data-smiley-index={number}
            aria-pressed={number === currentValue}
            onClick={() => handleSelect(number)}
            onMouseEnter={() => setHoveredValue(number)}
            onMouseLeave={() => setHoveredValue(-1)}
            className="flex items-center justify-center p-1"
          >
            {isFull
              ? getFullIcon(number, symbolColor, iconStyle)
              : getEmptyIcon(number, symbolColor, emptyIconStyle, response)}
          </button>
        );
      })}
    </div>
  );
};

export default SmileyRating;

export const getNumericValue = (stringValue: string) => {
  switch (stringValue) {
    case SmileyResponse.VerySad:
      return 1;
    case SmileyResponse.Sad:
      return 2;
    case SmileyResponse.Neutral:
      return 3;
    case SmileyResponse.Happy:
      return 4;
    case SmileyResponse.VeryHappy:
      return 5;
    default:
      return -1;
  }
};

export function mapSmileyIcon(value: unknown, color?: string) {
  switch (value) {
    case SmileyResponse.VeryHappy: {
      return <IconMoodCrazyHappy style={getIconStyle(color)} />;
    }
    case SmileyResponse.Happy: {
      return <IconMoodHappy style={getIconStyle(color)} />;
    }
    case SmileyResponse.Neutral: {
      return <IconMoodEmpty style={getIconStyle(color)} />;
    }
    case SmileyResponse.Sad: {
      return <IconMoodSad style={getIconStyle(color)} />;
    }
    case SmileyResponse.VerySad: {
      return <IconMoodAngry style={getIconStyle(color)} />;
    }
    default:
      return null;
  }
}

export function getSmileyIcon(value: SmileyResponse, color = "black") {
  switch (value) {
    case SmileyResponse.VerySad:
      return <IconMoodAngry color={color} />;
    case SmileyResponse.Sad:
      return <IconMoodSad color={color} />;
    case SmileyResponse.Neutral:
      return <IconMoodEmpty color={color} />;
    case SmileyResponse.Happy:
      return <IconMoodHappy color={color} />;
    case SmileyResponse.VeryHappy:
      return <IconMoodCrazyHappy color={color} />;
    default:
      return null;
  }
}

export function getCustomSmileyIcon(response: SmileyResponse, question: Question) {
  const iconStyle = question?.features?.iconStyle;
  if (!iconStyle) return null;
  let emoji;
  switch (response) {
    case SmileyResponse.VerySad:
      if (iconStyle?.variant === SmileyVariantStyle.Custom) emoji = iconStyle?.emojies?.[1];
      if (iconStyle?.variant === SmileyVariantStyle.Emojis) emoji = getSmileyEmojies(1);
      break;
    case SmileyResponse.Sad:
      if (iconStyle?.variant === SmileyVariantStyle.Custom) emoji = iconStyle?.emojies?.[2];
      if (iconStyle?.variant === SmileyVariantStyle.Emojis) emoji = getSmileyEmojies(2);
      break;
    case SmileyResponse.Neutral:
      if (iconStyle?.variant === SmileyVariantStyle.Custom) emoji = iconStyle?.emojies?.[3];
      if (iconStyle?.variant === SmileyVariantStyle.Emojis) emoji = getSmileyEmojies(3);
      break;
    case SmileyResponse.Happy:
      if (iconStyle?.variant === SmileyVariantStyle.Custom) emoji = iconStyle?.emojies?.[4];
      if (iconStyle?.variant === SmileyVariantStyle.Emojis) emoji = getSmileyEmojies(4);
      break;
    case SmileyResponse.VeryHappy:
      if (iconStyle?.variant === SmileyVariantStyle.Custom) emoji = iconStyle?.emojies?.[5];
      if (iconStyle?.variant === SmileyVariantStyle.Emojis) emoji = getSmileyEmojies(5);
      break;
    default:
      break;
  }
  return <span className="text-3xl">{emoji}</span>;
}
