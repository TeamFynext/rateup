import {
  eventDefinition,
  isNotificationEvent,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type NotificationEvent,
} from "./notification.catalogue.js";

export type ChannelToggles = Partial<Record<NotificationChannel, boolean>>;
export type PreferenceOverrides = Partial<Record<NotificationEvent, ChannelToggles>>;

export interface MemberPreferences {
  channels: Record<NotificationChannel, boolean>;
  sound: boolean;
  overrides: PreferenceOverrides;
}

export const DEFAULT_PREFERENCES: MemberPreferences = {
  channels: { inApp: true, push: true, email: true, desktop: true },
  sound: true,
  overrides: {},
};

function isChannel(value: string): value is NotificationChannel {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}

/** The stored JSON, keeping only events and channels the catalogue still offers. */
export function parseOverrides(raw: unknown): PreferenceOverrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PreferenceOverrides = {};
  for (const [event, toggles] of Object.entries(raw)) {
    if (!isNotificationEvent(event) || !toggles || typeof toggles !== "object") continue;
    const offered = eventDefinition(event).channels;
    const kept: ChannelToggles = {};
    for (const [channel, value] of Object.entries(toggles)) {
      if (isChannel(channel) && channel in offered && typeof value === "boolean") {
        kept[channel] = value;
      }
    }
    if (Object.keys(kept).length > 0) out[event] = kept;
  }
  return out;
}

export function preferencesFromRow(
  row: {
    inApp: boolean;
    push: boolean;
    email: boolean;
    desktop: boolean;
    sound: boolean;
    overrides: unknown;
  } | null,
): MemberPreferences {
  if (!row) return DEFAULT_PREFERENCES;
  return {
    channels: { inApp: row.inApp, push: row.push, email: row.email, desktop: row.desktop },
    sound: row.sound,
    overrides: parseOverrides(row.overrides),
  };
}

/** The event's own toggle for a channel, ignoring the master switch. Undefined when not offered. */
export function eventToggle(
  prefs: MemberPreferences,
  event: NotificationEvent,
  channel: NotificationChannel,
): boolean | undefined {
  const fallback = eventDefinition(event).channels[channel];
  if (fallback === undefined) return undefined;
  return prefs.overrides[event]?.[channel] ?? fallback;
}

/** The channels this event actually goes out on for a member: its toggle and the master switch. */
export function deliveredChannels(
  prefs: MemberPreferences,
  event: NotificationEvent,
): Set<NotificationChannel> {
  const out = new Set<NotificationChannel>();
  for (const channel of NOTIFICATION_CHANNELS) {
    if (prefs.channels[channel] && eventToggle(prefs, event, channel)) out.add(channel);
  }
  return out;
}

/**
 * Apply a patch of toggles, storing only values that differ from the catalogue default so
 * a later change of default reaches everyone who never touched that toggle.
 */
export function mergeOverrides(
  current: PreferenceOverrides,
  patch: Record<string, ChannelToggles>,
): PreferenceOverrides {
  const next: PreferenceOverrides = structuredClone(current);
  for (const [event, toggles] of Object.entries(patch)) {
    if (!isNotificationEvent(event)) continue;
    const offered = eventDefinition(event).channels;
    const entry: ChannelToggles = { ...next[event] };
    for (const [channel, value] of Object.entries(toggles)) {
      if (!isChannel(channel) || typeof value !== "boolean") continue;
      const fallback = offered[channel];
      if (fallback === undefined) continue;
      if (value === fallback) delete entry[channel];
      else entry[channel] = value;
    }
    if (Object.keys(entry).length > 0) next[event] = entry;
    else delete next[event];
  }
  return next;
}
