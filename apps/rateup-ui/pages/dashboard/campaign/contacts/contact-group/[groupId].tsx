import {
  Stack,
  Paper,
  Box,
  Title,
  Grid,
  SimpleGrid,
  Group,
  Avatar,
  Button,
  Text,
  TextInput,
  Center,
} from "@mantine/core";
import ContactCard from "../../../../../components/Card/ContactCard";
import { IconEdit, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
import {
  RateupButtonBlue,
  RateupButtonSecondary,
} from "../../../../../components/Button/RateupButtons";
import { useDisclosure } from "@mantine/hooks";
import FormModalLayout from "../../../../../components/Modal/FormModalLayout";
import AddCustomerModal from "./AddCustomerModal";
import { useState } from "react";

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
export default function () {
  const [opened, { open, close }] = useDisclosure(false);
  const [searchTerm, setSearchTerm] = useState("");
  const editGroup = () => {};

  return (
    <Box p="lg" pr={150}>
      <Stack>
        <Paper shadow="xl" p="xl" radius={"md"}>
          <Group justify="space-between">
            <Group>
              <Avatar src="" size={"xl"}></Avatar>
              <Stack>
                <Title>GroupName</Title>
                <Group>
                  <Button
                    leftSection={<IconEdit></IconEdit>}
                    onClick={editGroup}
                    variant="default"
                  >
                    Edit Profile
                  </Button>
                  <Button
                    variant="light"
                    leftSection={<IconTrash></IconTrash>}
                    color="red"
                  >
                    Delete this Group
                  </Button>
                </Group>
              </Stack>
            </Group>
            <Group>
              <RateupButtonSecondary title="Team id"></RateupButtonSecondary>
              <Stack gap={0}>
                <Title c="var(--tertiary-color)" order={3}>
                  16
                </Title>
                <Text>customers</Text>
              </Stack>
            </Group>
          </Group>
        </Paper>
        <Box py="xl">
          <Center>
            <Group>
              <TextInput
                leftSection={<IconSearch size="1.1rem" stroke={1.5} />}
                radius="xl"
                size="md"
                placeholder={"Search Customer"}
                rightSectionWidth={60}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                w={500}
              />
              <RateupButtonSecondary
                leftIcon={<IconEdit></IconEdit>}
                title="Edit"
                radius="xl"
                size={"md"}
              ></RateupButtonSecondary>
              <RateupButtonBlue
                title="New customer"
                rightIcon={<IconPlus />}
                radius="xl"
                size="lg"
                onClick={open}
              ></RateupButtonBlue>
            </Group>
          </Center>
        </Box>
        <Box>
          <Title order={2}>Customer List</Title>
          <SimpleGrid
            mt={"md"}
            cols={{ base: 1, sm: 2, lg: 3 }}
            spacing={{ base: 10, sm: "xl", lg: "xl" }}
            verticalSpacing={{ base: "md", sm: "xl" }}
          >
            {contactdata.map((contact) => (
              <ContactCard contact={contact} key={contact.id}></ContactCard>
            ))}
          </SimpleGrid>
        </Box>
      </Stack>
      <FormModalLayout
        onClose={close}
        opened={opened}
        title="Add customer to groupname"
        size="lg"
      >
        <AddCustomerModal></AddCustomerModal>
      </FormModalLayout>
    </Box>
  );
}
