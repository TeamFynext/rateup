// What a tool tile says, from data the page has already loaded.

import type { TFunction } from "i18next";

import type { Rule } from "@/types/rule.ts";

import type { ToolStatus } from "./ChannelOverview.tsx";

/** The rules one trigger runs for one account or Page; rules for other accounts stay out. */
export function matchingRules(
  rules: readonly Rule[],
  platform: string,
  triggerEvent: string,
  channelId: string,
): Rule[] {
  return rules.filter(
    (r) =>
      r.platform === platform &&
      r.triggerEvent === triggerEvent &&
      r.whatsappSettingsPhoneIds?.includes(channelId),
  );
}

/** "3 on · 1 off", "2 on", "1 off", or "Not set up". */
export function rulesStatus(
  rules: readonly Rule[] | undefined,
  t: TFunction,
): ToolStatus | undefined {
  if (!rules) return undefined;
  if (rules.length === 0) return { tone: "idle", text: t("Not set up") };
  const on = rules.filter((r) => r.isActive).length;
  const off = rules.length - on;
  if (on === 0) return { tone: "idle", text: t("{count} off", { count: off }) };
  return {
    tone: "live",
    text: off ? t("{on} on · {off} off", { on, off }) : t("{count} on", { count: on }),
  };
}

/** "5 links", live while any of them starts its automation. */
export function linksStatus(
  rules: readonly Rule[] | undefined,
  t: TFunction,
): ToolStatus | undefined {
  if (!rules) return undefined;
  if (rules.length === 0) return { tone: "idle", text: t("No links yet") };
  return {
    tone: rules.some((r) => r.isActive) ? "live" : "idle",
    text: t("{count, plural, one {# link} other {# links}}", { count: rules.length }),
  };
}

/** A menu: "Live · 4 items", or "Off". */
export function menuStatus(count: number | undefined, t: TFunction): ToolStatus | undefined {
  if (count === undefined) return undefined;
  return count > 0
    ? { tone: "live", text: t("Live · {count, plural, one {# item} other {# items}}", { count }) }
    : { tone: "idle", text: t("Off") };
}

/** Ice breakers: "2 of 4", or "Not set up". */
export function iceBreakersStatus(
  count: number | undefined,
  max: number,
  t: TFunction,
): ToolStatus | undefined {
  if (count === undefined) return undefined;
  return count > 0
    ? { tone: "live", text: t("{count} of {max}", { count, max }) }
    : { tone: "idle", text: t("Not set up") };
}

/** Meta could not be read, so nothing can be said. */
export function unknownStatus(t: TFunction): ToolStatus {
  return { tone: "warning", text: t("Couldn't load") };
}
