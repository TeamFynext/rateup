import { useState } from "react";

import dayjs from "dayjs";

import { useRouter } from "next/router";
import { useDisclosure } from "@mantine/hooks";
import { ColumnDef } from "@tanstack/react-table";
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

export enum ContactTabs {
  CONTACTS = "contacts",
  GROUPS = "groups",
  SETTINGS = "settings",
}
export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterByTag, setFilterByTag] = useState<string[]>([]);
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [contactTags, setContactTags] = useState([]);
  const router = useRouter();
  const { tab = ContactTabs.CONTACTS } = router.query as { tab: string };
  let activeTab = tab?.toString() as ContactTabs;

  const { isLoading: isLoadingContacts, data: contactData } = useContacts() as {
    isLoading: boolean;
    data: ContactsData[];
    error: any;
    refetch: any;
  };

  const { isLoading: isLoadingContactgroup, data: contactGroupData } =
    useContactGroup();
  const { isPending, data: cTags } = useGetContactTags();
  const sourceArray = Array.from(
    new Set(contactData?.map((data) => data.source)),
  );
  const updateContactTagsMutation = useUpdateContactTagsMutation();
  const filteredContacts = (
    searchTerm
      ? contactData.filter((contact) => {
          return (
            contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact?.phone?.includes(searchTerm)
          );
        })
      : contactData
  )
    ?.sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)))
    ?.filter((data) =>
      sourceArray?.some((data) => filterByTag.includes(data))
        ? filterByTag?.includes(data.source)
        : data,
    )
    ?.filter((data) =>
      filterByTag.filter((value) => !sourceArray.includes(value))?.length > 0
        ? data?.contactGroups?.some((group) =>
            filterByTag?.includes(group.contactGroup.name),
          )
        : data,
    );

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
  if (isLoadingContacts || isLoadingContactgroup || isPending)
    return <RateupLoader h={"90dvh"} />;

  const column: ColumnDef<any>[] = [
    ...contactColumn(cTags?.contactTags ?? []),
    {
      header: () => "Action",
      accessorFn: (row) => row,
      enableSorting: false,
      enableGlobalFilter: false,
      id: "action",
      cell: (info) => (
        <ContactMenu
          contact={info.getValue()}
          tags={cTags?.contactTags}
          groupId={""}
        />
      ),
    },
  ];
  const columnGroup: ColumnDef<any>[] = contactGroupColumn;
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
              leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
              radius="xl"
              size="md"
              placeholder={
                activeTab == ContactTabs.CONTACTS
                  ? "Search contact"
                  : "Search contact groups"
              }
              rightSectionWidth={60}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              flex={1}
              maw={500}
              m={"auto"}
            />
          )}

          {activeTab === ContactTabs.CONTACTS && (
            <FilterSelect
              setFilterByTag={setFilterByTag}
              filterByTag={filterByTag}
              contactArray={contactGroups?.map((data) => data?.name)}
              sourceArray={sourceArray}
            />
          )}
          <ContactActionMenu contacts={contactData} groups={contactGroupData} />
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
                data={filteredContacts}
                cTags={cTags?.contactTags}
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
                w={"400px"}
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

export const FilterSelect = ({
  setFilterByTag,
  filterByTag,
  contactArray,
  sourceArray,
}) => {
  return (
    <ContainedMultiSelect
      data={[
        { group: "Source", items: sourceArray },
        { group: "Groups", items: contactArray ?? [] },
      ]}
      defaultValue={filterByTag}
      onChange={setFilterByTag}
      placeholder="Filter contacts"
    />
  );
};
export enum ContactAcions {
  DELETE_CONTACTS = "Delete Contacts",
  ADD_CONTACTS_TO_GROUP = "Add Contacts to Group",
  DELETE_GROUPS = "Delete Groups",
}

const ContactActionMenu = ({ contacts, groups }) => {
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
            rightSection={<IconChevronDown size="1rem" />}
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
        allContacts={contacts}
        allGroups={groups}
        action={action}
      />
    </Stack>
  );
};
