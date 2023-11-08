import { Center, Container, Group, Paper, Stack, Text } from "@mantine/core";
import CreateContactModal from "./CreateContactModal";
import CreateGroupModal from "./contact-group/CreateGroupModal";
import { IconUser, IconUsersGroup } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import FormModalLayout from "../../../../components/Modal/FormModalLayout";

const OpenCreateModal = ({ close }) => {
  const [contactOpened, { open: contactOpen, close: contactClose }] =
    useDisclosure(false);
  const [groupOpened, { open: groupOpen, close: groupClose }] =
    useDisclosure(false);
  return (
    <Container>
      <Group gap="xl" justify="space-evenly">
        <Paper shadow="xl" p="xl" onClick={contactOpen}>
          <Stack gap={0}>
            <Center>
              <IconUser
                size={40}
                color="var(--tertiary-color)"
                fill="var(--tertiary-color)"
              ></IconUser>
            </Center>
            <Text>Customer</Text>
          </Stack>
        </Paper>
        <Paper shadow="xl" p="xl" onClick={groupOpen}>
          <Stack gap={0} px="sm">
            <Center>
              <IconUsersGroup
                size={40}
                color="var(--tertiary-color)"
                fill="var(--tertiary-color)"
              ></IconUsersGroup>
            </Center>
            <Text>Group</Text>
          </Stack>
        </Paper>
      </Group>
      <FormModalLayout
        centered
        opened={contactOpened}
        onClose={contactClose}
        title="Create customer"
        size={"lg"}
      >
        <CreateContactModal
          contactClose={contactClose}
          close={close}
        ></CreateContactModal>
      </FormModalLayout>
      <FormModalLayout
        centered
        opened={groupOpened}
        onClose={groupClose}
        title="Create contact group"
        size="lg"
      >
        <CreateGroupModal
          groupClose={groupClose}
          close={close}
        ></CreateGroupModal>
      </FormModalLayout>
    </Container>
  );
};
export default OpenCreateModal;
