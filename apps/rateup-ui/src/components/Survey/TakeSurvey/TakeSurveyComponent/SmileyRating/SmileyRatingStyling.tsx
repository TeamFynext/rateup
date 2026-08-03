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

import { cn } from "@/lib/utils";
import { SmileyColorType, SmileyVariantStyle } from "@/types/enums.ts";

/**
 * Smiley colours are stored as palette *names* ("yellow", "blue", …) and used to
 * be resolved through `var(--mantine-color-<name>-<shade>)`. Those variables are
 * gone with Mantine, so the three shades this component reads are inlined here.
 * `rateup-blue` is the brand ramp that used to live in `mantineTheme.ts`.
 */
const PALETTE: Record<string, { 3: string; 7: string; 9: string }> = {
  "rateup-blue": { 3: "#73b4f6", 7: "#2776dc", 9: "#004f98" },
  dark: { 3: "#5c5f66", 7: "#1a1b1e", 9: "#101113" },
  gray: { 3: "#dee2e6", 7: "#495057", 9: "#212529" },
  red: { 3: "#ff8787", 7: "#f03e3e", 9: "#c92a2a" },
  pink: { 3: "#f783ac", 7: "#d6336c", 9: "#a61e4d" },
  grape: { 3: "#da77f2", 7: "#ae3ec9", 9: "#862e9c" },
  violet: { 3: "#9775fa", 7: "#7048e8", 9: "#5f3dc4" },
  indigo: { 3: "#748ffc", 7: "#4263eb", 9: "#364fc7" },
  blue: { 3: "#74c0fc", 7: "#1c7ed6", 9: "#1864ab" },
  cyan: { 3: "#3bc9db", 7: "#1098ad", 9: "#0b7285" },
  teal: { 3: "#38d9a9", 7: "#0ca678", 9: "#087f5b" },
  green: { 3: "#69db7c", 7: "#37b24d", 9: "#2b8a3e" },
  lime: { 3: "#a9e34b", 7: "#74b816", 9: "#5c940d" },
  yellow: { 3: "#ffd43b", 7: "#f59f00", 9: "#e67700" },
  orange: { 3: "#ffa94d", 7: "#f76707", 9: "#d9480f" },
};

/** Resolves a palette name to a shade; passes through anything already a colour. */
function paletteShade(name: string, shade: 3 | 7 | 9): string {
  return PALETTE[name]?.[shade] ?? name;
}

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

/** How a smiley set is rendered: filled/outline variant, palette, and emoji set. */
/** Per-smiley colour overrides written by the theme editor. */
export interface SmileyGradientStyle {
  color?: Record<number, string>;
  gradientStartColor?: string;
  gradientEndColor?: string;
}

export interface SmileyIconStyle {
  variant: SmileyVariantStyle;
  colorType: SmileyColorType;
  emojies?: string[];
}

export const getIconStyle = (
  color?: string,
  iconType: string = "neutral",
  iconStyle: SmileyIconStyle = {
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
          colorString = paletteShade(color, 3);
        } else {
          colorString =
            colorType && colorType !== SmileyColorType.Default
              ? lighten(color, 0.3)
              : paletteShade(color, 3);
        }
        break;
      }
      case "full": {
        colorString =
          colorType && colorType !== SmileyColorType.Default ? color : paletteShade(color, 7);
        break;
      }
      default: {
        colorString =
          colorType && colorType !== SmileyColorType.Default ? color : paletteShade(color, 9);
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

export const getEmptyIcon = (
  value: number,
  color: string | undefined,
  iconStyle: SmileyIconStyle,
  response?: unknown,
) => {
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

export const getFullIcon = (
  value: number,
  color: string | undefined,
  iconStyle: SmileyIconStyle,
) => {
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

export function getSmileyEmojies(value: number) {
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
