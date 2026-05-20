"use client";

import { useEffect, useMemo, useState } from "react";

import { Group, Text } from "@mantine/core";
import { IconExclamationCircle, IconPaperclip } from "@tabler/icons-react";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useGetAssignedUserForContact } from "@/backend/whatsapp/inbox/message/wamessage.query";
import { useUser } from "@/context/UserContext.tsx";
import {
  useContactsStore,
  useMessagesStore,
} from "@/components/dashboard/inbox/store.ts";

import WaInboxChatDisplayBody from "./chatdisplayBody/index.tsx";
import WaInboxChatDisplayFooter, {
  WaInboxAssignUserFooter,
  WaInboxBlockedContactFooter,
} from "./chatdisplayFooter/index.tsx";
import WaInboxChatDisplayHeader from "./chatdisplayHeader/index.tsx";
import WaInboxContactDetails from "./contactDetails.tsx";

export default function WaInboxChatDisplay({
  smallScreen = false,
  waSettings,
}: Readonly<{
  smallScreen?: boolean;
  waSettings?: any;
}>) {
  const contact = useContactsStore((s) => s.selectedContact);
  const [isDragging, setIsDragging] = useState(false);

  const { updateContactById } = useContactsStore();
  const { user } = useUser();
  const isAssignedToMe = useMemo(
    () =>
      contact && !!contact.assignedUsers?.find((c) => c.id === user?.userId),
    [contact, user],
  );

  const { t: translations } = useTranslation();
  const { isLoading } = useMessagesStore();
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const contactId = contact?.id;
  const { data: assignedUserList } = useGetAssignedUserForContact(contactId);
  const MAX_FILES = 10;
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!contact) return;

    const files = e.dataTransfer?.files;
    if (!files?.length) return;

    const fileArray = Array.from(files);

    if (fileArray.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files only`);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("editor-file-drop", {
        detail: fileArray,
      }),
    );
  };
  useEffect(() => {
    if (!contact?.id || !assignedUserList) return;

    const mapped = assignedUserList.map((a) => ({
      id: a.assignedUserId,
      name: a.assignedUser?.name,
      teamId: a.teamId,
    }));

    updateContactById(contact.id, (prev) => {
      if (
        prev.assignedUsers?.length === mapped.length &&
        prev.assignedUsers?.every((u, i) => u.id === mapped[i].id)
      ) {
        return prev;
      }

      return {
        ...prev,
        assignedUsers: mapped,
      };
    });
  }, [assignedUserList, contact?.id]);

  let footerContent = null;
  if (contact?.blockedOnWhatsApp) {
    footerContent = <WaInboxBlockedContactFooter contact={contact} />;
  } else if (!contact?.assignedUsers?.length) {
    footerContent = <WaInboxAssignUserFooter contact={contact} user={user} />;
  } else if (isAssignedToMe) {
    footerContent = <WaInboxChatDisplayFooter contact={contact} />;
  } else {
    footerContent = (
      <Group
        bg={"black"}
        justify="center"
        c={"white"}
        color="white"
        gap={2}
        py={2}
      >
        <IconExclamationCircle size={"1rem"} />
        <Text size="xs">This chat is not assigned to you</Text>
      </Group>
    );
  }
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) {
        setIsDragging(false);
      }
    };

    const handleDrop = () => {
      setIsDragging(false);
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  useEffect(() => {
    const resetDragging = () => setIsDragging(false);

    window.addEventListener("mouseup", resetDragging);
    window.addEventListener("blur", resetDragging);

    return () => {
      window.removeEventListener("mouseup", resetDragging);
      window.removeEventListener("blur", resetDragging);
    };
  }, []);

  return (
    <div
      className="h-full relative"
      onDragOver={(e) => {
        if (!contact) return;
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault();
      }}
      onDrop={handleDrop}
    >
      {!contact ? (
        <div className="flex-1 flex items-center justify-center bg-muted/20 h-full">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="mb-2">
              {translations("Select a chat to see messages")}
            </h3>
          </div>
        </div>
      ) : (
        <div className={`flex min-w-0 h-full flex-1}`}>
          <div className="flex-1 flex flex-col min-w-0">
            <WaInboxChatDisplayHeader
              contact={contact}
              smallScreen={smallScreen}
              waSettings={waSettings}
            />
            <WaInboxChatDisplayBody
              smallScreen={smallScreen}
              isContactDetailsOpened={showCustomerInfo}
            />
            {!isLoading && footerContent}
          </div>
          <WaInboxContactDetails
            contact={contact}
            groupId={""}
            isOpen={showCustomerInfo}
            setIsOpen={setShowCustomerInfo}
          />
        </div>
      )}
      {isDragging && contact && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm border-2 border-dashed border-primary">
          <div className="flex flex-col items-center gap-3 text-white">
            <IconPaperclip size={48} />
            <Text size="lg" fw={600}>
              Drop files to upload
            </Text>
            <Text size="sm" opacity={0.8}>
              Images, videos, audio or documents
            </Text>
            <Text size="xs" opacity={0.7}>
              Maximum {MAX_FILES} files
            </Text>
          </div>
        </div>
      )}
    </div>
  );
}
