import {
  IconAlertTriangle,
  IconBell,
  IconCreditCard,
  IconGift,
  IconLayoutKanban,
  IconMessages,
  IconPlugConnected,
  IconSpeakerphone,
  IconX,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";

import type { AppNotification } from "@/backend/notification/notification.api";
import { useDeleteNotification } from "@/backend/notification/notification.query";
import {
  notificationEvent,
  notificationMessage,
  notificationPath,
} from "@/components/dashboard/settings/notifications/notificationCopy.ts";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils";
import { formatToRelativeTime } from "@/utils/dateTime.ts";

/** `source` is the catalogue category, or on older rows the channel it came from. */
function SourceIcon({ source }: Readonly<{ source: string }>) {
  const className = "mt-0.5 size-4 shrink-0 text-muted-foreground";
  switch (source) {
    case "inbox":
    case "whatsapp":
      return <IconMessages className={className} />;
    case "pipelines":
      return <IconLayoutKanban className={className} />;
    case "campaigns":
    case "campaign":
      return <IconSpeakerphone className={className} />;
    case "loyalty":
      return <IconGift className={className} />;
    case "channels":
    case "system":
      return <IconPlugConnected className={className} />;
    case "billing":
    case "subscription":
      return <IconCreditCard className={cn(className, "text-amber-700 dark:text-amber-500")} />;
    default:
      return <IconAlertTriangle className={className} />;
  }
}

const NotificationList = ({
  close,
  data,
  isLoading,
}: Readonly<{
  close: () => void;
  data: AppNotification[] | undefined;
  isLoading: boolean;
}>) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deleteNotificationMut = useDeleteNotification();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 px-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconBell />
          </EmptyMedia>
          <EmptyTitle>{t("You're all caught up")}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  const open = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    // Modified clicks keep the browser's own behaviour, so the link still opens in a new tab.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    close();
    void navigate({ href: path });
  };

  return (
    <ScrollArea className="h-[calc(100dvh-180px)] px-2">
      <ul className="flex flex-col gap-1">
        {data.map((notification) => {
          const event = notificationEvent(notification);
          if (!event) return null;
          const path = notificationPath(event, notification.data);
          const unread = !notification.readAt;
          return (
            <li
              key={notification.id}
              className={cn(
                "flex items-start gap-2 rounded-lg border border-border p-2",
                unread ? "bg-primary/5" : "bg-muted/40",
              )}
            >
              <SourceIcon source={notification.source} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <a
                  href={path}
                  onClick={(e) => open(e, path)}
                  className="text-sm leading-relaxed text-foreground hover:underline"
                >
                  {notificationMessage(t, event, notification.data)}
                </a>
                <p className="text-xs text-muted-foreground">
                  {formatToRelativeTime(notification.createdAt)}
                </p>
              </div>
              {unread ? (
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary">
                  <span className="sr-only">{t("Unread")}</span>
                </span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => deleteNotificationMut.mutate(notification.id)}
                className="size-6 text-muted-foreground"
                aria-label={t("Dismiss notification")}
              >
                <IconX className="size-3.5" />
              </Button>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
};

export default NotificationList;
