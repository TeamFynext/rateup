"use client";

import { useCallback } from "react";
import Link from "next/link";

import {
  IconBrandWhatsappFilled,
  IconSend,
  IconTicket,
  IconX,
} from "@tabler/icons-react";

import { useDeleteNotification } from "@/backend/notification/notification.query";
import RateupLoader from "@/components/Loaders/RateupLoader";
import NothingFound from "@/components/NothingFound/NothingFound";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatToRelativeTime } from "@/utils/dateTime";

const NotificationList = ({ close, data, isLoading }) => {
  const deleteNotificationMut = useDeleteNotification();

  const getNotificationIcon = useCallback((source) => {
    switch (source) {
      case "whatsapp":
        return <IconBrandWhatsappFilled className="size-4 text-foreground" />;
      case "ticket":
        return <IconTicket className="size-4 text-foreground" />;
      case "campaign":
        return <IconSend className="size-4 text-foreground" />;
      default:
        return null;
    }
  }, []);

  const getNotificationMessageComp = useCallback((notification) => {
    const { subSource, data } = notification;
    switch (subSource) {
      case "chat-assigned":
        return (
          <div className="flex flex-col gap-2">
            <p className="w-70 text-sm text-muted-foreground">
              A chat from{" "}
              <span className="font-medium text-foreground">
                {data?.contactName}
              </span>{" "}
              has been assigned to you.
              <Link
                href={`/dashboard/inbox?tab=mine&contactId=${data?.contactId}`}
                onClick={close}
                className="ml-1 text-primary underline underline-offset-4 hover:opacity-80"
              >
                Show chat
              </Link>
            </p>
          </div>
        );
      case "chat-closed":
        return (
          <div className="flex flex-col gap-2">
            <p className="max-w-70 text-sm leading-relaxed text-muted-foreground">
              Chat from{" "}
              <span className="font-medium text-foreground">
                {data?.contactName}
              </span>{" "}
              has been closed.
              <Link
                href={`/dashboard/inbox?tab=closed&contactId=${data?.contactId}`}
                onClick={close}
                className="ml-1 inline font-medium text-primary hover:underline"
              >
                Show chat
              </Link>
            </p>
          </div>
        );
      case "ticket-assigned":
        return (
          <div className="flex flex-col gap-2">
            <p className="max-w-70 text-sm leading-relaxed text-muted-foreground">
              A ticket from board{" "}
              <span className="font-medium text-foreground">
                {data?.board_name}
              </span>{" "}
              has been assigned to you.
              <Link
                href={`/dashboard/tickets/${data?.cardId}`}
                onClick={close}
                className="ml-1 inline font-medium text-primary hover:underline"
              >
                Show ticket
              </Link>
            </p>
          </div>
        );
      case "mentioned":
        return (
          <div className="flex flex-col gap-2">
            <p className="max-w-70 text-sm leading-relaxed text-muted-foreground">
              You were mentioned in a chat from{" "}
              <span className="font-medium text-foreground">
                {data?.contactName}
              </span>{" "}
              <Link
                href={`/dashboard/inbox?tab=mine&contactId=${data?.contactId}`}
                onClick={close}
                className="ml-1 text-primary underline underline-offset-4 hover:opacity-80"
              >
                Show chat
              </Link>
            </p>
          </div>
        );
      case "campaign-completed":
        return (
          <div className="flex flex-col gap-2">
            <p className="max-w-70 text-sm leading-relaxed text-muted-foreground">
              Your campaign "{data?.campaignName}" completed.
              <Link
                href={`/dashboard/campaign/${data?.campaignId}`}
                onClick={close}
                className="ml-1 text-primary underline underline-offset-4 hover:opacity-80"
              >
                Show campaign
              </Link>
            </p>
          </div>
        );
    }
  }, []);
  if (isLoading) return <RateupLoader />;
  if (data?.length === 0) return <NothingFound text="No notifications found" />;

  return (
    <div className="h-full flex flex-col gap-4">
      <ScrollArea className="h-[calc(100vh-180px)] px-2">
        <div className="flex flex-col gap-1">
          {data?.map((notification) => (
            <div
              key={notification?.id}
              className="rounded-lg border border-border bg-muted/40 p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {getNotificationIcon(notification?.source)}

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      {getNotificationMessageComp(notification)}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {formatToRelativeTime(notification?.createdAt)}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => deleteNotificationMut.mutate(notification?.id)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Dismiss notification"
                >
                  <IconX className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default NotificationList;
