"use client";

import { ActionIcon, Menu, rem, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";
import { Row } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { useDeleteLabelMutation } from "@/backend/label/label.query";
import { showLoadingToast } from "@/utils/notifications";

import { useEditLabelsCtx } from "./edit-label-context";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: Readonly<DataTableRowActionsProps<TData>>) {
  const deleteLabelMutation = useDeleteLabelMutation();
  const t = useTranslations();
  const { open, setLabel } = useEditLabelsCtx();

  const openModal = () =>
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
    deleteLabelMutation.mutate((row.original as any)?.id);
    showLoadingToast(
      t("Contact labels updated successfully"),
      "c-label",
      true,
      t("Loading"),
    );
  };
  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLabel(row.original);
    open();
  };

  return (
    <Menu shadow="md" width={160} position="bottom-end" withArrow>
      <Menu.Target>
        <ActionIcon variant="subtle" size="sm" aria-label="Open menu">
          <IconDots style={{ width: rem(16), height: rem(16) }} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconEdit style={{ width: rem(14), height: rem(14) }} />}
          onClick={handleEdit}
        >
          Edit
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          color="red"
          leftSection={
            <IconTrash style={{ width: rem(14), height: rem(14) }} />
          }
          onClick={openModal}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
