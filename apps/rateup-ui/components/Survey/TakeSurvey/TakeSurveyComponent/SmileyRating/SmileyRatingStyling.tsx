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

export const getEmptyIcon = (value: number, color: string) => {
  const iconStyle = getIconStyle();

  switch (value) {
    case 1:
      return <IconMoodCry style={getIconStyle(color, "empty")} />;
    case 2:
      return <IconMoodSad style={getIconStyle(color, "empty")} />;
    case 3:
      return <IconMoodSmile style={getIconStyle(color, "empty")} />;
    case 4:
      return <IconMoodSmileBeam style={getIconStyle(color, "empty")} />;
    case 5:
      return <IconMoodCrazyHappy style={getIconStyle(color, "empty")} />;
    default:
      return null;
  }
};

export const getFullIcon = (value: number, color: string) => {
  switch (value) {
    case 1:
      return <IconMoodCry style={getIconStyle(color, "full")} />;
    case 2:
      return <IconMoodSad style={getIconStyle(color, "full")} />;
    case 3:
      return <IconMoodSmile style={getIconStyle(color, "full")} />;
    case 4:
      return <IconMoodSmileBeam style={getIconStyle(color, "full")} />;
    case 5:
      return <IconMoodCrazyHappy style={getIconStyle(color, "full")} />;
    default:
      return null;
  }
};
