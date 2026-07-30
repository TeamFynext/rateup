import type { ColumnDef } from "@tanstack/react-table";
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";

import type { ContactLabelOption } from "@/backend/campaign/contacts/contacts.api";
import { createSortableHeader } from "@/components/Table/data-table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

/** Alias for the labels endpoint's row shape, kept for readability here. */
export type ContactLabel = ContactLabelOption;

interface ColumnsProps {
  onEdit: (label: ContactLabel) => void;
  onDelete: (label: ContactLabel) => void;
}

const LabelCell = ({ label }: { label: ContactLabel }) => (
  <div className="flex items-center space-x-2">
    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
    <span className="font-medium">{label.name}</span>
  </div>
);

const DescriptionCell = ({ description }: { description: string | null }) => (
  <span className="text-gray-600">{description || "No description"}</span>
);

const ContactsCell = ({ count }: { count: number }) => <Badge variant="secondary">{count}</Badge>;

const DateCell = ({ date }: { date: string }) => <span>{new Date(date).toLocaleDateString()}</span>;

const ActionsCell = ({
  label,
  onEdit,
  onDelete,
}: {
  label: ContactLabel;
  onEdit: (label: ContactLabel) => void;
  onDelete: (label: ContactLabel) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
      <span className="sr-only">Open menu</span>
      <MoreHorizontal className="h-4 w-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => onEdit(label)}>
        <Edit2 className="mr-2 h-4 w-4" />
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onDelete(label)} className="text-red-600">
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export const createColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<ContactLabel>[] => [
  {
    accessorKey: "name",
    header: createSortableHeader("Label"),
    cell: ({ row }) => <LabelCell label={row.original} />,
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => <DescriptionCell description={row.getValue("description")} />,
  },
  {
    accessorKey: "_count.contactLabels",
    header: createSortableHeader("Contacts"),
    cell: ({ row }) => <ContactsCell count={row.original._count.contactLabels} />,
  },
  {
    accessorKey: "createdAt",
    header: createSortableHeader("Created"),
    cell: ({ row }) => <DateCell date={row.getValue("createdAt")} />,
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell label={row.original} onEdit={onEdit} onDelete={onDelete} />,
  },
];
