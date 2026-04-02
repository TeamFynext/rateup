"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { modals } from "@mantine/modals";
import { IconChevronDown } from "@tabler/icons-react";
import { Edit, Trash } from "lucide-react";
import { useExtracted } from "next-intl";

import { PAGE_SIZE } from "@/utils/constants";

import {
  useContactGroupById,
  useDeleteGroupMutation,
} from "../../backend/campaign/contactGroup/contactGroup.query";
import { RateupButtonPrimary } from "../Button/RateupButtons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import CreateGroupModal from "./CreateGroupModal";

const ContactGroupMenu = ({ groupId }) => {
  const [openedEditModal, setOpenedEditModal] = useState(false);
  const { data } = useContactGroupById(groupId?.toString(), openedEditModal, {
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });

  const deleteGroupMutation = useDeleteGroupMutation();
  const router = useRouter();
  const translations = useExtracted();
  const openDeleteModal = (e) => {
    e.stopPropagation();
    modals.openConfirmModal({
      title: translations("Delete Group"),
      centered: true,
      children: (
        <p className="text-sm">
          {translations(
            "Are you sure you want to delete this group? This action is destructive and you will have to contact support to restore your data.",
          )}
        </p>
      ),
      labels: { confirm: translations("Ok"), cancel: translations("cancel") },
      confirmProps: { color: "red" },
      onCancel: () => modals.closeAll(),
      onConfirm: () => deleteContactGroup(),
    });
  };
  const deleteContactGroup = () => {
    deleteGroupMutation.mutate(groupId, {
      onSuccess: () => {
        router.push("/dashboard/contacts?tab=groups");
      },
    });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <RateupButtonPrimary
          title={translations("Select action")}
          variant="light"
          rightIcon={<IconChevronDown size="1rem" />}
          size="xs"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            setOpenedEditModal(true);
          }}
        >
          <Edit />
          {translations("Edit")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem color="red" onClick={openDeleteModal}>
          <Trash />
          {translations("Delete contact Group")}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <CreateGroupModal
        opened={openedEditModal}
        setOpened={setOpenedEditModal}
        isEdit={true}
        groupDetails={data}
      />
    </DropdownMenu>
  );
};

export default ContactGroupMenu;
