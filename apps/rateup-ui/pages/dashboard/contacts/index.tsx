import { useMemo, useState } from "react";

import dayjs from "dayjs";

import { useRouter } from "next/router";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { IconChevronDown, IconSearch, IconUserPlus } from "@tabler/icons-react";
import {
  Button,
  Center,
  Flex,
  Group,
  Loader,
  Menu,
  rem,
  SegmentedControl,
  Stack,
  Tabs,
  TextInput,
} from "@mantine/core";

import { showLoadingToast } from "../../../utils/notifications";
import Heading from "../../../components/styled/Heading/Heading";
import ContactTable from "../../../components/Table/ContactTable";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import { TeamSelector } from "../../../components/input/TeamSelector";
import ContactAction from "../../../components/Contacts/ContactAction";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import {
  CONTACT_SORT,
  contactColumn,
  contactGroupColumn,
} from "../../../components/Contacts/utils/utils";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import { useContacts } from "../../../backend/campaign/contacts/contacts.query";
import { ContactMenu } from "../../../components/Card/ContactCard";
import { useContactGroup } from "../../../backend/campaign/contactGroup/contactGroup.query";
import {
  ContainedMultiSelect,
  ContainedTagInput,
} from "../../../components/input/ContainedInput/ContainedInput";
import {
  useGetContactTags,
  useUpdateContactTagsMutation,
} from "../../../backend/whatsapp/settings/waSettings.query";
import { PAGE_SIZE } from "../../../utils/constants";

export enum ContactTabs {
  GROUPS = "groups",
  CONTACTS = "contacts",
  SETTINGS = "settings",
}
export default function Contacts() {
  const [searchTerm, setSearchTerm] = useDebouncedState("", 200);
  const [filterByTag, setFilterByTag] = useState<string[]>([]);
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
  } = useContacts(pagination, searchTerm, sorting?.[0], columnFilters);

  const {
    isLoading: isLoadingContactgroup,
    data: contactGroupData,
    refetch: refetchGroups,
  } = useContactGroup();
  const { isPending, data: cTags } = useGetContactTags();
  const updateContactTagsMutation = useUpdateContactTagsMutation();

  const contactGroups =
    selectedTeamID == "all" || !selectedTeamID
      ? contactGroupData
      : contactGroupData?.filter((group) => group?.teamId === selectedTeamID);
  const filteredGroups = (
    searchTerm
      ? contactGroups.filter((group) => {
          return group?.name.toLowerCase().includes(searchTerm.toLowerCase());
        })
      : contactGroups
  )?.sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)));

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

  if (isLoadingContacts || isLoadingContactgroup || isPending)
    return <RateupLoader h={"90dvh"} />;
  return (
    <>
      <Flex
        mih={50}
        gap="md"
        justify="space-between"
        align="center"
        direction="row"
        wrap="wrap"
        px="xl"
      >
        <Group gap={"md"}>
          <Heading title="Contacts" titleprops={{ w: "fit-content" }} />
        </Group>
        {activeTab === ContactTabs.GROUPS && (
          <TeamSelector
            value={selectedTeamID}
            onChange={setSelectedTeamID}
            enableAll={true}
          />
        )}
      </Flex>
      <Tabs
        value={activeTab}
        color="var(--tertiary-color)"
        p="xl"
        keepMounted={false}
      >
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
                  ? "Search contact"
                  : "Search contact groups"
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
          <ContactActionMenu groups={contactGroupData} />
        </Flex>
        <Tabs.Panel value={ContactTabs.CONTACTS}>
          {isLoadingContacts ? (
            <Center pt="xl">
              <Loader type="bars" />
            </Center>
          ) : (
            <PaperLayout mt={"xl"} px={0}>
              <ContactTable
                columns={column}
                data={contactMemoData ?? []}
                cTags={cTags?.contactTags}
                topHeight={375}
                refetch={refetchContacts}
                pagination={pagination}
                setPagination={setPagination}
                totalCount={contactData?.totalCount}
                setSorting={setSorting}
                sorting={sorting}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
              />
            </PaperLayout>
          )}
        </Tabs.Panel>
        <Tabs.Panel value={ContactTabs.GROUPS}>
          {isLoadingContactgroup ? (
            <Center pt="xl">
              <Loader type="bars" />
            </Center>
          ) : (
            <PaperLayout mt={"xl"} px={0}>
              <ContactTable
                columns={columnGroup}
                data={filteredGroups}
                cTags={cTags?.contactTags}
                tab={activeTab}
                topHeight={375}
                refetch={refetchGroups}
                setSorting={setSortingGroup}
                sorting={sortingGroup}
                columnFilters={columnFiltersGroup}
                setColumnFilters={setColumnFiltersGroup}
              />
            </PaperLayout>
          )}
        </Tabs.Panel>
        <Tabs.Panel value={ContactTabs.SETTINGS}>
          <PaperLayout mt={"xl"} p="xl">
            <Stack align="start">
              <ContainedTagInput
                placeholder="Type field name and press enter"
                label="Enter the Field name you want to add along with the existing fields in Csv Import."
                w={"25rem"}
                onChange={setContactTags}
                defaultValue={cTags?.contactTags}
              />
              <RateupButtonPrimary
                title="Update"
                onClick={() => {
                  updateContactTagsMutation.mutate({
                    tags: contactTags,
                  });
                  showLoadingToast(
                    "Contact tags updated successfully",
                    "c-tags",
                    true,
                    "Loading",
                  );
                }}
              />
            </Stack>
          </PaperLayout>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

export const FilterSelect = ({ setFilterByTag, filterByTag, contactArray }) => {
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
      placeholder="Filter contacts"
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
  return (
    <Stack px="sm">
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
            More
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
            Add Contacts to Group
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
