import React, { useState } from "react";

import { modals } from "@mantine/modals";
import { Edit, EllipsisVertical, Eye, Send, Trash } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useContactDeleteMutation } from "@/backend/campaign/contacts/contacts.query";

import { Button } from "../ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import AddToGroupModal from "./AddToGroupModal.tsx";
import ContactDetailedView from "./ContactDetailedView.tsx";
import CreateOrEditContactModal from "./CreatOrEditContactModal.tsx";
import SendMessageModal from "./SendMessageModal.tsx";

const ContactMenu = ({ contact, groupId }) => {
  const { t: translations } = useTranslation();
  const [openedEditModal, setOpenedEditModal] = useState(false);
  const openDeleteModal = () => {
    modals.openConfirmModal({
      title: translations("Delete contact"),
      centered: true,
      children: (
        <p className="text-sm">
          {translations("Are you sure you want to delete this contact?")}
        </p>
      ),
      labels: { confirm: "Ok", cancel: "cancel" },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () => deleteContact(),
    });
  };
  const [isAddToGroupOpen, setIsAddToGroupOpen] = useState(false);
  const deleteMutation = useContactDeleteMutation(groupId);
  const [viewDetails, setViewDetails] = useState(false);
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const deleteContact = () => {
    deleteMutation.mutate(contact?.id);
  };
  const {
    ContactLabelMap,
    contactGroups,
    customFields,
    campaignParticipants,
    loyaltyCustomer,
    waInboxAssign,
    ...rest
  } = contact;
  const initialValues = {
    ...rest,
    labels: ContactLabelMap ? ContactLabelMap.map((c) => c.label.id) : [],
    contactGroupIds: contactGroups?.map((g) => g?.contactGroup?.id) || [],
    assignedUserIds: waInboxAssign?.map((a) => a.assignedUserId) || [],
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => {
            setViewDetails(true);
          }}
        >
          <Eye className="w-4 h-4 mr-2" />
          {translations("View Details")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setOpenedEditModal(true)}>
          <Edit className="w-4 h-4 mr-2" />
          {translations("Edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setIsSendMessageOpen(true)}>
          <Send className="w-4 h-4 mr-2" />
          {translations("Send Message")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          color="red"
          onClick={openDeleteModal}
          className="text-red-500"
        >
          <Trash className="text-red-500 w-4 h-4 mr-2" />
          {translations("Delete contact")}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <CreateOrEditContactModal
        opened={openedEditModal}
        setOpened={setOpenedEditModal}
        initialValues={initialValues}
      />
      <ContactDetailedView
        setIsAddToGroupOpen={setIsAddToGroupOpen}
        opened={viewDetails}
        setOpened={setViewDetails}
        selectedContact={contact}
        setIsSendMessageOpen={setIsSendMessageOpen}
      />
      <SendMessageModal
        opened={isSendMessageOpen}
        setOpened={setIsSendMessageOpen}
        selectedContact={contact}
      />
      <AddToGroupModal
        opened={isAddToGroupOpen}
        setOpened={setIsAddToGroupOpen}
        selectedContactIds={[contact.id]}
        contact={contact}
      />
    </DropdownMenu>
  );
};

export default ContactMenu;
