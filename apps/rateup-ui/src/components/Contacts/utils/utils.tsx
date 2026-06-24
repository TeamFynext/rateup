"use client";

import React from "react";

import { Box, HoverCard, Image, Select, Text } from "@mantine/core";
import {
  IconBrandInstagram,
  IconCheck,
  IconUsersGroup,
  IconX,
} from "@tabler/icons-react";
import { rankItem } from "@tanstack/match-sorter-utils";
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

import { CampaignParticipantStatus, CampaignType } from "@/types/enums.ts";
import type { CustomFieldData } from "@/backend/campaign/contacts/contacts.api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { getInitials } from "@/components/ui/utils.ts";
import { fallbackImage } from "@/utils/constants.ts";
import { getFileUrlFromKey } from "@/utils/file-upload/upload.ts";

import { CampaignParticipantMenu } from "../../Campaign/CampaignParticipantCard.tsx";
import { CampaignMenu, renderBadge } from "../../Card/CampaignCard.tsx";
import ContactGroupMenu from "../ContactGroupMenu.tsx";

const DETAIL_BTN = "detail_btn_link_123";

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
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
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

export const contactColumn = (
  contactTags: CustomFieldData[] = [],
  showLifecycle = false,
) => {
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
        const labels =
          info.row.original.ContactLabelMap?.map(
            (label) => label?.label?.name,
          ) || [];
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
          ?.filter((tag) => tag?.visibility)
          ?.map((data) => ({
            header: data?.name,
            accessorFn: (row) =>
              row?.customFields?.find((f) => f?.fieldId === data?.id)?.value,
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
      header: ({ column }) => (
        <HeaderWithSort column={column} title={"Date Added"} />
      ),
      accessorKey: "createdAt",
      id: "createdAt",
      cell: (info) =>
        dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
      enableSorting: true,
      meta: { title: "Date Added" },
    },
    {
      header: ({ column }) => (
        <HeaderWithSort column={column} title={"Last Contact"} />
      ),
      accessorKey: "lastMessageWaCreatedAt",
      id: "lastMessageWaCreatedAt",
      cell: (info) =>
        info.getValue()
          ? dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A")
          : "",
      enableSorting: true,
      meta: { title: "Last Contact" },
    },
  ];
};

const loyaltyGroupColumn = [
  ...selectCheckBox,
  {
    header: () => "image",
    accessorKey: "icon",
    size: 10,
    cell: (info) =>
      info.getValue() ? (
        <Image
          src={getFileUrlFromKey(info.getValue())}
          alt="group image"
          h={50}
          w={50}
          fallbackSrc={fallbackImage}
        />
      ) : (
        <IconUsersGroup />
      ),
  },
  ...contactDetailsColumn,
  {
    header: () => "Team",
    accessorKey: "team.name",
    id: "Team",
    cell: (info) => (
      <Badge variant="secondary" color="green">
        {(info.getValue() as string) ?? "NA"}
      </Badge>
    ),
  },
  {
    header: () => "Created",
    accessorKey: "createdAt",
    cell: (info) =>
      dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
  },
  {
    header: () => "Detail View",
    id: DETAIL_BTN,
    accessorFn: (row) => `customer/group/${row.id}`,
    enableSorting: false,
    enableColumnFilter: false,
  },

  {
    header: () => "Action",
    accessorFn: (row) => row,
    maxSize: 10,
    enableSorting: false,
    enableColumnFilter: false,
    id: "action",
    cell: (info) => <ContactGroupMenu groupId={info?.row.original?.id} />,
  },
];

const contactParticipentColumn: ColumnDef<any>[] = [
  {
    header: () => "Name",
    accessorKey: "name",
    cell: (info) => info.getValue(),
  },
  // {
  //   header: () => "Type",
  //   accessorKey: "type",
  //   cell: (info) => {
  //     const type = info.getValue() as string;
  //     const color =
  //       type === "WHATSAPP" ? "blue" : type === "DRIP" ? "orange" : "gray";
  //     return (
  //       <Badge variant="light" color={color}>
  //         {type}
  //       </Badge>
  //     );
  //   },
  // },
  {
    header: () => "Team",
    accessorKey: "teamName",
    id: "Team",
    cell: (info) => (
      <Badge variant="secondary" color="green">
        {(info.getValue() as string) ?? "NA"}
      </Badge>
    ),
  },
  {
    header: () => "Status",
    accessorKey: "status",
    cell: (info) => (
      <Badge variant="secondary" color={renderBadge(info.getValue()).color}>
        {info.getValue() as string}
      </Badge>
    ),
  },
  {
    header: () => "Participants",
    accessorKey: "campaignParticipantsCount",
    id: "participants",
    cell: (info) => (
      <Badge variant="secondary">{info.getValue() as string}</Badge>
    ),
  },

  {
    header: () => "Created",
    accessorKey: "createdAt",
    cell: (info) =>
      dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
  },
  // {
  //   header: () => "Responses",
  //   id: "flow",
  //   accessorFn: (row) =>
  //     row?.flowId && `v${row.flowVersion ?? 1}/${row.flowId}`,
  //   enableColumnFilter: false,
  //   cell: (info) =>
  //     info.getValue() && (
  //       <Box
  //         onClick={(e) => {
  //           e.stopPropagation();
  //         }}
  //       >
  //         <Link to={`whatsapp/flows/${info.getValue() as string}?tab=Result`}>
  //           <RateupButtonPrimary
  //             title="View"
  //             rightIcon={<IconEye size={14} />}
  //             size="xs"
  //             variant="light"
  //           />
  //         </Link>
  //       </Box>
  //     ),
  // },
  {
    header: () => "Detail View",
    id: DETAIL_BTN,
    accessorFn: (row) => `campaign/${row.id}`,
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    header: () => "Action",
    accessorFn: (row) => row,
    enableSorting: false,
    enableColumnFilter: false,
    id: "action",
    cell: (info) => (
      <CampaignMenu
        teamId={info?.row?.original?.team?.name}
        id={info?.row?.original?.id}
        campaignType={CampaignType.WHATSAPP}
      />
    ),
  },
];
const getStatusData = (info) => {
  let statusData: string = (info?.waStatus || "").toUpperCase();
  const FlowId = info?.campaign?.flowId;
  const participantStatus = info.status?.toUpperCase();
  const errorMessage = info.errorMessage;
  if (FlowId && participantStatus === CampaignParticipantStatus.COMPLETED) {
    statusData = CampaignParticipantStatus.COMPLETED;
  } else if (!statusData || errorMessage) {
    statusData = participantStatus;
  }
  return statusData ?? "";
};
const customStatusSort = (rowA: any, rowB: any) => {
  const statusA = getStatusData(rowA?.original);
  const statusB = getStatusData(rowB?.original);

  // Define the order of statuses based on your requirements
  const statusOrder = {
    [CampaignParticipantStatus.COMPLETED]: 1,
    [CampaignParticipantStatus.DELIVERED]: 2,
    [CampaignParticipantStatus.FAILED]: 3,
    [CampaignParticipantStatus.PENDING]: 4,
    [CampaignParticipantStatus.READ]: 5,
    [CampaignParticipantStatus.SENT]: 6,
  };

  // Compare the statuses based on the custom order
  return statusOrder[statusA] - statusOrder[statusB];
};
const fuzzyFilter = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(getStatusData(row?.original), value);
  addMeta(itemRank);
  return itemRank.passed;
};

const contactParticipentDetailColumn = [
  ...selectCheckBox,
  {
    header: () => "Name",
    accessorKey: "contact.name",
    id: "name",
    cell: (info) => info.getValue(),
  },
  {
    header: () => "Phone",
    accessorKey: "contact.phone",
    id: "phone",
    cell: (info) => info.getValue(),
  },
  {
    header: () => "Status",
    accessorFn: (row) => row,
    id: "status",
    filterFn: fuzzyFilter,
    sortingFn: customStatusSort,
    cell: (info) => {
      const statusData = info?.getValue()?.status;
      const errorMessage = info?.getValue()?.errorMessage;
      return statusData === CampaignParticipantStatus.FAILED ? (
        <HoverCard width={280} shadow="md" withArrow>
          <HoverCard.Target>
            <Badge
              color={renderBadge(statusData).color}
              variant={renderBadge(statusData).variant}
              className="rounded-md capitalize"
            >
              {(statusData as string) ?? "NA"}
            </Badge>
          </HoverCard.Target>
          <HoverCard.Dropdown>
            <Text size="sm">{errorMessage}</Text>
          </HoverCard.Dropdown>
        </HoverCard>
      ) : (
        <Badge
          color={renderBadge(statusData).color}
          variant={renderBadge(statusData).variant}
          className="rounded-md uppercase"
        >
          {(statusData as string) ?? "NA"}
        </Badge>
      );
    },
  },
  {
    header: () => "Consent",
    accessorKey: "contact.consent",
    id: "consent",
    cell: (info) =>
      info.getValue() ? <IconCheck color="green" /> : <IconX color="red" />,
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
    },
  },
  {
    header: () => "SentAt",
    accessorKey: "sentAt",
    cell: (info) =>
      info.getValue() &&
      dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
  },
  {
    header: () => "Created",
    accessorKey: "createdAt",
    cell: (info) =>
      dayjs(info.getValue() as string).format("DD-MM-YYYY hh:mm A"),
  },
  {
    header: () => "Action",
    accessorFn: (row) => row,
    enableSorting: false,
    enableColumnFilter: false,
    id: "action",
    cell: (info) => (
      <CampaignParticipantMenu
        participantId={info?.getValue()?.id}
        status={info?.getValue()?.status}
        id={info?.getValue()?.campaignId}
        teamId={info?.getValue()?.teamId}
        consent={info?.getValue()?.contact?.consent}
      />
    ),
  },
];

// export function IndeterminateCheckbox(props: CheckboxProps) {
//   const ref = React.useRef<HTMLInputElement>(null!);
//   return <Checkbox ref={ref} {...props} />;
// }

enum WhatsappTableType {
  CONTACTS = "contacts",
  GROUPS = "groups",
  MEMBERS = "members",
  PARTICIPANTS = "participants",
}

const tabHeaderLabels = {
  [WhatsappTableType.CONTACTS]: {
    headerLabel: "Are you sure to delete these selected contacts?",
    headerTitle: "Delete Contacts?",
    tooltipMsg: "delete contacts",
  },
  [WhatsappTableType.GROUPS]: {
    headerLabel: "Are you sure to delete these selected contact groups?",
    headerTitle: "Delete Contact Groups?",
    tooltipMsg: "delete contact groups",
  },
  [WhatsappTableType.MEMBERS]: {
    headerLabel: "Are you sure to remove these selected members?",
    headerTitle: "Remove members?",
    tooltipMsg: "remove members",
  },
  [WhatsappTableType.PARTICIPANTS]: {
    headerLabel: "Are you sure to remove these selected participants?",
    headerTitle: "Remove participants?",
    tooltipMsg: "remove participants",
  },
};

export const CONTACT_SORT = { id: "createdAt", desc: true };
