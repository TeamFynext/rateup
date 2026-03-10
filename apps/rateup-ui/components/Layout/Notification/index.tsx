"use client";

import { useMemo, useState } from "react";
import type { ComponentProps, Dispatch, SetStateAction } from "react";

import { IconBell, IconSettings } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useNotifications,
  useNotificationsCount,
  useNotificationSettings,
} from "@/backend/notification/notification.query";
import RefreshButton from "@/components/Button/RefreshButton";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import NotificationList from "./NotificationList";
import NotificationSettings from "./NotificationSettings";

enum NotificationTabs {
  notifications = "notifications",
  notificationSettings = "notificationSettings",
}

const NotificationBellIcon = (props: ComponentProps<typeof IconBell>) => {
  const [opened, setOpened] = useState(false);
  const qc = useQueryClient();
  const [tab, setTab] = useState(NotificationTabs.notifications);
  const { data, isLoading, refetch } = useNotifications(
    tab === NotificationTabs.notifications,
  );
  const { isLoading: isLoadingSettings, refetch: refetchSettings } =
    useNotificationSettings(tab === NotificationTabs.notificationSettings);
  const {
    data: notificationCount,
    isLoading: isLoadingCount,
    isFetched,
  } = useNotificationsCount();

  const NotificationDrawerComp = useMemo(() => {
    switch (tab) {
      case NotificationTabs.notifications:
        return (
          <NotificationList
            close={() => setOpened(false)}
            data={data}
            isLoading={isLoading}
          />
        );
      case NotificationTabs.notificationSettings:
        return <NotificationSettings />;
      default:
        return null;
    }
  }, [close, data, isLoading, tab]);

  const handleOpen = () => {
    qc.invalidateQueries({ queryKey: ["notification"] });
    qc.invalidateQueries({ queryKey: ["notificationCount"] });
    setOpened(true);
  };

  return (
    <>
      <Sheet
        open={opened}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            handleOpen();
            return;
          }
          setOpened(false);
        }}
      >
        <SheetContent>
          <SheetHeader className="flex-row items-center justify-between gap-2 border-b pb-3">
            <SheetTitle>
              {tab === NotificationTabs.notifications
                ? "Notifications"
                : "Notification Settings"}
            </SheetTitle>
            {tab === NotificationTabs.notifications ? (
              <RefreshButton isLoading={isLoading} onClick={() => refetch()} />
            ) : (
              <RefreshButton
                isLoading={isLoadingSettings}
                onClick={() => refetchSettings()}
              />
            )}
          </SheetHeader>

          <div className="flex h-[calc(100dvh-80px)] flex-col justify-between">
            {NotificationDrawerComp}
            <NotificationDrawerFooter tab={tab} setTab={setTab} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="relative mx-auto">
        <Button
          size="icon-sm"
          aria-label="Open notifications"
          onClick={handleOpen}
          variant="secondary"
          className="h-8 w-8"
        >
          <IconBell className="size-5" strokeWidth={1.8} {...props} />
        </Button>

        {isLoadingCount && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive animate-pulse" />
        )}

        {isFetched && Boolean(notificationCount) && (
          <span className="absolute -top-2 -right-2 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {Number(notificationCount) > 99 ? "99+" : notificationCount}
          </span>
        )}
      </div>
    </>
  );
};

const NotificationDrawerFooter = ({
  tab,
  setTab,
}: {
  tab: NotificationTabs;
  setTab: Dispatch<SetStateAction<NotificationTabs>>;
}) => {
  return (
    <div className="border-t pt-3">
      <Button
        variant="ghost"
        className="w-full justify-start gap-2"
        onClick={() =>
          setTab(
            tab === NotificationTabs.notifications
              ? NotificationTabs.notificationSettings
              : NotificationTabs.notifications,
          )
        }
      >
        {tab === NotificationTabs.notifications ? (
          <IconSettings className="size-4" />
        ) : (
          <IconBell className="size-4" />
        )}
        {tab === NotificationTabs.notifications
          ? "Notification settings"
          : "Notifications"}
      </Button>
    </div>
  );
};

export default NotificationBellIcon;
