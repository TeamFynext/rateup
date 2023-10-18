import { Rating, rem } from "@mantine/core";
import {
  IconMoodCry,
  IconMoodSad,
  IconMoodSmile,
  IconMoodHappy,
  IconMoodCrazyHappy,
} from "@tabler/icons-react";
import { SmileyResponse } from "../../../types/enums";

const getIconStyle = (color?: string) => ({
  width: rem(50),
  height: rem(50),
  color: color ? `var(--mantine-color-${color}-7)` : undefined,
});

const getEmptyIcon = (value: number) => {
  const iconStyle = getIconStyle();

  switch (value) {
    case 1:
      return <IconMoodCry style={iconStyle} />;
    case 2:
      return <IconMoodSad style={iconStyle} />;
    case 3:
      return <IconMoodSmile style={iconStyle} />;
    case 4:
      return <IconMoodHappy style={iconStyle} />;
    case 5:
      return <IconMoodCrazyHappy style={iconStyle} />;
    default:
      return null;
  }
};

const getFullIcon = (value: number) => {
  switch (value) {
    case 1:
      return <IconMoodCry style={getIconStyle("red")} />;
    case 2:
      return <IconMoodSad style={getIconStyle("orange")} />;
    case 3:
      return <IconMoodSmile style={getIconStyle("yellow")} />;
    case 4:
      return <IconMoodHappy style={getIconStyle("lime")} />;
    case 5:
      return <IconMoodCrazyHappy style={getIconStyle("green")} />;
    default:
      return null;
  }
};

const SmileyRating = ({ updateResponse }) => {
  const updateStringResponse = (value) => {
    let stringValue;
    switch (value) {
      case 1:
        stringValue = "VeryHappy";
        break;
      case 2:
        stringValue = "Sad";
        break;
      case 3:
        stringValue = "Neutral";
        break;
      case 4:
        stringValue = "Happy";
        break;
      case 5:
        stringValue = "VeryHappy";
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
  const iconStyle = getIconStyle();

  switch (value) {
    case SmileyResponse.VeryHappy:
      return <IconMoodCrazyHappy style={iconStyle} />;
    case SmileyResponse.Happy:
      return <IconMoodSad style={iconStyle} />;
    case SmileyResponse.Neutral:
      return <IconMoodSmile style={iconStyle} />;
    case SmileyResponse.Sad:
      return <IconMoodHappy style={iconStyle} />;
    case SmileyResponse.VerySad:
      return <IconMoodCry style={iconStyle} />;
    default:
      return null;
  }
}
