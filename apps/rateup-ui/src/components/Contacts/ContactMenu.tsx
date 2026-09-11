import {
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconInbox,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useContactDeleteMutation } from "@/backend/campaign/contacts/contacts.query";
import { useContactTableStore } from "@/components/dashboard/contacts/store/contact-table-store.ts";
import { useConfirm } from "@/context/confirm-provider";

import { Button } from "../ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import CreateOrEditContactModal from "./CreatOrEditContactModal.tsx";
import SendMessageModal from "./SendMessageModal.tsx";

const ContactMenu = ({ contact, groupId }: { contact: ContactsData; groupId: string }) => {
  const { t: translations } = useTranslation();
  const confirm = useConfirm();
  // Opening the details dialog is publishing the row — `ContactDetailHost` renders it.
  const setSelectedContact = useContactTableStore((state) => state.setSelectedContact);
  const [openedEditModal, setOpenedEditModal] = useState(false);
  const openDeleteModal = async () => {
    const ok = await confirm({
      title: translations("Delete contact"),
      description: translations("Are you sure you want to delete this contact?"),
      confirmText: "Ok",
      cancelText: "cancel",
    });
    if (!ok) return;
    deleteContact();
  };
  const deleteMutation = useContactDeleteMutation(groupId);
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const deleteContact = () => {
    deleteMutation.mutate(contact?.id);
  };
  const { ContactLabelMap, contactGroups, waInboxAssign, ...rest } = contact;
  const initialValues = {
    ...rest,
    labels: ContactLabelMap ? ContactLabelMap.map((c) => c.label?.id) : [],
    contactGroupIds:
      contactGroups?.map((g: { contactGroup?: { id?: string } }) => g?.contactGroup?.id) || [],
    assignedUserIds: waInboxAssign?.map((a) => a.assignedUser?.id) || [],
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" />}>
        <IconDotsVertical />
      </DropdownMenuTrigger>
      {/* The popup defaults to `w-(--anchor-width)`, and the anchor here is a bare icon button —
          every label wrapped. Sized to its content instead, and pinned to the row's right edge. */}
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        <DropdownMenuItem
          onClick={() => {
            setSelectedContact(contact);
          }}
        >
          <IconEye className="w-4 h-4 mr-2" />
          {translations("View Details")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setOpenedEditModal(true)}>
          <IconEdit className="w-4 h-4 mr-2" />
          {translations("Edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setIsSendMessageOpen(true)}>
          <IconSend className="w-4 h-4 mr-2" />
          {translations("Send Message")}
        </DropdownMenuItem>
        {/* The inbox resolves `?contactId=` to the contact's thread and selects it, whichever
            tab is showing, then strips the parameter back out of the URL. */}
        <DropdownMenuItem
          render={<Link to="/dashboard/inbox" search={{ tab: "open", contactId: contact.id }} />}
        >
          <IconInbox className="w-4 h-4 mr-2" />
          {translations("Open in Inbox")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={openDeleteModal} className="text-red-500">
          <IconTrash className="text-red-500 w-4 h-4 mr-2" />
          {translations("Delete contact")}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <CreateOrEditContactModal
        opened={openedEditModal}
        setOpened={setOpenedEditModal}
        initialValues={initialValues}
      />
      <SendMessageModal
        opened={isSendMessageOpen}
        setOpened={setIsSendMessageOpen}
        selectedContact={contact}
      />
    </DropdownMenu>
  );
};

export default ContactMenu;
