"use client";

import React from "react";

import { Menu } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import {
  useDeleteLoyaltyAction,
  useUpdateLoyaltyAction,
} from "@/backend/loyalty/actions/actions.query";
import ConfirmationModal from "@/components/Modal/ConfirmationModal";

const LoyaltyActionMenu = ({ action }) => {
  const translations = useTranslations();
  const deleteMutation = useDeleteLoyaltyAction(action.id);
  const updateMut = useUpdateLoyaltyAction(action.id);
  const [deleteDialogOpened, { open, close }] = useDisclosure();

  function handleDelete() {
    deleteMutation.mutate(null, {
      onSuccess: close,
    });
  }

  function handleActivate() {
    updateMut.mutate({ active: !action.active });
  }
  return (
    <>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconTrash size={"1rem"} color="red" />}
          c={"red"}
          onClick={open}
        >
          {translations("Delete")}
        </Menu.Item>
        <Menu.Item onClick={handleActivate}>
          {action?.active
            ? translations("Deactivate")
            : translations("Activate")}
        </Menu.Item>
      </Menu.Dropdown>
      <ConfirmationModal
        forDeleteFunctionality
        opened={deleteDialogOpened}
        onClose={close}
        headerLabel={translations(
          "Are you sure you want to delete this action?",
        )}
        headerTitle={translations("Delete Action")}
        confirmLabel={translations("Delete")}
        onConfirm={handleDelete}
      />
    </>
  );
};

export default LoyaltyActionMenu;
