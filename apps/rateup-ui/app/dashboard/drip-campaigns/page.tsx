"use client";

import { useState } from "react";

import { Badge, Center, Flex, Modal, Stack, TextInput } from "@mantine/core";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useExtracted } from "next-intl";

import { CampaignType } from "@/types/enums";
import { useCampaignData } from "@/backend/campaign/campaign.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import UnauthorizedPage from "@/components/404/UnAuthorizedError";
import CreateCampaignModal from "@/components/Campaign/CreateCampaignModal";
import { CampaignMenu, renderBadge } from "@/components/Card/CampaignCard";
import { DETAIL_BTN } from "@/components/Contacts/utils/utils";
import { TeamSelector } from "@/components/input/TeamSelector";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import TanstackTable from "@/components/Table/TanstackTable";

import styles from "./campaign.module.css";

const column: ColumnDef<any>[] = [
  {
    header: () => "Name",
    accessorKey: "name",
    cell: (info) => info.getValue(),
  },
  {
    header: () => "Team",
    accessorKey: "teamName",
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
      <Badge variant="light" color={renderBadge(info.getValue()).color}>
        {info.getValue() as string}
      </Badge>
    ),
  },
  {
    header: () => "Participants",
    accessorKey: "campaignParticipantsCount",
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
    header: () => "Detail View",
    id: DETAIL_BTN,
    accessorFn: (row) => `drip-campaigns/${row.id}`,
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
        campaignType={CampaignType.DRIP}
      />
    ),
  },
];

export default function DripCampaignList() {
  const [searchText, setSearchText] = useDebouncedState("", 200);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const translations = useExtracted();

  const {
    data: campaignData,
    isPending: isAllCampaignLoading,
    isError: isAllCampaignError,
    isRefetching: isRefetchingAllCampaign,
    refetch: refetchAllkCampaign,
    error,
  } = useCampaignData(CampaignType.DRIP);

  const filteredCampaignsdata =
    selectedTeam == "all" || !selectedTeam // filtering by team
      ? campaignData?.data
      : (campaignData?.data?.filter((c) => c?.teamId === selectedTeam) ?? []);
  const filteredCampaigns = (
    searchText
      ? filteredCampaignsdata.filter(
          // filtering by search text
          (campaign) =>
            campaign?.name.toLowerCase().includes(searchText.toLowerCase()),
        )
      : filteredCampaignsdata
  )?.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)); // sorting by date

  if (isAllCampaignError && (error as any)?.response?.status === 403)
    return <UnauthorizedPage />;
  if (isAllCampaignError)
    return <ErrorComponent refetch={refetchAllkCampaign} />;

  return (
    <Stack gap={"sm"} h={"100%"} mx={4}>
      <Flex justify={"space-between"}>
        <SearchInput
          placeholder={"Search Drip Campaign"}
          searchText={searchText}
          setSearchText={setSearchText}
        />
        <TeamSelector
          value={selectedTeam}
          onChange={setSelectedTeam}
          enableAll={true}
        />
      </Flex>
      <Center></Center>
      <PaperLayout p={0} h={"100%"} mah={"850px"}>
        <TanstackTable
          columns={column}
          data={filteredCampaigns}
          btnTitle={translations("Create")}
          toggle={open}
          disableFuzzyFnCustom={true}
          detailBtn
          isPending={isAllCampaignLoading || isRefetchingAllCampaign}
        />
      </PaperLayout>
      <Modal opened={opened} onClose={close} centered size={"lg"} radius={"md"}>
        <CreateCampaignModal
          close={close}
          isEdit={false}
          campaignType={CampaignType.DRIP}
        />
      </Modal>
    </Stack>
  );
}

export const SearchInput = ({
  placeholder,
  searchText,
  setSearchText,
  width = 500,
  size = "md",
}) => {
  return (
    <TextInput
      defaultValue={searchText}
      onChange={(e) => setSearchText(e.currentTarget.value)}
      size={size}
      radius={"xl"}
      w={width}
      placeholder={placeholder}
      leftSection={<IconSearch size={"1rem"} />}
      classNames={{ input: styles.input }}
    />
  );
};
