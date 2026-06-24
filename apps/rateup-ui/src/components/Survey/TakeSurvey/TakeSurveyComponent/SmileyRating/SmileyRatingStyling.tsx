import { lighten, rem, Text } from "@mantine/core";
import {
  IconMoodAngry,
  IconMoodAngryFilled,
  IconMoodCrazyHappy,
  IconMoodCrazyHappyFilled,
  IconMoodEmpty,
  IconMoodEmptyFilled,
  IconMoodHappy,
  IconMoodHappyFilled,
  IconMoodSad,
  IconMoodSadFilled,
} from "@tabler/icons-react";
import { Image } from "@unpic/react";

import {
  SmileyColorType,
  SmileyVariantStyle,
} from "@/components/Survey/Question/QuestionExtraProps/SmileyExtraProps.tsx";

export const getIconStyle = (
  color?: string,
  iconType: string = "neutral",
  iconStyle = {
    variant: SmileyVariantStyle.Filled,
    colorType: SmileyColorType.Default,
  },
) => {
  let colorString = undefined;
  const { variant, colorType } = iconStyle;
  if (color) {
    switch (iconType) {
      case "empty": {
        if (
          variant === SmileyVariantStyle.Filled &&
          (!colorType || colorType === SmileyColorType.Default)
        ) {
          colorString = `var(--mantine-color-${color}-3)`;
        } else {
          colorString =
            colorType && colorType !== SmileyColorType.Default
              ? lighten(color, 0.3)
              : `var(--mantine-color-${color}-3)`;
        }
        break;
      }
      case "full": {
        colorString =
          colorType && colorType !== SmileyColorType.Default
            ? color
            : `var(--mantine-color-${color}-7)`;
        break;
      }
      default: {
        colorString =
          colorType && colorType !== SmileyColorType.Default
            ? color
            : `var(--mantine-color-${color}-9)`;
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

export const getEmptyIcon = (value: number, color: string, iconStyle, response) => {
  const { variant, emojies } = iconStyle;
  if (!variant || variant === SmileyVariantStyle.Default) {
    return (
      <div style={{ margin: "0px 5px 5px" }}>
        <Image src={getDefaultSmileySrc(value)} alt={"smiley icon"} width={40} height={40} />
      </div>
    );
  } else if (variant === SmileyVariantStyle.Emojis) {
    return (
      <Text size={value === response ? "3rem" : "2.3rem"} style={{ margin: "0px 4px 4px" }}>
        {getSmileyEmojies(value)}
      </Text>
    );
  } else if (variant === SmileyVariantStyle.Custom) {
    return (
      <Text size={value === response ? "3rem" : "2.3rem"} style={{ margin: "0px 4px 4px" }}>
        {emojies?.[value]}
      </Text>
    );
  } else if (variant === SmileyVariantStyle.Filled) {
    switch (value) {
      case 1:
        return <IconMoodAngryFilled style={getIconStyle(color, "empty", iconStyle)} />;
      case 2:
        return <IconMoodSadFilled style={getIconStyle(color, "empty", iconStyle)} />;
      case 3:
        return <IconMoodEmptyFilled style={getIconStyle(color, "empty", iconStyle)} />;
      case 4:
        return <IconMoodHappyFilled style={getIconStyle(color, "empty", iconStyle)} />;
      case 5:
        return <IconMoodCrazyHappyFilled style={getIconStyle(color, "empty", iconStyle)} />;
      default:
        return null;
    }
  } else {
    switch (value) {
      case 1:
        return <IconMoodAngry style={getIconStyle(color, "empty", iconStyle)} />;
      case 2:
        return <IconMoodSad style={getIconStyle(color, "empty", iconStyle)} />;
      case 3:
        return <IconMoodEmpty style={getIconStyle(color, "empty", iconStyle)} />;
      case 4:
        return <IconMoodHappy style={getIconStyle(color, "empty", iconStyle)} />;
      case 5:
        return <IconMoodCrazyHappy style={getIconStyle(color, "empty", iconStyle)} />;
      default:
        return null;
    }
  }
};

export const getFullIcon = (value: number, color: string, iconStyle) => {
  const { variant, emojies } = iconStyle;
  if (!variant || variant === SmileyVariantStyle.Default) {
    return (
      <div style={{ margin: "-8px 5px 5px" }}>
        <Image src={getDefaultSmileySrc(value)} alt={"smiley icon"} width={55} height={55} />
      </div>
    );
  } else if (variant === SmileyVariantStyle.Emojis) {
    return (
      <Text size={"3rem"} style={{ margin: "-8px 4px 4px" }}>
        {getSmileyEmojies(value)}
      </Text>
    );
  } else if (variant === SmileyVariantStyle.Custom) {
    return (
      <Text size={"3rem"} style={{ margin: "-8px 4px 4px" }}>
        {emojies?.[value]}
      </Text>
    );
  } else if ([SmileyVariantStyle.Filled, SmileyVariantStyle.FilledOnHover].includes(variant)) {
    switch (value) {
      case 1:
        return <IconMoodAngryFilled style={getIconStyle(color, "full", iconStyle)} />;
      case 2:
        return <IconMoodSadFilled style={getIconStyle(color, "full", iconStyle)} />;
      case 3:
        return <IconMoodEmptyFilled style={getIconStyle(color, "full", iconStyle)} />;
      case 4:
        return <IconMoodHappyFilled style={getIconStyle(color, "full", iconStyle)} />;
      case 5:
        return <IconMoodCrazyHappyFilled style={getIconStyle(color, "full", iconStyle)} />;
      default:
        return null;
    }
  } else {
    switch (value) {
      case 1:
        return <IconMoodAngry style={getIconStyle(color, "full", iconStyle)} />;
      case 2:
        return <IconMoodSad style={getIconStyle(color, "full", iconStyle)} />;
      case 3:
        return <IconMoodEmpty style={getIconStyle(color, "full", iconStyle)} />;
      case 4:
        return <IconMoodHappy style={getIconStyle(color, "full", iconStyle)} />;
      case 5:
        return <IconMoodCrazyHappy style={getIconStyle(color, "full", iconStyle)} />;
      default:
        return null;
    }
  }
};

export function getSmileyEmojies(value) {
  switch (value) {
    case 1:
      return "😥";
    case 2:
      return "🙁";
    case 3:
      return "😐";
    case 4:
      return "🙂";
    case 5:
      return "😀";
    default:
      return null;
  }
}

export function getDefaultSmileySrc(value: number) {
  switch (value) {
    case 1:
      return "/images/smiley-icons/Very_Sad.svg";
    case 2:
      return "/images/smiley-icons/Sad.svg";
    case 3:
      return "/images/smiley-icons/Neutral.svg";
    case 4:
      return "/images/smiley-icons/Happy.svg";
    case 5:
      return "/images/smiley-icons/Very_Happy.svg";
    default:
      return "";
  }
}
