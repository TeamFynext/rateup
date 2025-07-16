import { useMemo, useState } from "react";
import { useRouter } from "next/router";

import {
  Box,
  Button,
  Flex,
  Group,
  Menu,
  rem,
  SegmentedControl,
  Stack,
  Tabs,
  TextInput,
} from "@mantine/core";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconSearch, IconUserPlus } from "@tabler/icons-react";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import dayjs from "dayjs";

import { useContactGroup } from "@/backend/campaign/contactGroup/contactGroup.query";
import { useContacts } from "@/backend/campaign/contacts/contacts.query";
import {
  useGetContactTags,
  useUpdateContactTagsMutation,
} from "@/backend/whatsapp/settings/waSettings.query";
import ErrorComponent from "@/components/404/ErrorComponent";
import { RateupButtonPrimary } from "@/components/Button/RateupButtons";
import { ContactMenu } from "@/components/Card/ContactCard";
import ContactAction from "@/components/Contacts/ContactAction";
import {
  CONTACT_SORT,
  contactColumn,
  contactGroupColumn,
} from "@/components/Contacts/utils/utils";
import {
  ContainedMultiSelect,
  ContainedTagInput,
} from "@/components/input/ContainedInput/ContainedInput";
import { TeamSelector } from "@/components/input/TeamSelector";
import Heading from "@/components/styled/Heading/Heading";
import PaperLayout from "@/components/styled/Layouts/PaperLayout";
import ContactTable from "@/components/Table/ContactTable";
import useTranslations from "@/dictionaries/useTranslation";
import { PAGE_SIZE } from "@/utils/constants";
import { showLoadingToast } from "@/utils/notifications";

import styles from "./contacts.module.css";

export enum ContactTabs {
  GROUPS = "groups",
  CONTACTS = "All Contacts",
  SETTINGS = "settings",
}
export default function Contacts() {
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [contactTags, setContactTags] = useState([]);
  const [sorting, setSorting] = useState<SortingState>([CONTACT_SORT]);
  const [sortingGroup, setSortingGroup] = useState<SortingState>([
    CONTACT_SORT,
  ]);
  const [columnFilters, setColumnFilters] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const [columnFiltersGroup, setColumnFiltersGroup] =
    useDebouncedState<ColumnFiltersState>([], 200);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: Number(PAGE_SIZE[0]),
  });
  const router = useRouter();
  const { tab = ContactTabs.GROUPS } = router.query as { tab: string };
  let activeTab = tab?.toString() as ContactTabs;

  const {
    isPending: isLoadingContacts,
    data: contactData,
    refetch: refetchContacts,
    isRefetching,
    isError,
  } = useContacts(pagination, searchTerm, sorting?.[0], columnFilters);

  const {
    isLoading: isLoadingContactgroup,
    data: contactGroupData,
    refetch: refetchGroups,
    isRefetching: isRefetchingGroups,
    isError: isErrorGroup,
  } = useContactGroup();
  const { isPending, data: cTags } = useGetContactTags();
  const updateContactTagsMutation = useUpdateContactTagsMutation();
  const { translations } = useTranslations();
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

  const column = useMemo(
    () => [
      ...contactColumn(cTags?.contactTags ?? []),
      {
        header: "Action",
        accessorFn: (row) => row,
        enableSorting: false,
        enableColumnFilter: false,
        id: "action",
        cell: (info) => (
          <ContactMenu
            contact={info.getValue()}
            tags={cTags?.contactTags}
            groupId={""}
          />
        ),
      },
    ],
    [cTags],
  );

  const columnGroup = useMemo(() => contactGroupColumn, []);
  const contactMemoData = useMemo(
    () => contactData?.users ?? [],
    [contactData?.users],
  );
  if (isError || isErrorGroup)
    return (
      <ErrorComponent refetch={isError ? refetchContacts : refetchGroups} />
    );
  return (
    <Stack className={styles["contacts-page-root-div"]}>
      <Tabs value={activeTab} color="var(--tertiary-color)" keepMounted={false}>
        <Flex justify="space-between" align={"center"} wrap={"wrap"} gap={10}>
          <SegmentedControl
            data={Object.values(ContactTabs)}
            value={activeTab}
            onChange={(value) =>
              router.push(`/dashboard/contacts?tab=${value}`)
            }
            color={"var(--mantine-color-rateup-blue-filled)"}
            radius={"md"}
            defaultValue={activeTab}
            tt={"capitalize"}
          />
          {activeTab !== ContactTabs.SETTINGS && (
            <TextInput
              leftSection={<IconSearch size="17.6px" stroke={1.5} />}
              radius="xl"
              size="md"
              placeholder={
                activeTab == ContactTabs.CONTACTS
                  ? translations["Search contact"]
                  : translations["Search contact groups"]
              }
              rightSectionWidth={60}
              defaultValue={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              flex={1}
              maw={500}
              m={"auto"}
            />
          )}

          {activeTab === ContactTabs.CONTACTS && (
            <FilterSelect
              setFilterByTag={setColumnFilters}
              filterByTag={columnFilters}
              contactArray={contactGroups?.map((data) => ({
                value: data?.id,
                label: data?.name,
              }))}
            />
          )}
          {activeTab === ContactTabs.GROUPS && (
            <TeamSelector
              value={selectedTeamID}
              onChange={setSelectedTeamID}
              enableAll={true}
            />
          )}
          <ContactActionMenu groups={contactGroupData} />
        </Flex>
        <Box className={styles["panels-container"]}>
          <Tabs.Panel value={ContactTabs.CONTACTS} h={"100%"}>
            <PaperLayout p={0} h={"100%"}>
              <ContactTable
                columns={column}
                data={contactMemoData ?? []}
                cTags={cTags?.contactTags}
                refetch={refetchContacts}
                pagination={pagination}
                setPagination={setPagination}
                totalCount={contactData?.totalCount}
                setSorting={setSorting}
                sorting={sorting}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                isPending={isLoadingContacts || isRefetching || isPending}
              />
            </PaperLayout>
          </Tabs.Panel>
          <Tabs.Panel value={ContactTabs.GROUPS} h={"100%"}>
            <PaperLayout p={0} h={"100%"}>
              <ContactTable
                columns={columnGroup}
                data={contactGroups}
                cTags={cTags?.contactTags}
                tab={activeTab}
                refetch={refetchGroups}
                setSorting={setSortingGroup}
                sorting={sortingGroup}
                columnFilters={columnFiltersGroup}
                setColumnFilters={setColumnFiltersGroup}
                detailBtn
                isPending={
                  isLoadingContactgroup || isRefetchingGroups || isPending
                }
              />
            </PaperLayout>
          </Tabs.Panel>
          <Tabs.Panel value={ContactTabs.SETTINGS}>
            <PaperLayout p="xl">
              <Stack align="start">
                <ContainedTagInput
                  placeholder={translations["Type field name and press enter"]}
                  label={
                    translations[
                      "Enter the Field name you want to add along with the existing fields in Csv Import."
                    ]
                  }
                  w={"25rem"}
                  onChange={setContactTags}
                  defaultValue={cTags?.contactTags}
                />
                <RateupButtonPrimary
                  title={translations["Update"]}
                  onClick={() => {
                    updateContactTagsMutation.mutate({
                      tags: contactTags,
                    });
                    showLoadingToast(
                      translations["Contact tags updated successfully"],
                      "c-tags",
                      true,
                      translations["Loading"],
                    );
                  }}
                />
              </Stack>
            </PaperLayout>
          </Tabs.Panel>
        </Box>
      </Tabs>
    </Stack>
  );
}

export const FilterSelect = ({ setFilterByTag, filterByTag, contactArray }) => {
  const { translations } = useTranslations();
  return (
    <ContainedMultiSelect
      data={[{ group: "Groups", items: contactArray ?? [] }]}
      defaultValue={filterByTag}
      onChange={(e) => {
        setFilterByTag((prev) => {
          if (e.length === 0) {
            return prev.filter((item) => item.id !== "filterGroupName");
          }
          return [...prev, { id: "filterGroupName", value: e.join(",") }];
        });
      }}
      placeholder={translations["Filter contacts"]}
    />
  );
};
export enum ContactAcions {
  DELETE_CONTACTS = "Delete Contacts",
  ADD_CONTACTS_TO_GROUP = "Add Contacts to Group",
  DELETE_GROUPS = "Delete Groups",
}

const ContactActionMenu = ({ groups }) => {
  const [
    actionModalOpened,
    { open: openActionModal, close: closeActionModal },
  ] = useDisclosure(false);
  const [action, setSelectedAction] = useState<ContactAcions>(null);
  const { translations } = useTranslations();
  return (
    <Stack px="sm" pr={0}>
      <Menu
        position="bottom-end"
        offset={4}
        withArrow
        arrowPosition="side"
        transitionProps={{ transition: "rotate-right", duration: 150 }}
      >
        <Menu.Target>
          <Button
            variant="outline"
            color="dark.2"
            radius="lg"
            size="xs"
            rightSection={<IconChevronDown size="16px" />}
            style={{ maxWidth: "fit-content" }}
          >
            {translations["More"]}
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item
            onClick={() => {
              setSelectedAction(ContactAcions.ADD_CONTACTS_TO_GROUP);
              openActionModal();
            }}
            leftSection={
              <IconUserPlus style={{ width: rem(14), height: rem(14) }} />
            }
          >
            {translations["Add Contacts to Group"]}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <ContactAction
        opened={actionModalOpened}
        close={closeActionModal}
        allGroups={groups}
        action={action}
      />
    </Stack>
  );
};
