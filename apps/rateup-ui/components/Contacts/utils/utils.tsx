import React from "react";
import { Badge, Checkbox, CheckboxProps, Image } from "@mantine/core";
import dayjs from "dayjs";
import Link from "next/link";
import { RateupButtonPrimary } from "../../Button/RateupButtons";
import { IconChevronRight, IconUsersGroup } from "@tabler/icons-react";
import { ContactGroupMenu } from "../../Card/ContactCard";
import { getFileUrlFromKey } from "../../../utils/file-upload/upload";
import { fallbackImage } from "../../../utils/constants";
import { CampaignMenu, renderBadge } from "../../Card/CampaignCard";
import { CampaignParticipantMenu } from "../../Campaign/CampaignParticipantCard";

export const selectCheckBox = [
  {
    id: "select",
    enableSorting: false,
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
const contactDetailsColumn = [
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
          title="Go"
          rightIcon={<IconChevronRight size={14} />}
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

export const contactParticipentColumn = [
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
    header: () => "Status",
    accessorKey: "status",
    cell: (info) => (
      <Badge
        color={renderBadge(info.getValue()).color}
        variant={renderBadge(info.getValue()).variant}
        radius={"sm"}
        size={"lg"}
        tt={"capitalize"}
      >
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
      <Link href={`campaign/${info.getValue()}`}>
        <RateupButtonPrimary
          title="Go"
          rightIcon={<IconChevronRight size={14} />}
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
export const contactParticipentDetailColumn = [
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
    accessorKey: "status",
    cell: (info) => (
      <Badge
        color={renderBadge(info.getValue()).color}
        variant={renderBadge(info.getValue()).variant}
        radius={"sm"}
        size={"lg"}
        tt={"capitalize"}
      >
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
    header: () => "Action",
    accessorFn: (row) => row,
    enableSorting: false,
    enableColumnFilter: false,
    id: "action",
    cell: (info) => (
      <CampaignParticipantMenu
        participantId={info?.row?.original?.id}
        status={info?.row?.original?.status}
        id={info?.row?.original?.campaignId}
      />
    ),
  },
];

export function IndeterminateCheckbox(props: CheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null!);
  return <Checkbox ref={ref} {...props} />;
}
