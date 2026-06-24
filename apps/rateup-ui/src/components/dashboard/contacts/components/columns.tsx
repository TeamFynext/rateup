import { Checkbox, Text } from "@mantine/core";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";

import type { CustomFieldData } from "@/backend/campaign/contacts/contacts.api";
import { DataTableColumnHeader } from "@/components/Table/data-table-column-header.tsx";

import { DataTableRowActions } from "./data-table-row-actions.tsx";

export const columns: ColumnDef<CustomFieldData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onChange={(event) => table.toggleAllPageRowsSelected(!!event.currentTarget.checked)}
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <Text size="sm" style={{ width: 80 }}>
        {String(row.getValue("name"))}
      </Text>
    ),
    enableHiding: false,
    meta: { title: "Name" },
  },
  {
    accessorKey: "slug",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Field ID" />,
    cell: ({ row }) => {
      return <Text size="sm">{String(row.getValue("slug"))}</Text>;
    },
    meta: { title: "Field ID" },
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
    meta: { title: "Description" },
  },
  {
    accessorKey: "visibility",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Visibility" />,
    cell: ({ row }) => {
      return <Text size="sm">{String(row.getValue("visibility"))}</Text>;
    },
    meta: { title: "Visibility" },
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      return <Text size="sm">{String(row.getValue("type"))}</Text>;
    },
    meta: { title: "Type" },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created At" />,
    cell: ({ row }) => {
      return <Text size="sm">{dayjs(row.getValue("createdAt")).format("DD/MM/YYYY")}</Text>;
    },
    meta: { title: "Created At" },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
    meta: { title: "Actions" },
  },
];
