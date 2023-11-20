import { Rating, rem } from "@mantine/core";
import {
  IconMoodCry,
  IconMoodSad,
  IconMoodSmile,
  IconMoodCrazyHappy,
  IconMoodSmileBeam,
} from "@tabler/icons-react";
import { SmileyResponse } from "../../../types/enums";

import {
  getEmptyIcon,
  getFullIcon,
  getIconStyle,
} from "../Question/Previews/SmileyRatingPreview";

const SmileyRating = ({ updateResponse }) => {
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
  };

  return (
    <Rating
      emptySymbol={getEmptyIcon}
      fullSymbol={getFullIcon}
      highlightSelectedOnly
      onChange={(value) => updateStringResponse(value)}
    />
  );
};

export default SmileyRating;

export function mapSmileyIcon(value) {
  switch (value) {
    case SmileyResponse.VeryHappy: {
      return <IconMoodCrazyHappy style={getIconStyle("green")} />;
    }
    case SmileyResponse.Happy: {
      return <IconMoodSmileBeam style={getIconStyle("lime")} />;
    }
    case SmileyResponse.Neutral: {
      return <IconMoodSmile style={getIconStyle("yellow")} />;
    }
    case SmileyResponse.Sad: {
      return <IconMoodSad style={getIconStyle("orange")} />;
    }
    case SmileyResponse.VerySad: {
      return <IconMoodCry style={getIconStyle("red")} />;
    }
    default:
      return null;
  }
}
