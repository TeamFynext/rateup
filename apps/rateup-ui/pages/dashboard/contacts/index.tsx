import {
  Flex,
  Group,
  Tabs,
  Title,
  SimpleGrid,
  TextInput,
  Grid,
  Loader,
  Center,
  Container,
} from "@mantine/core";

import { IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { IconSearch } from "@tabler/icons";
import styles from "./contacts.module.css";

import { useDisclosure } from "@mantine/hooks";
import OpenCreateModal from "./OpenCreateModal";
import { useCampaignContacts } from "../../../backend/campaign/contacts/contacts.query";
import { useContactGroup } from "../../../backend/campaign/contactGroup/contactGroup.query";
import { RateupButtonBlue } from "../../../components/Button/RateupButtons";
import ContactCard from "../../../components/Card/ContactCard";
import { ContactGroupCard } from "../../../components/Card/ContactGroupCard";
import FormModalLayout from "../../../components/Modal/FormModalLayout";
import { TeamSelector } from "../../../components/input/TeamSelector";
import Heading from "../../../components/styled/Heading/Heading";
import NothingFound from "../../../components/NothingFound/NothingFound";
import { useRouter } from "next/router";
import dayjs from "dayjs";

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>("customers");
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();
  const { tab } = router.query as { tab: string };

  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  const {
    isLoading: isLoadingContacts,
    data: contactData,
    error: errorContacts,
    refetch: refetchContacts,
  } = useCampaignContacts() as {
    isLoading: boolean;
    data: ContactsResponse;
    error: any;
    refetch: any;
  };

  const {
    isLoading: isLoadingContactgroup,
    data: contactGroupData,
    error: errorgroup,
    refetch: refetchgroup,
  } = useContactGroup();

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
  )?.sort((a, b) => dayjs(a.createdAt).diff(dayjs(b.createdAt)));

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
  )?.sort((a, b) => dayjs(a.createdAt).diff(dayjs(b.createdAt)));

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
            title="Create Contact"
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
        onChange={setActiveTab}
        color="var(--tertiary-color)"
        p="xl"
      >
        <Grid>
          <Grid.Col span={"content"}>
            <Tabs.List>
              <Tabs.Tab value="customers" className={styles.tabLabel}>
                <Title order={4}>Customers</Title>
              </Tabs.Tab>
              <Tabs.Tab value="groups" className={styles.tabLabel}>
                <Title order={4}>Groups</Title>
              </Tabs.Tab>
            </Tabs.List>
          </Grid.Col>
          <Grid.Col span={"auto"}>
            <TextInput
              leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
              radius="xl"
              size="md"
              placeholder={
                activeTab == "customers"
                  ? "Search customer"
                  : "Search customer groups"
              }
              rightSectionWidth={60}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              w={{ base: 200, sm: 250, lg: 500 }}
              m={"auto"}
            />
          </Grid.Col>
        </Grid>
        <Tabs.Panel value="customers">
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
                <ContactCard contact={contact} key={contact?.id}></ContactCard>
              ))}
            </SimpleGrid>
          ) : (
            <Container mt={"7%"}>
              <NothingFound text="No Contacts Found" />
            </Container>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="groups">
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
