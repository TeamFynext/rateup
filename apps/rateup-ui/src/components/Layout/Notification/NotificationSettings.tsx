import { IconBrandWhatsappFilled } from "@tabler/icons-react";

import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "@/backend/notification/notification.query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";

const WhatsappNotificationSettings = () => {
  const update = useUpdateNotificationSettings();
  const { data, isLoading } = useNotificationSettings();

  return (
    <div className="space-y-3 pt-1">
      <Field
        orientation="horizontal"
        className="justify-between rounded-md border border-border p-3"
      >
        <FieldLabel htmlFor="wa-assigned">Allow notification on chat assigned</FieldLabel>
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
      </Field>

      <Field
        orientation="horizontal"
        className="justify-between rounded-md border border-border p-3"
      >
        <FieldLabel htmlFor="wa-closed">Allow notification on chat closed</FieldLabel>
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
      </Field>
    </div>
  );
};

const notificationFeatures = [
  {
    value: "WhatsApp",
    icon: <IconBrandWhatsappFilled className="size-4" />,
    component: <WhatsappNotificationSettings />,
  },
];

const NotificationSettings = () => {
  return (
    <div className="px-4">
      <Accordion defaultValue={[notificationFeatures[0].value]}>
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
