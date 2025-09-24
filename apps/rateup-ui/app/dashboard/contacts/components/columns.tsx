"use client";

import { Checkbox, ColorSwatch, Text } from "@mantine/core";
import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/Table/data-table-column-header";

import { DataTableRowActions } from "./data-table-row-actions";

export const columns: ColumnDef<any>[] = [
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
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <Text size="sm" style={{ width: 80 }}>
        {String(row.getValue("name"))}
      </Text>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "field_id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Field ID" />
    ),
    cell: ({ row }) => {
      return <Text size="sm">{String(row.getValue("field_id"))}</Text>;
    },
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => {
      const description: string = row.getValue("description");
      return (
        <Text size="sm" style={{ maxWidth: 500 }} truncate>
          {description}
        </Text>
      );
    },
  },
  {
    accessorKey: "visibility",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Visibility" />
    ),
    cell: ({ row }) => {
      return <Text size="sm">{String(row.getValue("visibility"))}</Text>;
    },
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      return <Text size="sm">{String(row.getValue("type"))}</Text>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => {
      return <Text size="sm">{String(row.getValue("created_at"))}</Text>;
    },
  },
  // {
  //   id: "actions",
  //   cell: ({ row }) => <DataTableRowActions row={row} />,
  // },
];
