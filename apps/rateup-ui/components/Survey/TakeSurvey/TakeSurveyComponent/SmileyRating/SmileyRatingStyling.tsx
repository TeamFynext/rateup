import { rem } from "@mantine/core";
import {
  IconMoodCry,
  IconMoodSad,
  IconMoodSmile,
  IconMoodSmileBeam,
  IconMoodCrazyHappy,
} from "@tabler/icons-react";

export const getIconStyle = (color?: string, iconType?: string) => {
  let colorString = undefined;
  if (color) {
    switch (iconType) {
      case "empty": {
        colorString = `var(--mantine-color-${color}-3)`;
        break;
      }
      case "full": {
        colorString = `var(--mantine-color-${color}-7)`;
        break;
      }
      default: {
        colorString = `var(--mantine-color-${color}-9)`;
      }
    }
  }
  return {
    width: iconType === "full" ? rem(60) : rem(50),
    height: iconType === "full" ? rem(60) : rem(50),
    color: colorString,
    marginTop: iconType === "full" ? "-8px" : "0px",
    paddingBottom: iconType === "full" ? "0px" : "4px",
  };
};

export const getEmptyIcon = (value: number) => {
  const iconStyle = getIconStyle();

  switch (value) {
    case 1:
      return <IconMoodCry style={getIconStyle("red", "empty")} />;
    case 2:
      return <IconMoodSad style={getIconStyle("orange", "empty")} />;
    case 3:
      return <IconMoodSmile style={getIconStyle("yellow", "empty")} />;
    case 4:
      return <IconMoodSmileBeam style={getIconStyle("lime", "empty")} />;
    case 5:
      return <IconMoodCrazyHappy style={getIconStyle("green", "empty")} />;
    default:
      return null;
  }
};

export const getFullIcon = (value: number) => {
  switch (value) {
    case 1:
      return <IconMoodCry style={getIconStyle("red", "full")} />;
    case 2:
      return <IconMoodSad style={getIconStyle("orange", "full")} />;
    case 3:
      return <IconMoodSmile style={getIconStyle("yellow", "full")} />;
    case 4:
      return <IconMoodSmileBeam style={getIconStyle("lime", "full")} />;
    case 5:
      return <IconMoodCrazyHappy style={getIconStyle("green", "full")} />;
    default:
      return null;
  }
};
