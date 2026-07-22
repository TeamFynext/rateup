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
import { cn } from "@/lib/utils";

function lighten(color: string, alpha: number): string {
  if (color.startsWith("var(")) return `color-mix(in srgb, ${color}, white ${alpha * 100}%)`;
  const h = color.replace("#", "");
  if (h.length < 6) return color;
  const light = (channel: number) => Math.round(channel + (255 - channel) * alpha);
  const r = light(parseInt(h.slice(0, 2), 16));
  const g = light(parseInt(h.slice(2, 4), 16));
  const b = light(parseInt(h.slice(4, 6), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

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
    width: iconType === "full" ? "3.75rem" : "3.125rem",
    height: iconType === "full" ? "3.75rem" : "3.125rem",
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
      <span className={cn(value === response ? "text-5xl" : "text-4xl", "mt-0 mb-1 mx-1")}>
        {getSmileyEmojies(value)}
      </span>
    );
  } else if (variant === SmileyVariantStyle.Custom) {
    return (
      <span className={cn(value === response ? "text-5xl" : "text-4xl", "mt-0 mb-1 mx-1")}>
        {emojies?.[value]}
      </span>
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
    return <span className="-mt-2 mx-1 mb-1 text-5xl">{getSmileyEmojies(value)}</span>;
  } else if (variant === SmileyVariantStyle.Custom) {
    return <span className="-mt-2 mx-1 mb-1 text-5xl">{emojies?.[value]}</span>;
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
