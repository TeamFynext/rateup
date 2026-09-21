import {
  IconArrowsSort,
  IconBan,
  IconBolt,
  IconBrandInstagram,
  IconCircleCheck,
  IconCircleX,
  IconGift,
  IconGlobe,
  IconMessage,
  IconUpload,
  IconUserPlus,
} from "@tabler/icons-react";
import type { Column, ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";

import type { CustomFieldData } from "@/backend/campaign/contacts/contacts.api";
import { useContactTableStore } from "@/components/dashboard/contacts/store/contact-table-store.ts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { getInitials } from "@/components/ui/utils.ts";

/**
 * The name doubles as the row's "View Details" trigger. It only publishes the row to the
 * table store — `ContactDetailHost` renders the single dialog — so this stays a button
 * rather than a per-row copy of the whole modal stack.
 */
const ContactNameCell = ({ contact }: { contact: ContactsData }) => {
  const setSelectedContact = useContactTableStore((state) => state.setSelectedContact);
  return (
    <button
      type="button"
      onClick={() => setSelectedContact(contact)}
      className="group flex gap-1 items-center text-left cursor-pointer"
    >
      <Avatar>
        <AvatarFallback className="rounded-lg bg-blue-200 dark:bg-blue-900/60 text-primary p-1 text-xs">
          {getInitials(contact?.name)}
        </AvatarFallback>
      </Avatar>
      <span className="group-hover:underline">{contact?.name}</span>
    </button>
  );
};

const selectCheckBox: ColumnDef<ContactsData>[] = [
  {
    id: "select",
    accessorKey: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
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

const HeaderWithSort = ({ column, title }: { column: Column<ContactsData>; title: string }) => {
  return (
    <div className="flex gap-2 items-center">
      <span>{title}</span>
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        <IconArrowsSort className="h-4 w-4" />
      </Button>
    </div>
  );
};

const contactDetailsColumn: ColumnDef<ContactsData>[] = [
  {
    header: ({ column }) => <HeaderWithSort column={column} title={"Name"} />,
    accessorKey: "name",
    cell: ({ row }) => <ContactNameCell contact={row.original} />,
    enableSorting: true,
    meta: { title: "Name" },
  },
];

export const getSourceBadge = (source: string | null | undefined) => {
  const config = {
    whatsapp: {
      icon: IconMessage,
      label: "WhatsApp",
      className: "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400",
    },
    instagram: {
      icon: IconBrandInstagram,
      label: "Instagram",
      className: "bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400",
    },
    WEBCHAT: {
      icon: IconGlobe,
      label: "Web Chat",
      className: "bg-ru-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
    },
    MANUAL: {
      icon: IconUserPlus,
      label: "Manual",
      className: "bg-muted text-foreground",
    },
    "CSV IMPORT": {
      icon: IconUpload,
      label: "Imported",
      className: "bg-muted text-foreground",
    },
    loyalty_program: {
      icon: IconGift,
      label: "Loyalty Customer",
      className: "bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400",
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

export const contactColumn = (
  contactTags: CustomFieldData[] = [],
  showLifecycle = false,
  /** True once the org has a board — the Stage column replaces Lifecycle Stage. */
  showStage = false,
): ColumnDef<ContactsData>[] => {
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
          <Badge
            variant="secondary"
            className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400"
          >
            <IconBolt />
            Active
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-destructive/10 text-destructive ">
            <IconBan />
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
        const labels =
          info.row.original.ContactLabelMap?.map(
            (label: { label?: { name?: string } }) => label?.label?.name,
          ) || [];
        return labels.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {labels.map((label: string | undefined, index: number) => (
              <Badge key={index} variant="secondary" color="blue">
                {label}
              </Badge>
            ))}
          </div>
        ) : (
          "-"
        );
      },
      enableSorting: false,
      meta: { title: "Label" },
    },
    // The board's column replaces the lifecycle one wherever the org has a
    // pipeline. Orgs without one keep the lifecycle column, so nobody loses the
    // information before the pipeline reaches them.
    ...(showStage
      ? [
          {
            header: "Lead stage",
            accessorFn: (row: ContactsData) => row.leads?.[0]?.stage?.name ?? "",
            id: "pipelineStage",
            cell: (info) => {
              const lead = info.row.original.leads?.[0];
              if (!lead?.stage?.name) return "-";
              return (
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-2 shrink-0 rounded-full bg-muted-foreground"
                    // Org-authored colour, so it can only be a dynamic value.
                    style={lead.stage.color ? { backgroundColor: lead.stage.color } : undefined}
                  />
                  <span>{lead.stage.name}</span>
                </div>
              );
            },
            enableSorting: false,
            meta: { title: "Lead stage" },
          } satisfies ColumnDef<ContactsData>,
        ]
      : showLifecycle
        ? [
            {
              header: "Lifecycle Stage",
              accessorKey: "Lifecycle.name",
              cell: (info) => info.getValue(),
              enableSorting: false,
              meta: { title: "Lifecycle Stage" },
            } satisfies ColumnDef<ContactsData>,
          ]
        : []),
    ...(contactTags?.length > 0
      ? contactTags
          .filter((tag) => tag?.visibility)
          .map(
            (data) =>
              ({
                header: data?.name,
                accessorFn: (row: ContactsData) =>
                  row?.customFields?.find((f: { fieldId?: string }) => f?.fieldId === data?.id)
                    ?.value,
                id: data?.name,
                cell: (info) => info.getValue()?.toString() ?? "-",

                enableSorting: false,
                meta: { title: data?.name },
              }) satisfies ColumnDef<ContactsData>,
          )
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
          <Badge
            variant="secondary"
            className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400"
          >
            <IconCircleCheck />
            Granted
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-destructive/10 text-destructive ">
            <IconCircleX />
            Denied
          </Badge>
        ),
      meta: {
        filterComponent: (setFilterValue: (value: boolean | null) => void) => {
          const consentItems = [
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ];
          return (
            <Select
              items={consentItems}
              onValueChange={(e) => setFilterValue(e === null ? null : e === "true")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {consentItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
