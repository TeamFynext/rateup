"use client";

import { Badge, Checkbox, Flex, Group, Text } from "@mantine/core";
import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/Table/data-table-column-header";

import { DataTableRowActions } from "./data-table-row-actions";
import { labels, priorities, statuses } from "./data/data";
import { Task } from "./data/schema";

export const columns: ColumnDef<Task>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onChange={(event) =>
          table.toggleAllPageRowsSelected(!!event.currentTarget.checked)
        }
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={(event) => row.toggleSelected(!!event.currentTarget.checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Task" />
    ),
    cell: ({ row }) => (
      <Text size="sm" style={{ width: 80 }}>
        {String(row.getValue("id"))}
      </Text>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => {
      const label = labels.find((label) => label.value === row.original.label);

      return (
        <Group gap="sm">
          {label && <Badge variant="outline">{label.label}</Badge>}
          <Text size="sm" fw={500} truncate style={{ maxWidth: 500 }}>
            {String(row.getValue("title"))}
          </Text>
        </Group>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue("status"),
      );

      if (!status) {
        return null;
      }

      return (
        <Flex gap="sm" style={{ width: 120 }}>
          {status.icon && <status.icon size={16} />}
          <Text size="sm">{status.label}</Text>
        </Flex>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priority" />
    ),
    cell: ({ row }) => {
      const priority = priorities.find(
        (priority) => priority.value === row.getValue("priority"),
      );

      if (!priority) {
        return null;
      }

      return (
        <Group gap="sm">
          {priority.icon && <priority.icon size={16} />}
          <Text size="sm">{priority.label}</Text>
        </Group>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
