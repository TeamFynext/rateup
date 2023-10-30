import {
  Flex,
  Group,
  Tabs,
  Title,
  SimpleGrid,
  TextInput,
  Grid,
} from "@mantine/core";
import { RateupButtonBlue } from "../../../../components/Button/RateupButtons";
import { IconPlus, IconUser, IconUsersGroup } from "@tabler/icons-react";
import { useState } from "react";
import ContactCard from "../../../../components/Card/ContactCard";
import { IconSearch } from "@tabler/icons";
import styles from "./contacts.module.css";
import { TeamSelector } from "../../../../components/input/TeamSelector";
import { GroupCard } from "../../../../components/Card/GroupCard";
import FormModalLayout from "../../../../components/Modal/FormModalLayout";
import { useDisclosure } from "@mantine/hooks";
import OpenCreateModal from "./OpenCreateModal";

const contactdata = [
  {
    id: "12",
    name: "Andrews Ravindran",
    phone: "+917356811899",
    email: "andrews32222@gmail.com",
    teamId: "",
    createdAt: "26-05-23",
  },
  {
    id: "13",
    name: "Andrews Ravindran",
    phone: "+917356811899",
    email: "andrews32222@gmail.com",
    teamId: "",
    createdAt: "26-05-23",
  },
  {
    id: "14",
    name: "Andrews Ravindran",
    phone: "+917356811899",
    email: "andrews32222@gmail.com",
    teamId: "",
    createdAt: "26-05-23",
  },
  {
    id: "15",
    name: "Andrews Ravindran",
    phone: "+917356811899",
    email: "andrews32222@gmail.com",
    teamId: "",
    createdAt: "26-05-23",
  },
  {
    id: "16",
    name: "Andrews Ravindran",
    phone: "+917356811899",
    email: "andrews32222@gmail.com",
    teamId: "",
    createdAt: "26-05-23",
  },
  {
    id: "17",
    name: "Andrews Ravindran",
    phone: "+917356811899",
    email: "andrews32222@gmail.com",
    teamId: "",
    createdAt: "26-05-23",
  },
  {
    id: "18",
    name: "Andrews Ravindran",
    phone: "+917356811899",
    email: "andrews32222@gmail.com",
    teamId: "",
    createdAt: "26-05-23",
  },
  {
    id: "19",
    name: "Andrews Ravindran",
    phone: "+917356811899",
    email: "andrews32222@gmail.com",
    teamId: "",
    createdAt: "26-05-23",
  },
];

const groups = [
  {
    id: "11",
    name: "WApp Group1",
    profile: "",
    members: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    createdAt: "26-05-23",
  },
  {
    id: "12",
    name: "WApp Group1",
    profile: "",
    members: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    createdAt: "26-05-23",
  },
  {
    id: "13",
    name: "WApp Group1",
    profile: "",
    members: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    createdAt: "26-05-23",
  },
  {
    id: "14",
    name: "WApp Group1",
    profile: "",
    members: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    createdAt: "26-05-23",
  },
  {
    id: "15",
    name: "WApp Group1",
    profile: "",
    members: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    createdAt: "26-05-23",
  },
  {
    id: "16",
    name: "WApp Group1",
    profile: "",
    members: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    createdAt: "26-05-23",
  },
  {
    id: "17",
    name: "WApp Group1",
    profile: "",
    members: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    createdAt: "26-05-23",
  },
  {
    id: "18",
    name: "WApp Group1",
    profile: "",
    members: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    createdAt: "26-05-23",
  },
  {
    id: "19",
    name: "WApp Group1",
    profile: "",
    members: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    createdAt: "26-05-23",
  },
];

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>("customers");
  const [selectedTeamID, setSelectedTeamID] = useState("");
  const [opened, { open, close }] = useDisclosure(false);

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
            <OpenCreateModal></OpenCreateModal>
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
              <Tabs.Tab value="groups">
                <Title order={4}>Groups</Title>
              </Tabs.Tab>
            </Tabs.List>
          </Grid.Col>
          <Grid.Col span={7} offset={1}>
            <TextInput
              leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
              radius="xl"
              size="md"
              placeholder={"Search Customer"}
              rightSectionWidth={60}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              w={500}
            />
          </Grid.Col>
        </Grid>
        <Tabs.Panel value="customers">
          <SimpleGrid
            mt={"xl"}
            cols={{ base: 1, sm: 2, lg: 3 }}
            spacing={{ base: 10, sm: "xl", lg: "xl" }}
            verticalSpacing={{ base: "md", sm: "xl" }}
          >
            {contactdata.map((contact) => (
              <ContactCard contact={contact} key={contact.id}></ContactCard>
            ))}
          </SimpleGrid>
        </Tabs.Panel>
        <Tabs.Panel value="groups">
          <SimpleGrid
            mt={"xl"}
            cols={{ base: 1, sm: 2, lg: 3 }}
            spacing={{ base: 10, sm: "xl", lg: "xl" }}
            verticalSpacing={{ base: "md", sm: "xl" }}
          >
            {groups.map((group) => (
              <GroupCard group={group} key={group.id}></GroupCard>
            ))}
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
