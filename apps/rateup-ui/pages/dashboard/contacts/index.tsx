import {
  Flex,
  Group,
  Tabs,
  SimpleGrid,
  TextInput,
  Loader,
  Center,
  Container,
  Stack,
  Menu,
  Button,
  rem,
  SegmentedControl,
} from "@mantine/core";

import {
  IconChevronDown,
  IconTrashXFilled,
  IconUserPlus,
  IconSearch,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { useDisclosure } from "@mantine/hooks";
import { useCampaignContacts } from "../../../backend/campaign/contacts/contacts.query";
import { useContactGroup } from "../../../backend/campaign/contactGroup/contactGroup.query";
import ContactCard from "../../../components/Card/ContactCard";
import { ContactGroupCard } from "../../../components/Card/ContactGroupCard";
import { TeamSelector } from "../../../components/input/TeamSelector";
import Heading from "../../../components/styled/Heading/Heading";
import NothingFound from "../../../components/NothingFound/NothingFound";
import { useRouter } from "next/router";
import dayjs from "dayjs";
import ContactAction from "../../../components/Contacts/ContactAction";
import OpenCreateMenu from "../../../components/Contacts/OpenCreateMenu";
import {
  ContainedMultiSelect,
  ContainedTagInput,
} from "../../../components/input/ContainedInput/ContainedInput";
import PaperLayout from "../../../components/styled/Layouts/PaperLayout";
import { RateupButtonPrimary } from "../../../components/Button/RateupButtons";
import RateupLoader from "../../../components/Loaders/RateupLoader";
import {
  useGetContactTags,
  useUpdateContactTagsMutation,
} from "../../../backend/whatsapp/settings/waSettings.query";
enum ContactTabs {
  CONTACTS = "contacts",
  GROUPS = "groups",
  SETTINGS = "settings",
}
export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterByTag, setFilterByTag] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<ContactTabs>(ContactTabs.CONTACTS);
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [contactTags, setContactTags] = useState([]);
  const router = useRouter();
  const { tab } = router.query as { tab: string };
  useEffect(() => {
    if (tab && Object.values(ContactTabs).includes(tab as any)) {
      setActiveTab(tab as ContactTabs);
    }
  }, [tab]);

  const { isLoading: isLoadingContacts, data: contactData } =
    useCampaignContacts() as {
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
      ? contactGroupData?.data
      : contactGroupData?.data?.filter(
          (group) => group?.teamId === selectedTeamID,
        );
  const filteredGroups = (
    searchTerm
      ? contactGroups.filter((group) => {
          return group?.name.toLowerCase().includes(searchTerm.toLowerCase());
        })
      : contactGroups
  )?.sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)));
  if (isLoadingContacts || isLoadingContactgroup || isPending)
    return <RateupLoader h={"100dvh"} />;
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
          <OpenCreateMenu tags={cTags?.contactTags ?? []} />
        </Group>
        {activeTab === ContactTabs.GROUPS && (
          <TeamSelector
            value={selectedTeamID}
            onChange={setSelectedTeamID}
            enableAll={true}
          />
        )}
      </Flex>
      <Tabs value={activeTab} color="var(--tertiary-color)" p="xl">
        <Flex justify="space-between" align={"center"} wrap={"wrap"} gap={10}>
          <SegmentedControl
            data={Object.values(ContactTabs)}
            onChange={(value) => {
              router.push(`contacts/?tab=${value}`);
              setActiveTab(value as ContactTabs);
            }}
            color={"var(--mantine-color-rateup-blue-filled)"}
            radius={"md"}
            defaultValue={activeTab}
            value={activeTab}
          />
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

          {activeTab === ContactTabs.CONTACTS && (
            <FilterSelect
              setFilterByTag={setFilterByTag}
              filterByTag={filterByTag}
              contactArray={contactGroups?.map((data) => data?.name)}
              sourceArray={sourceArray}
            />
          )}
          <ContactActionMenu
            contacts={contactData}
            groups={contactGroupData?.data}
          />
        </Flex>
        <Tabs.Panel value={ContactTabs.CONTACTS}>
          {isLoadingContacts ? (
            <Center pt="xl">
              <Loader type="bars" />
            </Center>
          ) : filteredContacts?.length > 0 ? (
            <SimpleGrid
              mt={"xl"}
              cols={{ base: 1, sm: 2, lg: 3 }}
              spacing={{ base: 10, sm: "xl", lg: "xl" }}
              verticalSpacing={{ base: "md", sm: "xl" }}
            >
              {filteredContacts?.map((contact) => (
                <ContactCard
                  contact={contact}
                  key={contact?.id}
                  tags={cTags?.contactTags}
                />
              ))}
            </SimpleGrid>
          ) : (
            <Container mt={"7%"}>
              <NothingFound text="No Contacts Found" />
            </Container>
          )}
        </Tabs.Panel>
        <Tabs.Panel value={ContactTabs.GROUPS}>
          {isLoadingContactgroup ? (
            <Center pt="xl">
              <Loader type="bars" />
            </Center>
          ) : filteredGroups?.length > 0 ? (
            <SimpleGrid
              mt={"xl"}
              cols={{ base: 1, sm: 2, lg: 3 }}
              spacing={{ base: 10, sm: "xl", lg: "xl" }}
              verticalSpacing={{ base: "md", sm: "xl" }}
            >
              {filteredGroups?.map((group) => (
                <ContactGroupCard group={group} key={group?.id} />
              ))}
            </SimpleGrid>
          ) : (
            <Container mt={"7%"}>
              <NothingFound text="No Contact Groups Found" />
            </Container>
          )}
        </Tabs.Panel>
        <Tabs.Panel value={ContactTabs.SETTINGS}>
          <PaperLayout mt={"xl"} p="xl">
            <Stack align="start">
              <ContainedTagInput
                placeholder="Type field name and press enter"
                label="Field names"
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
                }}
              />
            </Stack>
          </PaperLayout>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

const FilterSelect = ({
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
      maw={360}
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
          <Menu.Item
            color="red"
            onClick={() => {
              setSelectedAction(ContactAcions.DELETE_CONTACTS);
              openActionModal();
            }}
            leftSection={
              <IconTrashXFilled style={{ width: rem(14), height: rem(14) }} />
            }
          >
            Delete Contacts
          </Menu.Item>
          <Menu.Item
            color="red"
            onClick={() => {
              setSelectedAction(ContactAcions.DELETE_GROUPS);
              openActionModal();
            }}
            leftSection={
              <IconTrashXFilled style={{ width: rem(14), height: rem(14) }} />
            }
          >
            Delete Groups
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
