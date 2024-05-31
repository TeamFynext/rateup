import { Rating, useMantineTheme } from "@mantine/core";
import {
  IconMoodCry,
  IconMoodSad,
  IconMoodSmile,
  IconMoodCrazyHappy,
  IconMoodSmileBeam,
} from "@tabler/icons-react";
import { SmileyResponse } from "../../../../../types/enums";

import { getEmptyIcon, getFullIcon, getIconStyle } from "./SmileyRatingStyling";
import { useAnimate } from "framer-motion";
import { useHandleNextPrevFuncs } from "../../../../../context/NextPrevFuncsContext";
import { useSurveyContext } from "../SurveyContext";

const SmileyRating = ({ updateResponse, response }) => {
  const [scope, animate] = useAnimate();
  const { nextFn, isLastQuestion } = useHandleNextPrevFuncs();

  const { webSurveyAutoTransitionToNextQues } = useSurveyContext() || {};

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
  return (
    <Rating
      ref={scope}
      color="cyan"
      value={getNumericValue(response)}
      emptySymbol={(number) => getEmptyIcon(number, theme.primaryColor)}
      fullSymbol={(number) => getFullIcon(number, theme.primaryColor)}
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
      return <IconMoodSmileBeam style={getIconStyle(color)} />;
    }
    case SmileyResponse.Neutral: {
      return <IconMoodSmile style={getIconStyle(color)} />;
    }
    case SmileyResponse.Sad: {
      return <IconMoodSad style={getIconStyle(color)} />;
    }
    case SmileyResponse.VerySad: {
      return <IconMoodCry style={getIconStyle(color)} />;
    }
    default:
      return null;
  }
}
