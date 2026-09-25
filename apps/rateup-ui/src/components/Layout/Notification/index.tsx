import { IconBell, IconSettings } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";

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

import NotificationList from "./NotificationList.tsx";

const NotificationBellIcon = (props: ComponentProps<typeof IconBell>) => {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useNotifications(opened);
  const deleteAll = useDeleteAllNotifications();
  const markRead = useMarkAllNotificationsRead();
  const { data: unread, isLoading: isLoadingCount, isFetched } = useNotificationsCount();

  const handleOpen = async () => {
    setOpened(true);
    // Fetched before marking, so this opening still shows which rows are new.
    await qc.invalidateQueries({ queryKey: notificationKeys.all() });
    if (unread) markRead.mutate();
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
            <NotificationList close={() => setOpened(false)} data={data} isLoading={isLoading} />
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
          variant="secondary"
          className="h-8 w-8"
        >
          <IconBell className="size-5" strokeWidth={1.8} {...props} />
        </Button>

        {isLoadingCount && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive animate-pulse" />
        )}

        {isFetched && Boolean(unread) && (
          <span className="absolute -top-2 -right-2 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground text-white">
            {Number(unread) > 99 ? "99+" : unread}
          </span>
        )}
      </div>
    </>
  );
};

export default NotificationBellIcon;
