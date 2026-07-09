import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";

import type { CustomFieldData } from "@/backend/campaign/contacts/contacts.api";
import { DataTableColumnHeader } from "@/components/Table/data-table-column-header.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";

import { DataTableRowActions } from "./data-table-row-actions.tsx";

export const columns: ColumnDef<CustomFieldData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(!!checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(!!checked)}
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
      <span className="block text-sm" style={{ width: 80 }}>
        {String(row.getValue("name"))}
      </span>
    ),
    enableHiding: false,
    meta: { title: "Name" },
  },
  {
    accessorKey: "slug",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Field ID" />,
    cell: ({ row }) => {
      return <span className="text-sm">{String(row.getValue("slug"))}</span>;
    },
    meta: { title: "Field ID" },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description: string = row.getValue("description");
      return (
        <span className="block truncate text-sm" style={{ maxWidth: 500 }}>
          {description}
        </span>
      );
    },
    meta: { title: "Description" },
  },
  {
    accessorKey: "visibility",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Visibility" />,
    cell: ({ row }) => {
      return <span className="text-sm">{String(row.getValue("visibility"))}</span>;
    },
    meta: { title: "Visibility" },
  },
  {
    accessorKey: "type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      return <span className="text-sm">{String(row.getValue("type"))}</span>;
    },
    meta: { title: "Type" },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created At" />,
    cell: ({ row }) => {
      return (
        <span className="text-sm">{dayjs(row.getValue("createdAt")).format("DD/MM/YYYY")}</span>
      );
    },
    meta: { title: "Created At" },
  },
  {
    id: "actions",
    cell: ({ row }) => <DataTableRowActions row={row} />,
    meta: { title: "Actions" },
  },
];
