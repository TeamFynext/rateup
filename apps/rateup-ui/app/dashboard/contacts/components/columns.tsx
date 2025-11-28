"use client";

import { Checkbox, ColorSwatch, Text } from "@mantine/core";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";

import { CustomFieldData } from "@/backend/campaign/contacts/contacts.api";
import { DataTableColumnHeader } from "@/components/Table/data-table-column-header";

import { DataTableRowActions } from "./data-table-row-actions";

export const columns: ColumnDef<CustomFieldData>[] = [
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
    header: "Name",
    cell: ({ row }) => (
      <Text size="sm" style={{ width: 80 }}>
        {String(row.getValue("name"))}
      </Text>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "slug",
    header: "Field ID",
    cell: ({ row }) => {
      return <Text size="sm">{String(row.getValue("slug"))}</Text>;
    },
  },
  {
    accessorKey: "description",
    header: "Description",
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
    header: "Visibility",
    cell: ({ row }) => {
      return <Text size="sm">{String(row.getValue("visibility"))}</Text>;
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      return <Text size="sm">{String(row.getValue("type"))}</Text>;
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      return (
        <Text size="sm">
          {dayjs(row.getValue("createdAt")).format("DD/MM/YYYY")}
        </Text>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
