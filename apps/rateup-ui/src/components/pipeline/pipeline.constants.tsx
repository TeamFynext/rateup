import {
  IconAdjustmentsHorizontal,
  IconBrandInstagram,
  IconBrandMessenger,
  IconBrandWhatsapp,
  IconCalendarStats,
  IconChartBar,
  IconChecklist,
  IconClipboardList,
  IconFileText,
  IconGift,
  IconLayoutKanban,
  IconList,
  IconMessage2,
  IconPhone,
  IconUsersGroup,
  IconVideo,
  type Icon,
} from "@tabler/icons-react";

import type {
  LeadChannel,
  LeadSource,
  LeadTaskType,
  LifecycleCategory,
} from "@/backend/pipeline/pipeline.types.ts";
// The view and filter vocabularies live with the state that holds them.
import type { PipelineView } from "@/store/pipeline.store.ts";

// Labels for every vocabulary here live in `pipeline.labels.ts`, which is where
// `t` can reach them. These maps carry only what a translation cannot: the icon
// and the colour.

export const VIEW_TABS: ReadonlyArray<{ id: PipelineView; icon: Icon }> = [
  { id: "board", icon: IconLayoutKanban },
  { id: "list", icon: IconList },
  { id: "forecast", icon: IconCalendarStats },
  { id: "insights", icon: IconChartBar },
  { id: "settings", icon: IconAdjustmentsHorizontal },
];

interface SourceMeta {
  icon: Icon;
  /** Tailwind text colour for the source dot and icon, light and dark. */
  className: string;
  /**
   * Solid background in the same hue, for the insights panel's icon tiles and
   * its bars. A separate class rather than a derived one: `text-amber-700` reads
   * well on the page background but is muddy as a fill, so each hue picks the
   * step that works filled.
   */
  fillClassName: string;
}

export const SOURCE_META: Record<LeadSource, SourceMeta> = {
  WHATSAPP: {
    icon: IconBrandWhatsapp,
    className: "text-green-600 dark:text-green-500",
    fillClassName: "bg-green-500",
  },
  INSTAGRAM: {
    icon: IconBrandInstagram,
    className: "text-pink-600 dark:text-pink-500",
    fillClassName: "bg-pink-600",
  },
  MESSENGER: {
    icon: IconBrandMessenger,
    className: "text-blue-600 dark:text-blue-500",
    fillClassName: "bg-blue-600",
  },
  SURVEY: {
    icon: IconClipboardList,
    className: "text-primary dark:text-primary",
    fillClassName: "bg-primary",
  },
  REFERRAL: {
    icon: IconUsersGroup,
    className: "text-amber-700 dark:text-amber-500",
    fillClassName: "bg-amber-500",
  },
  LOYALTY: {
    icon: IconGift,
    className: "text-cyan-700 dark:text-cyan-400",
    fillClassName: "bg-cyan-600",
  },
  MANUAL: {
    icon: IconChecklist,
    className: "text-muted-foreground",
    fillClassName: "bg-muted-foreground",
  },
};

interface ChannelMeta {
  icon: Icon;
  /** Background for the channel pip that sits on the lead's avatar. */
  className: string;
}

export const CHANNEL_META: Record<Exclude<LeadChannel, "NONE">, ChannelMeta> = {
  WHATSAPP: { icon: IconBrandWhatsapp, className: "bg-green-600" },
  INSTAGRAM: { icon: IconBrandInstagram, className: "bg-pink-600" },
  MESSENGER: { icon: IconBrandMessenger, className: "bg-blue-600" },
};

export const TASK_TYPE_ICON: Record<LeadTaskType, Icon> = {
  CALL: IconPhone,
  MESSAGE: IconMessage2,
  MEETING: IconVideo,
  DOCUMENT: IconFileText,
  TODO: IconChecklist,
};

/**
 * Lifecycle bands group the board's stage columns. The palette is deliberately
 * the Tailwind ramp rather than bespoke tokens, so both themes come for free.
 */
export const LIFECYCLE_BAND: Record<
  LifecycleCategory,
  { text: string; border: string; surface: string }
> = {
  active: {
    text: "text-amber-700 dark:text-amber-500",
    border: "border-amber-600/35",
    surface: "bg-amber-50 dark:bg-amber-950/30",
  },
  won: {
    text: "text-primary",
    border: "border-primary/35",
    surface: "bg-primary/8 dark:bg-primary/15",
  },
  lost: {
    text: "text-muted-foreground",
    border: "border-border",
    surface: "bg-muted",
  },
};

/** Palette offered when picking a stage or label colour. */
export const STAGE_COLOR_CHOICES = [
  "#16A34A",
  "#3FA46A",
  "#0E7490",
  "#1C518E",
  "#4C7FBC",
  "#7A2FA8",
  "#DD2A7B",
  "#DC2626",
  "#D97A0F",
  "#F8951D",
  "#FFB638",
  "#666864",
] as const;
