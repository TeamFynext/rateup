import React from "react";

import {
  Accordion,
  Avatar,
  Box,
  Button,
  Collapse,
  Group,
  Skeleton,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { IconBrandWhatsappFilled, IconTicket } from "@tabler/icons-react";

import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "@/backend/notification/notification.query";

const WhatsappNotificationSettings = () => {
  const update = useUpdateNotificationSettings();
  const { data, isLoading } = useNotificationSettings();

  return (
    <Stack p={"lg"}>
      <Skeleton visible={isLoading}>
        <Switch
          label={"Allow Notification on Chat Assigned"}
          checked={data?.waMessageAssignNotification}
          onChange={(e) => {
            update.mutate({
              waMessageAssignNotification: e.currentTarget.checked,
            });
          }}
        />
      </Skeleton>
      <Skeleton visible={isLoading}>
        <Switch
          label={"Allow Notification on Chat Closed"}
          checked={data?.waMessageClosedNotification}
          onChange={(e) => {
            update.mutate({
              waMessageClosedNotification: e.currentTarget.checked,
            });
          }}
        />
      </Skeleton>
    </Stack>
  );
};

const TicketNotificationSettings = () => {
  const { data, isLoading } = useNotificationSettings();
  const update = useUpdateNotificationSettings();
  return (
    <Stack p={"lg"}>
      <Skeleton visible={isLoading}>
        <Switch
          checked={data?.ticketAssignNotification}
          onChange={(e) => {
            update.mutate({
              ticketAssignNotification: e.currentTarget.checked,
            });
          }}
          label={"Allow Notification on ticket Assigned"}
        />
      </Skeleton>
    </Stack>
  );
};

const notificationFeatures = [
  {
    value: "WhatsApp",
    icon: <IconBrandWhatsappFilled color="#25D366" />,
    component: <WhatsappNotificationSettings />,
  },
  {
    value: "Ticket",
    icon: <IconTicket />,
    component: <TicketNotificationSettings />,
  },
];

const NotificationSettings = () => {
  const settings = notificationFeatures.map((item) => (
    <Accordion.Item key={item.value} value={item.value}>
      <Accordion.Control icon={item.icon}>{item.value}</Accordion.Control>
      <Accordion.Panel>{item.component}</Accordion.Panel>
    </Accordion.Item>
  ));
  return (
    <Stack>
      <Accordion>{settings}</Accordion>
    </Stack>
  );
};

export default NotificationSettings;
