"use client";

import { useState } from "react";

import { ActionIcon, Menu, rem, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { useDeleteCustomFieldMutation } from "@/backend/campaign/contacts/contacts.query";

import { EditModal } from "./edit-modal";

interface DataTableRowActionsProps<TData> {
  row: {
    original: TData;
  };
}

export function DataTableRowActions<TData>({
  row,
}: Readonly<DataTableRowActionsProps<TData>>) {
  const deleteCustomFieldMutation = useDeleteCustomFieldMutation();
  const t = useTranslations();
  const [editOpen, setEditOpen] = useState(false);

  const openDeleteModal = () =>
    modals.openConfirmModal({
      title: t("Are you sure you want to delete this label?"),
      children: (
        <Text size="sm">
          {t("This action is irreversible. Please confirm your action.")}
        </Text>
      ),
      labels: { confirm: t("Confirm"), cancel: t("Cancel") },
      onConfirm: handleDelete,
      confirmProps: { color: "red" },
      centered: true,
    });

  const handleDelete = () => {
    deleteCustomFieldMutation.mutate((row.original as any)?.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditOpen(true);
  };

  return (
    <>
      <Menu shadow="md" width={160} position="bottom-end" withArrow>
        <Menu.Target>
          <ActionIcon variant="subtle" size="sm" aria-label="Open menu">
            <IconDots style={{ width: rem(16), height: rem(16) }} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            leftSection={
              <IconEdit style={{ width: rem(14), height: rem(14) }} />
            }
            onClick={handleEdit}
          >
            {t("Edit")}
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item
            color="red"
            leftSection={
              <IconTrash style={{ width: rem(14), height: rem(14) }} />
            }
            onClick={openDeleteModal}
          >
            {t("Delete")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <EditModal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        data={row.original}
      />
    </>
  );
}
