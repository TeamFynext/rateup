"use client";

import { useMemo, useState } from "react";

import {
  ActionIcon,
  Badge,
  Drawer,
  Group,
  Indicator,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { IconBell, IconSettings } from "@tabler/icons-react";

import {
  useNotifications,
  useNotificationsCount,
  useNotificationSettings,
} from "@/backend/notification/notification.query";
import RefreshButton from "@/components/Button/RefreshButton";
import { Button } from "@/components/ui/button";

import NotificationList from "./NotificationList";
import NotificationSettings from "./NotificationSettings";

enum NotificationTabs {
  notifications = "notifications",
  notificationSettings = "notificationSettings",
}

const NotificationBellIcon = (props) => {
  const [opened, { open, close }] = useDisclosure(false);

  const [tab, setTab] = useState(NotificationTabs.notifications);
  const { data, isLoading, refetch } = useNotifications(
    tab === NotificationTabs.notifications,
  );
  const {
    data: notificationSettings,
    isLoading: isLoadingSettings,
    refetch: refetchSettings,
  } = useNotificationSettings(tab === NotificationTabs.notificationSettings);
  const {
    data: notificationCount,
    isLoading: isLoadingCount,
    isFetched,
  } = useNotificationsCount();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const NotificationDrawerComp = useMemo(() => {
    switch (tab) {
      case NotificationTabs.notifications:
        return (
          <NotificationList close={close} data={data} isLoading={isLoading} />
        );
      case NotificationTabs.notificationSettings:
        return <NotificationSettings />;
    }
  }, [tab, data, notificationSettings]);

  return (
    <>
      <Drawer
        opened={opened}
        onClose={close}
        title={
          tab === NotificationTabs.notifications ? (
            <Group gap={"xs"}>
              <Text>Notifications</Text>
              <RefreshButton isLoading={isLoading} onClick={() => refetch()} />
            </Group>
          ) : (
            <Group gap={"xs"}>
              <Text>Notification Settings</Text>
              <RefreshButton
                isLoading={isLoadingSettings}
                onClick={() => refetchSettings()}
              />
            </Group>
          )
        }
        position={isMobile ? "top" : "right"}
      >
        <Stack justify="space-between" h={"calc(100vh - 80px)"}>
          {NotificationDrawerComp}
          <NotificationDrawerFooter tab={tab} setTab={setTab} />
        </Stack>
      </Drawer>
      <Indicator
        label={notificationCount}
        processing={isLoadingCount}
        disabled={isFetched && !notificationCount}
        color="red"
        inline
        size={isLoadingCount ? 8 : 16}
      >
        <Button
          size="icon-sm"
          style={{ color: "light-dark(black, white)" }}
          onClick={open}
          variant="secondary"
        >
          <IconBell onClick={open} {...props} />
        </Button>
      </Indicator>
    </>
  );
};

const NotificationDrawerFooter = ({ tab, setTab }) => {
  return (
    <Group>
      <Badge
        style={{ cursor: "pointer" }}
        onClick={() =>
          setTab(
            tab === NotificationTabs.notifications
              ? NotificationTabs.notificationSettings
              : NotificationTabs.notifications,
          )
        }
        variant="transparent"
        tt={"capitalize"}
        size="xl"
        fw={400}
        leftSection={
          tab === NotificationTabs.notifications ? (
            <IconSettings size={20} />
          ) : (
            <IconBell />
          )
        }
      >
        {tab === NotificationTabs.notifications
          ? "Notifiction settings"
          : "Notifictions"}
      </Badge>
    </Group>
  );
};

export default NotificationBellIcon;
