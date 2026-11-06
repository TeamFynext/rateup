import { IconBell, IconSettings } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";

import { getNotifications } from "@/backend/notification/notification.api";
import { notificationKeys } from "@/backend/notification/notification.keys";
import {
  useDeleteAllNotifications,
  useMarkAllNotificationsRead,
  useNotifications,
  useNotificationsCount,
} from "@/backend/notification/notification.query";
import RefreshButton from "@/components/Button/RefreshButton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet.tsx";

import { railBadgeClass, railBadgeCount, railButtonClass } from "../Navbar/rail-styles.ts";
import NotificationList from "./NotificationList.tsx";

const NotificationBellIcon = (props: ComponentProps<typeof IconBell>) => {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useNotifications(opened);
  const deleteAll = useDeleteAllNotifications();
  const markRead = useMarkAllNotificationsRead();
  const { data: unread, isLoading: isLoadingCount, isFetched } = useNotificationsCount();

  const [unreadAtOpen, setUnreadAtOpen] = useState<ReadonlySet<string>>(new Set());
  // Rows marked read by this opening keep their dot until the sheet opens again.
  const rows = data?.map((row) => (unreadAtOpen.has(row.id) ? { ...row, readAt: null } : row));

  const handleOpen = async () => {
    setOpened(true);
    // Fetched before marking read, so this opening still knows which rows are new.
    const list = await qc
      .fetchQuery({ queryKey: notificationKeys.all(), queryFn: getNotifications })
      .catch(() => null);
    if (!list) return;
    const unreadIds = new Set(list.filter((row) => !row.readAt).map((row) => row.id));
    setUnreadAtOpen(unreadIds);
    if (unreadIds.size) markRead.mutate();
  };

  return (
    <>
      <Sheet
        open={opened}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            void handleOpen();
            return;
          }
          setOpened(false);
        }}
      >
        <SheetContent>
          <SheetHeader className="flex-row items-center justify-between gap-1 border-b pb-3 pr-10">
            <SheetTitle>{t("Notifications")}</SheetTitle>
            <div className="flex items-center gap-2">
              <RefreshButton isLoading={isLoading} onClick={() => refetch()} />
              <Button
                size="sm"
                variant="outline"
                onClick={() => deleteAll.mutate()}
                disabled={!data?.length}
              >
                {t("Clear all")}
              </Button>
            </div>
          </SheetHeader>

          <div className="flex h-[calc(100dvh-80px)] flex-col justify-between">
            <NotificationList close={() => setOpened(false)} data={rows} isLoading={isLoading} />
            <div className="border-t pt-3">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                render={<Link to="/dashboard/settings/notifications" />}
                onClick={() => setOpened(false)}
              >
                <IconSettings className="size-4" />
                {t("Notification settings")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="relative mx-auto">
        <Button
          size="icon-sm"
          aria-label={t("Open notifications")}
          onClick={() => void handleOpen()}
          variant="ghost"
          className={railButtonClass}
        >
          <IconBell className="size-5" strokeWidth={1.8} {...props} />
        </Button>

        {isLoadingCount && (
          <span className="pointer-events-none absolute top-0.5 right-0.5 size-2 rounded-full bg-destructive ring-2 ring-sidebar animate-pulse" />
        )}

        {isFetched && Boolean(unread) && (
          <span aria-hidden className={railBadgeClass}>
            {railBadgeCount(Number(unread))}
          </span>
        )}
      </div>
    </>
  );
};

export default NotificationBellIcon;
