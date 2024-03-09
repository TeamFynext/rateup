import {
  Flex,
  Group,
  Tabs,
  Title,
  SimpleGrid,
  TextInput,
  Loader,
  Center,
  Container,
  Stack,
  Menu,
  Text,
  Button,
  rem,
} from "@mantine/core";

import {
  IconChevronDown,
  IconPlus,
  IconTicket,
  IconTrashXFilled,
  IconUserPlus,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { IconSearch } from "@tabler/icons";
import styles from "./contacts.module.css";

import { useDisclosure } from "@mantine/hooks";
import OpenCreateModal from "../../../components/Contacts/OpenCreateModal";
import { useCampaignContacts } from "../../../backend/campaign/contacts/contacts.query";
import { useContactGroup } from "../../../backend/campaign/contactGroup/contactGroup.query";
import {
  RateupButtonBlue,
  RateupButtonOutline,
} from "../../../components/Button/RateupButtons";
import ContactCard from "../../../components/Card/ContactCard";
import { ContactGroupCard } from "../../../components/Card/ContactGroupCard";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import { TeamSelector } from "../../../components/input/TeamSelector";
import Heading from "../../../components/styled/Heading/Heading";
import NothingFound from "../../../components/NothingFound/NothingFound";
import { useRouter } from "next/router";
import dayjs from "dayjs";
import ContactAction from "../../../components/Contacts/ContactAction";

enum ContactTabs {
  CONTACTS = "Contacts",
  GROUPS = "Groups",
}
export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<ContactTabs>(ContactTabs.CONTACTS);
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();
  const { tab } = router.query as { tab: string };

  useEffect(() => {
    if (tab) {
      setActiveTab(tab as ContactTabs);
    }
  }, [tab]);

  const { isLoading: isLoadingContacts, data: contactData } =
    useCampaignContacts() as {
      isLoading: boolean;
      data: ContactsResponse;
      error: any;
      refetch: any;
    };

  const { isLoading: isLoadingContactgroup, data: contactGroupData } =
    useContactGroup();

  const contacts =
    selectedTeamID == "all" || !selectedTeamID
      ? contactData?.data
      : contactData?.data?.filter(
          (contact) => contact?.teamId === selectedTeamID,
        );
  const filteredContacts = (
    searchTerm
      ? contacts.filter((contact) => {
          return (
            contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact?.phone?.includes(searchTerm) ||
            contact?.email?.includes(searchTerm)
          );
        })
      : contacts
  )?.sort((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)));

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
          <RateupButtonBlue
            title="Create"
            rightIcon={<IconPlus />}
            onClick={open}
          />
          <FormModalLayout
            centered
            opened={opened}
            onClose={close}
            title="Create"
          >
            <OpenCreateModal close={close}></OpenCreateModal>
          </FormModalLayout>
        </Group>
        <TeamSelector
          value={selectedTeamID}
          onChange={setSelectedTeamID}
          enableAll={true}
        ></TeamSelector>
      </Flex>
      <Tabs
        value={activeTab}
        onChange={(value) => setActiveTab(value as ContactTabs)}
        color="var(--tertiary-color)"
        p="xl"
      >
        <Group justify="space-between">
          <Tabs.List>
            <Tabs.Tab value={ContactTabs.CONTACTS} className={styles.tabLabel}>
              <Title order={4}>Contacts</Title>
            </Tabs.Tab>
            <Tabs.Tab value={ContactTabs.GROUPS} className={styles.tabLabel}>
              <Title order={4}>Groups</Title>
            </Tabs.Tab>
          </Tabs.List>
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
            w={{ base: 200, sm: 250, lg: 500 }}
            m={"auto"}
          />
          {/* <RateupButtonOutline title="Select" onClick={openSelect}/> */}
          <ContactActionMenu
            contacts={contactData?.data}
            groups={contactGroupData?.data}
          />
        </Group>
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
                <ContactCard contact={contact} key={contact?.id} />
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
                <ContactGroupCard
                  group={group}
                  key={group?.id}
                ></ContactGroupCard>
              ))}
            </SimpleGrid>
          ) : (
            <Container mt={"7%"}>
              <NothingFound text="No Contact Groups Found" />
            </Container>
          )}
        </Tabs.Panel>
      </Tabs>
    </>
  );
}

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
            <Text size="xs" c="dark.5">
              More
            </Text>
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
