import { useEffect, useState } from "react";

import { Rating, Text, useMantineTheme } from "@mantine/core";
import {
  IconMoodAngry,
  IconMoodCrazyHappy,
  IconMoodCry,
  IconMoodEmpty,
  IconMoodHappy,
  IconMoodSad,
  IconMoodSmile,
  IconMoodSmileBeam,
} from "@tabler/icons-react";
import { useAnimate } from "framer-motion";

import {
  generateGradient,
  SmileyColorType,
  SmileyVariantStyle,
} from "@/components/Survey/Question/QuestionExtraProps/SmileyExtraProps";

import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";
import { useSurveyContext } from "../../../../../context/SurveyObjContext";
import { SmileyResponse } from "../../../../../types/enums";
import { getEmptyIcon, getFullIcon, getIconStyle } from "./SmileyRatingStyling";

const SmileyRating = ({ updateResponse, response, features }) => {
  const [scope, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const { webSurveyAutoTransitionToNextQues } = useSurveyContext() || {};

  const [iconColor, setIconColor] = useState(null);
  const [customColor, setIsCustomColor] = useState(false);

  const updateStringResponse = (value) => {
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

  const getNumericValue = (stringValue) => {
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
  const theme = useMantineTheme();

  const iconStyle = features?.iconStyle || {
    variant: SmileyVariantStyle.Default,
    colorType: SmileyColorType.Default,
  };

  const {
    variant,
    colorType,
    color,
    gradientStartColor,
    gradientEndColor,
    emojies,
  } = iconStyle;
  useEffect(() => {
    if (features?.iconStyle) {
      if (!variant) return;
      if (
        ![SmileyVariantStyle.Custom].includes(variant) &&
        colorType !== SmileyColorType.Default
      ) {
        setIsCustomColor(true);
        const newColor = {};
        const colorArray = generateGradient(
          gradientStartColor,
          gradientEndColor,
          5,
          theme.primaryColor,
        );
        Object.values(SmileyResponse)
          .reverse()
          .map((s, i) => {
            if (colorType === SmileyColorType.Gradient)
              newColor[i + 1] = colorArray[i];
            else newColor[i + 1] = color?.[i + 1] ?? theme.primaryColor;
          });
        setIconColor(newColor);
      } else {
        setIsCustomColor(false);
        setIconColor(null);
      }
    }
  }, [features]);

  return (
    <Rating
      ref={scope}
      color="cyan"
      value={getNumericValue(response)}
      emptySymbol={(number) =>
        getEmptyIcon(
          number,
          customColor ? iconColor?.[number] : theme.primaryColor,
          iconStyle,
        )
      }
      fullSymbol={(number) =>
        getFullIcon(
          number,
          customColor ? iconColor?.[number] : theme.primaryColor,
          iconStyle,
        )
      }
      highlightSelectedOnly
      onChange={async (value) => {
        updateStringResponse(value);
        const selectedValueEle = scope.current.querySelectorAll(
          `.mantine-Rating-symbolGroup:nth-child(${value})`,
        );
        if (!isLastQuestion && webSurveyAutoTransitionToNextQues) {
          if (selectedValueEle) {
            await animate(
              selectedValueEle,
              { opacity: [0, 1, 0, 1] },
              { duration: 0.7 },
            );
          }
          nextFn?.(updateStringResponse(value));
        }
      }}
    />
  );
};

export default SmileyRating;

export function mapSmileyIcon(value, color) {
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
      null;
  }
}

export function getCustomSmileyIcon(response: SmileyResponse, question) {
  const iconStyle = question?.features?.iconStyle;
  if (!iconStyle) return null;
  switch (response) {
    case SmileyResponse.VerySad:
      return <Text size="2rem">{iconStyle?.emojies?.[1]}</Text>;
    case SmileyResponse.Sad:
      return <Text size="2rem">{iconStyle?.emojies?.[2]}</Text>;
    case SmileyResponse.Neutral:
      return <Text size="2rem">{iconStyle?.emojies?.[3]}</Text>;
    case SmileyResponse.Happy:
      return <Text size="2rem">{iconStyle?.emojies?.[4]}</Text>;
    case SmileyResponse.VeryHappy:
      return <Text size="2rem">{iconStyle?.emojies?.[5]}</Text>;
    default:
      null;
  }
}
