import { useTranslation } from "react-i18next";

import { COORDINATESX, COORDINATESY } from "./constants.ts";
import { UserRole } from "./enums/index.ts";

export function getTimeSince(date: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  let interval = Math.floor(seconds / 31536000);

  if (interval >= 1) {
    return `${interval} year${interval === 1 ? "" : "s"} ago`;
  }

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return `${interval} month${interval === 1 ? "" : "s"} ago`;
  }

  interval = Math.floor(seconds / 86400);
  if (interval >= 2) {
    return `${interval} days ago`;
  } else if (interval === 1) {
    return "Yesterday";
  }

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return `${interval} hour${interval === 1 ? "" : "s"} ago`;
  }

  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return `${interval} minute${interval === 1 ? "" : "s"} ago`;
  }

  return `${Math.floor(seconds)} second${Math.floor(seconds) === 1 ? "" : "s"} ago`;
}

export function shuffleArray<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export const cordinateStyle = (type: string): {} => {
  let style = {};
  let notDefault = true;
  switch (type) {
    case COORDINATESX[0]:
      style = { justifyContent: "flex-start" };
      break;
    case COORDINATESX[1]:
      style = { justifyContent: "center" };
      break;
    case COORDINATESX[2]:
      style = { justifyContent: "flex-end" };
      break;
    case COORDINATESY[0]:
      style = { top: "2rem", bottom: "unset" };
      break;
    case COORDINATESY[1]:
      style = { top: "45%", bottom: "unset" };
      break;
    case COORDINATESY[2]:
      style = { bottom: "2rem", top: "unset" };
      break;
    default:
      notDefault = false;
      style = {
        position: "relative",
      };
      break;
  }
  if (notDefault) {
    style = { ...style, position: "absolute" };
  }
  style = { ...style, width: "100%" };
  return style;
};
export function isHtml(str: string) {
  const regex = /<[^>]+>/g; // Matches any opening and closing tag (ignores content)
  return regex?.test(str);
}
export const extractText = (htmlContent: string) => {
  // Regular expression to remove htmlContent tags
  const regex = /(<([^>]+)>|&nbsp;)/gi;
  // Extract text from htmlContent by replacing htmlContent tags with an empty string
  return htmlContent?.replace(regex, "");
};

export const getContent = (title: string) => {
  if (isHtml(title)) return extractText(title);
  else return title;
};

export function getUserRoleColor(role: string) {
  switch (role) {
    case UserRole.SUPADM:
      return "#B22222";
    case UserRole.ADM:
      return "#FFA500";
    case UserRole.MEMBER:
      return "#ADD8E6";
  }
}

export function UserRoleLabel({ role }: { role: keyof typeof UserRole }) {
  const { t: translations } = useTranslation();
  switch (role) {
    case UserRole.SUPADM:
      return translations("Super Admin");
    case UserRole.ADM:
      return translations("Admin");
    case UserRole.MEMBER:
      return translations("Staff");
  }
}

export function isValidUrl(url: string, checkHttps: boolean = true) {
  try {
    const validatedUrl = new URL(url);
    if (checkHttps) return validatedUrl.protocol === "https:";
    return ["http:", "https:"].includes(validatedUrl.protocol);
  } catch {
    return false;
  }
}

export const safeStrOrNull = (str: string): string | null =>
  !str || !str.trim().length ? null : str;

export function hasRealContent(
  obj: string | { content?: { content?: unknown[] }[] } | null | undefined,
) {
  // A plain-text body has no blocks to inspect, matching the previous behaviour.
  if (typeof obj === "string") return false;
  return obj?.content?.some(
    (block: { content?: unknown[] }) => block.content && block.content.length > 0,
  );
}

export function randomHexColor(): string {
  return (
    "#" +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")
  );
}
