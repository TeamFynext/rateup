"use client";

import { ActionIcon, Menu, rem } from "@mantine/core";
import {
  IconCopy,
  IconDots,
  IconEdit,
  IconHeart,
  IconTrash,
} from "@tabler/icons-react";
import { Row } from "@tanstack/react-table";

import { labels } from "./data/data";
import { taskSchema } from "./data/schema";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const task = taskSchema.parse(row.original);

  return (
    <Menu shadow="md" width={160} position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" size="sm" aria-label="Open menu">
          <IconDots style={{ width: rem(16), height: rem(16) }} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconEdit style={{ width: rem(14), height: rem(14) }} />}
        >
          Edit
        </Menu.Item>
        <Menu.Item
          leftSection={<IconCopy style={{ width: rem(14), height: rem(14) }} />}
        >
          Make a copy
        </Menu.Item>
        <Menu.Item
          leftSection={
            <IconHeart style={{ width: rem(14), height: rem(14) }} />
          }
        >
          Favorite
        </Menu.Item>

        <Menu.Divider />

        <Menu.Label>Labels</Menu.Label>
        {labels.map((label) => (
          <Menu.Item key={label.value}>{label.label}</Menu.Item>
        ))}

        <Menu.Divider />

        <Menu.Item
          color="red"
          leftSection={
            <IconTrash style={{ width: rem(14), height: rem(14) }} />
          }
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
