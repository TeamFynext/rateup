import React from "react";
import {
  Badge,
  Checkbox,
  CheckboxProps,
  HoverCard,
  Image,
  Text,
} from "@mantine/core";
import dayjs from "dayjs";
import Link from "next/link";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import { IconEye, IconUsersGroup } from "@tabler/icons-react";
import { ContactGroupMenu } from "../../Card/ContactCard";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { fallbackImage } from "../../../utils/constants";
import { CampaignMenu, renderBadge } from "../../Card/CampaignCard";
import { CampaignParticipantMenu } from "../../Campaign/CampaignParticipantCard";
import { ColumnDef } from "@tanstack/react-table";
import { CampaignParticipantStatus } from "../../../types/enums";
import { rankItem } from "@tanstack/match-sorter-utils";

export const selectCheckBox: ColumnDef<any>[] = [
  {
    id: "select",
    enableSorting: false,
    maxSize: 10,
    header: ({ table }) => (
      <IndeterminateCheckbox
        {...{
          checked: table.getIsAllRowsSelected(),
          indeterminate: table.getIsSomeRowsSelected(),
          onChange: table.getToggleAllRowsSelectedHandler(),
        }}
      />
    ),
    cell: ({ row }) => (
      <div className="px-1">
        <IndeterminateCheckbox
          {...{
            checked: row.getIsSelected(),
            disabled: !row.getCanSelect(),
            indeterminate: row.getIsSomeSelected(),
            onChange: row.getToggleSelectedHandler(),
          }}
        />
      </div>
    ),
  },
];
const contactDetailsColumn: ColumnDef<any>[] = [
  {
    header: () => "Name",
    accessorKey: "name",
    cell: (info) => info.getValue(),
  },
];

export const contactColumn = (contactTags = []) => {
  return [
    ...selectCheckBox,
    ...contactDetailsColumn,
    {
      header: () => "Phone",
      accessorKey: "phone",
      cell: (info) => info.getValue(),
    },
    ...(contactTags?.length > 0
      ? contactTags?.map((data) => ({
          header: () => data,
          accessorFn: (row) => row?.tags?.[data],
          id: data,
          cell: (info) => info.getValue()?.toString(),
        }))
      : []),

    {
      header: () => "Source",
      accessorKey: "source",
      cell: (info) => (
        <Badge size="md" variant="light" color="green" mt={"auto"}>
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
  ];
};
export const contactGroupColumn = [
  ...selectCheckBox,
  {
    header: () => "image",
    accessorKey: "icon",
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
      <Badge size="md" variant="light" color="green" mt={"auto"}>
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
    id: "Detail",
    accessorKey: "id",
    enableSorting: false,
    enableColumnFilter: false,
    cell: (info) => (
      <Link href={`contacts/${info.getValue()}`}>
        <RateupButtonPrimary
          title="View"
          rightIcon={<IconEye size={14} />}
          size="xs"
          variant="light"
        />
      </Link>
    ),
  },

  {
    header: () => "Action",
    accessorFn: (row) => row,
    enableSorting: false,
    enableColumnFilter: false,
    id: "action",
    cell: (info) => <ContactGroupMenu groupId={info?.row.original?.id} />,
  },
];

export const contactParticipentColumn: ColumnDef<any>[] = [
  {
    header: () => "Name",
    accessorKey: "name",
    cell: (info) => info.getValue(),
  },
  {
    header: () => "Team",
    accessorKey: "team.name",
    id: "Team",
    cell: (info) => (
      <Badge size="md" variant="light" color="green" mt={"auto"}>
        {(info.getValue() as string) ?? "NA"}
      </Badge>
    ),
  },
  {
    header: () => "participants",
    accessorKey: "_count.campaignParticipants",
    id: "participants",
    cell: (info) => (
      <Badge variant="light" ml={"xl"}>
        {info.getValue() as string}
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
    header: () => "Flow View",
    id: "flow",
    accessorKey: "flowId",
    enableColumnFilter: false,
    cell: (info) =>
      info.getValue() && (
        <Link href={`whatsapp/flows/${info.getValue() as string}?tab=Result`}>
          <RateupButtonPrimary
            title="View"
            rightIcon={<IconEye size={14} />}
            size="xs"
            variant="light"
          />
        </Link>
      ),
  },
  {
    header: () => "Detail View",
    id: "Detail",
    accessorKey: "id",
    enableSorting: false,
    enableColumnFilter: false,
    cell: (info) => (
      <Link href={`campaign/${info.getValue() as string}`}>
        <RateupButtonPrimary
          title="View"
          rightIcon={<IconEye size={14} />}
          size="xs"
          variant="light"
        />
      </Link>
    ),
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

export const contactParticipentDetailColumn = [
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
      let statusData: string = (info?.getValue()?.waStatus || "").toUpperCase();
      const FlowId = info?.getValue()?.campaign?.flowId;
      const participantStatus = info.getValue().status?.toUpperCase();
      const errorMessage = info.getValue().errorMessage;
      if (FlowId && participantStatus === CampaignParticipantStatus.COMPLETED) {
        statusData = CampaignParticipantStatus.COMPLETED;
      } else if (!statusData || errorMessage) {
        statusData = participantStatus;
      }
      return statusData === CampaignParticipantStatus.FAILED ? (
        <HoverCard width={280} shadow="md" withArrow>
          <HoverCard.Target>
            <Badge
              color={renderBadge(statusData).color}
              variant={renderBadge(statusData).variant}
              radius={"sm"}
              size={"lg"}
              tt={"capitalize"}
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
          radius={"sm"}
          size={"lg"}
          tt={"uppercase"}
        >
          {(statusData as string) ?? "NA"}
        </Badge>
      );
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
      />
    ),
  },
];

export function IndeterminateCheckbox(props: CheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null!);
  return <Checkbox ref={ref} {...props} />;
}

export enum WhatsappTableType {
  CONTACTS = "contacts",
  GROUPS = "groups",
  MEMBERS = "members",
  PARTICIPANTS = "participants",
}

export const tabHeaderLabels = {
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
