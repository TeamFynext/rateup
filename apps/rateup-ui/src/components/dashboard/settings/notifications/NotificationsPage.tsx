import {
  IconBell,
  IconCreditCard,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconGift,
  IconLayoutKanban,
  IconMail,
  IconMessages,
  IconPlugConnected,
  IconSpeakerphone,
  IconVolume,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";
import type { ComponentType, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import {
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type NotificationSettings,
} from "@/backend/notification/notification.api";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "@/backend/notification/notification.query";
import { PageHeading } from "@/components/common/page-heading.tsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { getApiErrorMessage } from "@/utils/apiError";
import { useDesktopPermission } from "@/utils/desktopNotifications";

import {
  categoryTitle,
  channelDescription,
  channelLabel,
  eventDescription,
  eventLabel,
  isNotificationCategory,
  isNotificationEvent,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationEvent,
} from "./notificationCopy.ts";

const CHANNEL_ICONS: Record<NotificationChannel, ComponentType<{ className?: string }>> = {
  inApp: IconBell,
  push: IconDeviceMobile,
  email: IconMail,
  desktop: IconDeviceDesktop,
};

const CATEGORY_ICONS: Record<NotificationCategory, ComponentType<{ className?: string }>> = {
  inbox: IconMessages,
  pipelines: IconLayoutKanban,
  campaigns: IconSpeakerphone,
  loyalty: IconGift,
  channels: IconPlugConnected,
  billing: IconCreditCard,
};

type EventRow = NotificationSettings["events"][number] & { key: NotificationEvent };

export function NotificationsPage() {
  const { t } = useTranslation();
  const { data, isPending, error } = useNotificationSettings();
  const update = useUpdateNotificationSettings();

  if (isPending) {
    return (
      <PageShell t={t}>
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell t={t}>
        <Alert variant="destructive">
          <AlertTitle>{t("Could not load your notification settings")}</AlertTitle>
          <AlertDescription>{getApiErrorMessage(error, t("Please try again."))}</AlertDescription>
        </Alert>
      </PageShell>
    );
  }

  const byCategory = new Map<NotificationCategory, EventRow[]>();
  for (const event of data.events) {
    if (!isNotificationEvent(event.key) || !isNotificationCategory(event.category)) continue;
    const rows = byCategory.get(event.category) ?? [];
    rows.push({ ...event, key: event.key });
    byCategory.set(event.category, rows);
  }

  return (
    <PageShell t={t}>
      <DeliveryCard
        settings={data}
        onChannel={(channel, value) => update.mutate({ channels: { [channel]: value } })}
        onSound={(value) => update.mutate({ sound: value })}
      />

      {NOTIFICATION_CATEGORIES.filter((category) => byCategory.has(category)).map((category) => (
        <CategoryCard
          key={category}
          category={category}
          events={byCategory.get(category) ?? []}
          masters={data.channels}
          onToggle={(event, channel, value) =>
            update.mutate({ events: { [event]: { [channel]: value } } })
          }
          onToggleAll={(value) =>
            update.mutate({ events: categoryPatch(byCategory.get(category) ?? [], value) })
          }
        />
      ))}

      <p className="text-sm text-muted-foreground">
        {t(
          "Invitations, password and sign-in emails, payment receipts and plan expiry reminders are always sent. The account owner is also always emailed when the conversation limit is reached.",
        )}
      </p>
    </PageShell>
  );
}

function PageShell({ t, children }: Readonly<{ t: TFunction; children: ReactNode }>) {
  return (
    <div className="mx-auto flex w-full max-w-265 flex-col gap-6">
      <PageHeading
        title={t("Notifications")}
        description={t(
          "Choose what RateUp tells you about and where. These settings are yours alone.",
        )}
      />
      {children}
    </div>
  );
}

function DeliveryCard({
  settings,
  onChannel,
  onSound,
}: Readonly<{
  settings: NotificationSettings;
  onChannel: (channel: NotificationChannel, value: boolean) => void;
  onSound: (value: boolean) => void;
}>) {
  const { t } = useTranslation();
  const desktop = useDesktopPermission();

  return (
    <Card className="gap-0 py-0">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-medium">{t("Where you get notified")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("Turning a channel off silences it for everything below.")}
        </p>
      </div>
      <ul className="divide-y divide-border">
        {NOTIFICATION_CHANNELS.map((channel) => {
          const Icon = CHANNEL_ICONS[channel];
          return (
            <li key={channel} className="flex items-center gap-3 px-6 py-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{channelLabel(t, channel)}</p>
                <p className="text-sm text-muted-foreground">{channelDescription(t, channel)}</p>
                {channel === "desktop" && settings.channels.desktop ? (
                  <DesktopPermissionNote
                    permission={desktop.permission}
                    onAllow={() => void desktop.request()}
                  />
                ) : null}
              </div>
              <Switch
                checked={settings.channels[channel]}
                onCheckedChange={(value) => onChannel(channel, value)}
                aria-label={channelLabel(t, channel)}
              />
            </li>
          );
        })}
        <li className="flex items-center gap-3 px-6 py-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <IconVolume className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t("Sound")}</p>
            <p className="text-sm text-muted-foreground">
              {t("Play a sound when a notification arrives while RateUp is open")}
            </p>
          </div>
          <Switch checked={settings.sound} onCheckedChange={onSound} aria-label={t("Sound")} />
        </li>
      </ul>
    </Card>
  );
}

function DesktopPermissionNote({
  permission,
  onAllow,
}: Readonly<{
  permission: ReturnType<typeof useDesktopPermission>["permission"];
  onAllow: () => void;
}>) {
  const { t } = useTranslation();
  if (permission === "granted") return null;
  if (permission === "unsupported") {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        {t("This browser does not support desktop notifications.")}
      </p>
    );
  }
  if (permission === "denied") {
    return (
      <p className="mt-2 text-sm text-amber-700 dark:text-amber-500">
        {t("This browser is blocking notifications from RateUp. Allow them in the site settings.")}
      </p>
    );
  }
  return (
    <Button variant="outline" size="sm" className="mt-2" onClick={onAllow}>
      {t("Allow in this browser")}
    </Button>
  );
}

/** Every channel each event in the section offers, set to one value. */
function categoryPatch(events: EventRow[], value: boolean) {
  const patch: Record<string, Partial<Record<NotificationChannel, boolean>>> = {};
  for (const event of events) {
    patch[event.key] = Object.fromEntries(
      Object.keys(event.channels).map((channel) => [channel, value]),
    );
  }
  return patch;
}

function CategoryCard({
  category,
  events,
  masters,
  onToggle,
  onToggleAll,
}: Readonly<{
  category: NotificationCategory;
  events: EventRow[];
  masters: NotificationSettings["channels"];
  onToggle: (event: NotificationEvent, channel: NotificationChannel, value: boolean) => void;
  onToggleAll: (value: boolean) => void;
}>) {
  const { t } = useTranslation();
  const Icon = CATEGORY_ICONS[category];
  const title = categoryTitle(t, category);
  // On while anything in the section is on, so one click silences the whole section.
  const anyOn = events.some((event) => Object.values(event.channels).some(Boolean));

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4 sm:grid sm:grid-cols-[minmax(0,1fr)_repeat(4,5.5rem)]">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <h2 className="text-base font-medium">{title}</h2>
          <Switch
            className="ml-auto sm:ml-2"
            checked={anyOn}
            onCheckedChange={onToggleAll}
            aria-label={t("All {section} notifications", { section: title })}
          />
        </div>
        {NOTIFICATION_CHANNELS.map((channel) => (
          <span
            key={channel}
            className="hidden text-center text-xs font-medium text-muted-foreground sm:block"
          >
            {channelLabel(t, channel)}
          </span>
        ))}
      </div>
      <ul className="divide-y divide-border">
        {events.map((event) => {
          const description = eventDescription(t, event.key);
          const label = eventLabel(t, event.key);
          return (
            <li
              key={event.key}
              className="flex flex-col gap-3 px-6 py-4 sm:grid sm:grid-cols-[minmax(0,1fr)_repeat(4,5.5rem)] sm:items-center"
            >
              <div className="min-w-0">
                <p className="font-medium">{label}</p>
                {description ? (
                  <p className="text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 sm:contents">
                {NOTIFICATION_CHANNELS.map((channel) => {
                  const value = event.channels[channel];
                  if (value === undefined) {
                    return (
                      <span
                        key={channel}
                        aria-hidden
                        className="hidden text-center text-muted-foreground sm:block"
                      >
                        –
                      </span>
                    );
                  }
                  const off = !masters[channel];
                  return (
                    <label
                      key={channel}
                      className="flex items-center gap-2 sm:justify-center"
                      title={off ? t("Turned off under Where you get notified") : undefined}
                    >
                      <Switch
                        size="sm"
                        checked={value && !off}
                        disabled={off}
                        onCheckedChange={(next) => onToggle(event.key, channel, next)}
                        aria-label={`${label}: ${channelLabel(t, channel)}`}
                      />
                      <span className="text-xs text-muted-foreground sm:hidden">
                        {channelLabel(t, channel)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
