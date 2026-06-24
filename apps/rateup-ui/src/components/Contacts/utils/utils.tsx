import { Box, Select } from "@mantine/core";
import { IconBrandInstagram } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import {
  ArrowUpDown,
  Ban,
  CircleCheck,
  CircleX,
  Gift,
  Globe,
  MessageSquare,
  Upload,
  UserPlus,
  Zap,
} from "lucide-react";
import React from "react";

import type { CustomFieldData } from "@/backend/campaign/contacts/contacts.api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { getInitials } from "@/components/ui/utils.ts";

const selectCheckBox: ColumnDef<any>[] = [
  {
    id: "select",
    accessorKey: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
];

const HeaderWithSort = ({ column, title }) => {
  return (
    <div className="flex gap-2 items-center">
      <span>{title}</span>
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        <ArrowUpDown className="h-4 w-4" />
      </Button>
    </div>
  );
};

const contactDetailsColumn: ColumnDef<any>[] = [
  {
    header: ({ column }) => <HeaderWithSort column={column} title={"Name"} />,
    accessorKey: "name",
    cell: (info) => (
      <div className="flex gap-1 items-center">
        <Avatar>
          <AvatarFallback className="rounded-lg bg-blue-200 text-rateup-blue p-1 text-xs">
            {getInitials(info?.getValue() as string)}
          </AvatarFallback>
        </Avatar>
        <span>{info?.getValue() as string}</span>
      </div>
    ),
    enableSorting: true,
    meta: { title: "Name" },
  },
];

export const getSourceBadge = (source: string) => {
  const config = {
    whatsapp: {
      icon: MessageSquare,
      label: "WhatsApp",
      className: "bg-green-100 text-green-700",
    },
    instagram: {
      icon: IconBrandInstagram,
      label: "Instagram",
      className: "bg-pink-100 text-pink-700",
    },
    WEBCHAT: {
      icon: Globe,
      label: "Web Chat",
      className: "bg-blue-100 text-blue-700",
    },
    MANUAL: {
      icon: UserPlus,
      label: "Manual",
      className: "bg-gray-100 text-gray-700",
    },
    "CSV IMPORT": {
      icon: Upload,
      label: "Imported",
      className: "bg-gray-100 text-gray-700",
    },
    loyalty_program: {
      icon: Gift,
      label: "Loyalty Customer",
      className: "bg-orange-100 text-orange-700",
    },
  };
  const sourceConfig = config[source as keyof typeof config] ?? config.MANUAL;
  const { icon: Icon, label, className } = sourceConfig;
  return (
    <Badge variant="outline" className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
};

export const contactColumn = (contactTags: CustomFieldData[] = [], showLifecycle = false) => {
  return [
    ...selectCheckBox,
    ...contactDetailsColumn,
    {
      header: "Phone/IGSID",
      accessorKey: "phone",
      cell: (info) => info.getValue(),
      id: "phone",
      enableSorting: false,
      meta: { title: "Phone/IGSID" },
    },
    {
      header: "Status",
      accessorKey: "blockedOnWhatsApp",
      cell: (info) =>
        !info.getValue() ? (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <Zap />
            Active
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            <Ban />
            Blocked
          </Badge>
        ),
      id: "blockedOnWhatsApp",
      enableSorting: false,
      meta: { title: "Status" },
    },
    {
      header: "Other",
      accessorKey: "other",
      cell: (info) => info.getValue() ?? "-",
      id: "other",
      enableSorting: false,
      meta: { title: "Other" },
    },
    {
      header: "Label",
      accessorKey: "ContactLabelMap",
      id: "ContactLabelMap",
      cell: (info) => {
        const labels = info.row.original.ContactLabelMap?.map((label) => label?.label?.name) || [];
        return labels.length > 0 ? (
          <Box style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {labels.map((label, index) => (
              <Badge key={index} variant="secondary" color="blue">
                {label}
              </Badge>
            ))}
          </Box>
        ) : (
          "-"
        );
      },
      enableSorting: false,
      meta: { title: "Label" },
    },
    ...(showLifecycle
      ? [
          {
            header: "Lifecycle Stage",
            accessorKey: "Lifecycle.name",
            cell: (info) => info.getValue(),
            enableSorting: false,
            meta: { title: "Lifecycle Stage" },
          },
        ]
      : []),
    ...(contactTags?.length > 0
      ? contactTags
          .filter((tag) => tag?.visibility)
          .map((data) => ({
            header: data?.name,
            accessorFn: (row) => row?.customFields?.find((f) => f?.fieldId === data?.id)?.value,
            id: data?.name,
            cell: (info) => info.getValue()?.toString() ?? "-",

            enableSorting: false,
            meta: { title: data?.name },
          }))
      : []),
    {
      header: "Source",
      accessorKey: "source",
      id: "source",
      cell: (info) => getSourceBadge((info?.getValue() as string) || "MANUAL"),
      enableSorting: false,
      meta: { title: "Source" },
    },
    {
      header: "Consent",
      accessorKey: "consent",
      id: "consent",
      cell: (info) =>
        info.getValue() ? (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CircleCheck />
            Granted
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-red-100 text-red-700">
            <CircleX />
            Denied
          </Badge>
        ),
      meta: {
        filterComponent: (setFilterValue) => {
          return (
            <Select
              data={["true", "false"]}
              placeholder="Select"
              onChange={(e) => setFilterValue(e === null ? null : e === "true")}
            />
          );
        },
        title: "Consent",
      },
      enableSorting: false,
    },
    {
      header: ({ column }) => <HeaderWithSort column={column} title={"Date Added"} />,
      accessorKey: "createdAt",
      id: "createdAt",
      cell: (info) => dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
      enableSorting: true,
      meta: { title: "Date Added" },
    },
    {
      header: ({ column }) => <HeaderWithSort column={column} title={"Last Contact"} />,
      accessorKey: "lastMessageWaCreatedAt",
      id: "lastMessageWaCreatedAt",
      cell: (info) =>
        info.getValue() ? dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A") : "",
      enableSorting: true,
      meta: { title: "Last Contact" },
    },
  ];
};

export const CONTACT_SORT = { id: "createdAt", desc: true };
