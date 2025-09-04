"use client";

import { Checkbox, ColorSwatch, Text } from "@mantine/core";
import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/Table/data-table-column-header";

import { LabelForm } from "../data/schema";
import { DataTableRowActions } from "./data-table-row-actions";

export const columns: ColumnDef<LabelForm>[] = [
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
    accessorKey: "color",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Color" />
    ),
    cell: ({ row }) => {
      return <ColorSwatch color={row.getValue("color") ?? "#009790"} />;
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
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
