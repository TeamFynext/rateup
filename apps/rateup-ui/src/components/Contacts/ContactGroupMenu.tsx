import { modals } from "@mantine/modals";
import { IconChevronDown } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { Edit, Trash } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useContactGroupById,
  useDeleteGroupMutation,
} from "@/backend/campaign/contactGroup/contactGroup.query";
import { PAGE_SIZE } from "@/utils/constants.ts";

import { RateupButtonPrimary } from "../Button/RateupButtons.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import CreateGroupModal from "./CreateGroupModal.tsx";

const ContactGroupMenu = ({ groupId }) => {
  const [openedEditModal, setOpenedEditModal] = useState(false);
  const { data } = useContactGroupById(groupId?.toString(), openedEditModal, {
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });

  const deleteGroupMutation = useDeleteGroupMutation();
  const navigate = useNavigate();
  const { t: translations } = useTranslation();
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
        navigate({
          to: "/dashboard/contacts?tab=groups",
        });
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
