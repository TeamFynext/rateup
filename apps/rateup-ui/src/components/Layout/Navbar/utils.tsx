import type { QueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import type { orgWsMessage } from "@/types/global";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

export const handleWebSocketMessage = ({
  newMessagePayload,
  queryClient,
  userId,
}: {
  newMessagePayload: orgWsMessage;
  queryClient: QueryClient;
  userId: string | undefined;
}) => {
  // Handle WhatsApp message status update
  if (newMessagePayload.type === "message_status_update") {
    const { message_status_update } = newMessagePayload;
    queryClient.setQueriesData(
      {
        queryKey: ["wa-messages", message_status_update?.contactId],
        exact: false,
      },
      (old: any) => {
        if (!old) return old;
        // Update the stats for the matching messageId
        return {
          ...old,
          pages: (old.pages ?? []).map((page) => ({
            ...page,
            messages: (page.messages ?? []).map((msg) =>
              msg.messageId === message_status_update.messageId
                ? { ...msg, stats: message_status_update.stats }
                : msg,
            ),
          })),
        };
      },
    );
    return;
  }

  // Only handle inbox type
  if (newMessagePayload.type !== "inbox") return;

  const { inbox } = newMessagePayload;
  const { message: newMessage, contact } = inbox;
  const contactId = contact.id;

  const urlParams = new URLSearchParams(globalThis.location?.search);
  const urlContactId = urlParams.get("contactId");
  const urlTab = urlParams.get("tab");
  // If tab is "mine" and user is not assigned, ignore
  if (
    urlTab === "mine" &&
    !contact?.waInboxAssign?.some((assign) => assign.assignedUser.id === userId)
  )
    return;

  // Update filtered contacts list if tab is present
  if (urlTab) {
    queryClient.setQueriesData(
      { queryKey: ["contacts", "filtered"], exact: false },
      (old: any) => {
        if (!old || !Array.isArray(old.pages)) return old;

        let contactFound = false;
        const updatedPages = old.pages.map((page) => {
          const updatedRows = (page.rows ?? []).map((row) => {
            if (row.id === contactId) {
              contactFound = true;
              return {
                ...row,
                lastMessage: newMessage,
                lastReceivedMessageTimeStamp:
                  contact.lastReceivedMessageTimeStamp,
                waMessageAssignStatus: contact.waMessageAssignStatus,
                assignedUsers: contact.waInboxAssign?.map((assign) => ({
                  id: assign.assignedUser.id,
                  name: assign.assignedUser.name,
                })),
              };
            }
            return row;
          });
          return { ...page, rows: updatedRows };
        });

        // If contact not found, add to first page or create new page
        if (!contactFound) {
          const newContactRow = {
            id: contactId,
            lastMessage: newMessage,
            lastReceivedMessageTimeStamp: contact.lastReceivedMessageTimeStamp,
            name: contact.name,
            phone: contact.phone,
            waMessageAssignStatus: contact.waMessageAssignStatus,

            assignedUsers: contact.waInboxAssign?.map((assign) => ({
              id: assign.assignedUser.id,
              name: assign.assignedUser.name,
            })),
          };
          if (updatedPages.length > 0) {
            updatedPages[0] = {
              ...updatedPages[0],
              rows: [newContactRow, ...(updatedPages[0].rows ?? [])],
            };
          } else {
            updatedPages.push({ rows: [newContactRow] });
          }
        }

        return { ...old, pages: updatedPages };
      },
    );
  }

  // Only update wa-messages if viewing the correct contact
  if (!urlContactId || urlContactId !== contactId) return;

  queryClient.setQueriesData(
    { queryKey: ["wa-messages", contactId], exact: false },
    (old: any) => {
      if (!old) return old;
      const firstMessage = old.pages?.[0]?.messages?.[0];
      // Avoid duplicate if already present
      if (firstMessage?.messageId === newMessage.messageId) return old;

      const updatedFirstPage = {
        ...(old?.pages?.[0] ?? {}),
        messages: [newMessage, ...(old?.pages?.[0]?.messages ?? [])],
      };

      return {
        ...old,
        pages: [updatedFirstPage, ...(old?.pages?.slice(1) ?? [])],
      };
    },
  );
};

export const WhatsAppSettingsModal = ({ opened, onClose, intendedRoute }) => {
  const navigate = useNavigate();
  return (
    <Dialog open={opened} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>WhatsApp Account Required</DialogTitle>
        </DialogHeader>
        <div className="text-sm mb-4">
          You don&apos;t have any WhatsApp account configured. Please set up
          your WhatsApp account to access this feature.
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              if (intendedRoute)
                navigate({
                  to: intendedRoute,
                });
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onClose();
              navigate({
                to: "/dashboard/settings/channels",
              });
            }}
          >
            Go to WhatsApp Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
