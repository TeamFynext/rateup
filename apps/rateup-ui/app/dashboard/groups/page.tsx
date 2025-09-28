"use client";

import React, { useMemo, useState } from "react";

import { Flex, TextInput } from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import {
  CONTACT_SORT,
  contactGroupColumn,
} from "@/components/Contacts/utils/utils";
import { TeamSelector } from "@/components/input/TeamSelector";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import ContactTable from "@/components/Table/ContactTable";

const GroupPage = () => {
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const [sortingGroup, setSortingGroup] = useState<SortingState>([
    CONTACT_SORT,
  ]);
  const [columnFiltersGroup, setColumnFiltersGroup] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const {
    isLoading: isLoadingContactgroup,
    data: contactGroupData,
    refetch: refetchGroups,
    isRefetching: isRefetchingGroups,
    isError: isErrorGroup,
  } = useContactGroup();
  const translations = useTranslations();
  const contactGroups =
    selectedTeamID == "all" || !selectedTeamID
      ? contactGroupData?.filter(
          (group) =>
            !searchTerm ||
            group?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
        )
      : contactGroupData
          ?.filter((group) => group?.teamId === selectedTeamID)
          ?.filter(
            (group) =>
              !searchTerm ||
              group?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
          );
  const columnGroup = useMemo(() => contactGroupColumn, []);
  return (
    <div className="p-2 flex flex-col h-full">
      <Flex
        justify="space-between"
        align={"center"}
        wrap={"wrap"}
        gap={10}
        mb={"xs"}
      >
        <TextInput
          leftSection={<IconSearch size="17.6px" stroke={1.5} />}
          placeholder={translations("Search contact groups")}
          rightSectionWidth={60}
          defaultValue={searchTerm}
          onChange={(event) => setSearchTerm(event.currentTarget.value)}
          maw={300}
          flex={1}
        />

        <TeamSelector
          value={selectedTeamID}
          onChange={setSelectedTeamID}
          enableAll={true}
        />
      </Flex>
      <PaperLayout p={0} className="flex-1">
        <ContactTable
          columns={columnGroup}
          data={contactGroups}
          tab={"groups"}
          refetch={refetchGroups}
          setSorting={setSortingGroup}
          sorting={sortingGroup}
          columnFilters={columnFiltersGroup}
          setColumnFilters={setColumnFiltersGroup}
          detailBtn
          isPending={isLoadingContactgroup || isRefetchingGroups}
        />
      </PaperLayout>
    </div>
  );
};

export default GroupPage;
