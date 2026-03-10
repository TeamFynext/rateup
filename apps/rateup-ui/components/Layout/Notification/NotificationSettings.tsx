"use client";

import { IconBrandWhatsappFilled, IconTicket } from "@tabler/icons-react";

import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "@/backend/notification/notification.query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const WhatsappNotificationSettings = () => {
  const update = useUpdateNotificationSettings();
  const { data, isLoading } = useNotificationSettings();

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <Label htmlFor="wa-assigned">Allow notification on chat assigned</Label>
        {isLoading ? (
          <Skeleton className="h-5 w-10" />
        ) : (
          <Switch
            id="wa-assigned"
            checked={Boolean(data?.waMessageAssignNotification)}
            onCheckedChange={(checked) => {
              update.mutate({
                waMessageAssignNotification: checked,
              });
            }}
          />
        )}
      </div>

      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <Label htmlFor="wa-closed">Allow notification on chat closed</Label>
        {isLoading ? (
          <Skeleton className="h-5 w-10" />
        ) : (
          <Switch
            id="wa-closed"
            checked={Boolean(data?.waMessageClosedNotification)}
            onCheckedChange={(checked) => {
              update.mutate({
                waMessageClosedNotification: checked,
              });
            }}
          />
        )}
      </div>
    </div>
  );
};

const TicketNotificationSettings = () => {
  const { data, isLoading } = useNotificationSettings();
  const update = useUpdateNotificationSettings();

  return (
    <div className="pt-1">
      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <Label htmlFor="ticket-assigned">
          Allow notification on ticket assigned
        </Label>
        {isLoading ? (
          <Skeleton className="h-5 w-10" />
        ) : (
          <Switch
            id="ticket-assigned"
            checked={Boolean(data?.ticketAssignNotification)}
            onCheckedChange={(checked) => {
              update.mutate({
                ticketAssignNotification: checked,
              });
            }}
          />
        )}
      </div>
    </div>
  );
};

const notificationFeatures = [
  {
    value: "WhatsApp",
    icon: <IconBrandWhatsappFilled className="size-4" />,
    component: <WhatsappNotificationSettings />,
  },
  {
    value: "Ticket",
    icon: <IconTicket className="size-4" />,
    component: <TicketNotificationSettings />,
  },
];

const NotificationSettings = () => {
  return (
    <div className="px-4">
      <Accordion
        type="single"
        collapsible
        defaultValue={notificationFeatures[0].value}
      >
        {notificationFeatures.map((item) => (
          <AccordionItem key={item.value} value={item.value}>
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                {item.icon}
                <span>{item.value}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>{item.component}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default NotificationSettings;
