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
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import ContactCard from "../../../../components/Card/ContactCard";
import { IconSearch } from "@tabler/icons";
import styles from "./contacts.module.css";
import { TeamSelector } from "../../../../components/input/TeamSelector";
import { ContactGroupCard } from "../../../../components/Card/ContactGroupCard";
import FormModalLayout from "../../../../components/Modal/FormModalLayout";
import { useDisclosure } from "@mantine/hooks";
import OpenCreateModal from "./OpenCreateModal";
import { useCampaignContacts } from "../../../../backend/campaign/contacts/contacts.query";
import { useContactGroup } from "../../../../backend/campaign/contactGroup/contactGroup.query";

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>("customers");
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);

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
  } = useContactGroup() as {
    isLoading: boolean;
    data: ContactGroupResponse;
    error: any;
    refetch: any;
  };

  useEffect(() => {
    if (!searchTerm.length && contactData?.data && contactGroupData?.data) {
      setFilteredContacts(contactData?.data);
      setFilteredGroups(contactGroupData?.data);
    } else {
      if (activeTab == "customers" && contactData?.data) {
        setFilteredContacts(
          contactData?.data?.filter((contact) => {
            return (
              contact?.name
                .toLowerCase()
                .startsWith(searchTerm.toLowerCase()) ||
              contact?.phone?.startsWith(searchTerm)
            );
          }),
        );
      } else {
        if (contactGroupData?.data) {
          setFilteredGroups(
            contactGroupData?.data?.filter((group) => {
              return group?.name
                .toLowerCase()
                .startsWith(searchTerm.toLowerCase());
            }),
          );
        }
      }
    }
  }, [searchTerm, contactData?.data, contactGroupData?.data]);

  useEffect(() => {
    if (contactData?.data) {
      setFilteredContacts(
        contactData?.data?.filter((contact) => {
          return contact?.teamId === selectedTeamID;
        }),
      );
    }
    if (contactGroupData?.data) {
      setFilteredGroups(
        contactGroupData?.data?.filter((group) => {
          return group?.teamId === selectedTeamID;
        }),
      );
    }
  }, [selectedTeamID, contactData?.data, contactGroupData?.data]);

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
          <Title order={1}>Contacts</Title>
          <RateupButtonBlue
            title="Create"
            rightIcon={<IconPlus />}
            radius="xl"
            size="lg"
            onClick={open}
          ></RateupButtonBlue>
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
        ></TeamSelector>
      </Flex>
      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        color="var(--tertiary-color)"
        p="xl"
      >
        <Grid>
          <Grid.Col span={3}>
            <Tabs.List>
              <Tabs.Tab value="customers" className={styles.tabLabel}>
                <Title order={4}>Customers</Title>
              </Tabs.Tab>
              <Tabs.Tab value="groups" className={styles.tabLabel}>
                <Title order={4}>Groups</Title>
              </Tabs.Tab>
            </Tabs.List>
          </Grid.Col>
          <Grid.Col span={7} offset={1}>
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
              w={{ base: 100, sm: 250, lg: 500 }}
            />
          </Grid.Col>
        </Grid>
        <Tabs.Panel value="customers">
          {isLoadingContacts ? (
            <Center pt="xl">
              <Loader></Loader>
            </Center>
          ) : (
            <SimpleGrid
              mt={"xl"}
              cols={{ base: 1, sm: 2, lg: 3 }}
              spacing={{ base: 10, sm: "xl", lg: "xl" }}
              verticalSpacing={{ base: "md", sm: "xl" }}
            >
              {filteredContacts?.length > 0 ? (
                filteredContacts?.map((contact) => (
                  <ContactCard
                    contact={contact}
                    key={contact?.id}
                  ></ContactCard>
                ))
              ) : (
                <Container p="xl">
                  <Title order={5}>No Contacts found</Title>
                </Container>
              )}
            </SimpleGrid>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="groups">
          {isLoadingContactgroup ? (
            <Center pt="xl">
              <Loader></Loader>
            </Center>
          ) : (
            <SimpleGrid
              mt={"xl"}
              cols={{ base: 1, sm: 2, lg: 3 }}
              spacing={{ base: 10, sm: "xl", lg: "xl" }}
              verticalSpacing={{ base: "md", sm: "xl" }}
            >
              {filteredGroups?.length > 0 ? (
                filteredGroups?.map((group) => (
                  <ContactGroupCard
                    group={group}
                    key={group?.id}
                  ></ContactGroupCard>
                ))
              ) : (
                <Container p="xl">
                  <Title order={5}>No Groups found</Title>
                </Container>
              )}
            </SimpleGrid>
          )}
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
